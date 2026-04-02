import * as XLSX from "xlsx";
import { logger } from "./logger";

export type CalendrierStatut =
  | "FORMATION"
  | "VIDE"
  | "FERIE"
  | "STAGE"
  | "FIN"
  | "VACANCES";

export interface JourDetail {
  date: string;
  statut: CalendrierStatut;
}

export interface EtatRow {
  groupe: string;
  statut: string;
  module: string;
  mhGlobale: number;
  mhRealise: number | null;
  tauxReel: number | null;
  nbSeancesVal: number;
  nbSeancesEnCours: number;
}

export interface CalendrierResult {
  typeCalendrier: string;
  anneeFormation: string;
  totalJours: number;
  joursRealises: number;
  tauxTheorique: number;
  dateReference: Date;
  jourDetails: JourDetail[];
}

export interface PvStagiaireRow {
  cef: string;
  nomPrenom: string;
  cc: number;
  efm: number;
  efmStatut: "PRESENT" | "ABSENT";
  moyenneOff: number;
}

export interface PvEfmResult {
  etablissement: string;
  filiere: string;
  anneeFormation: string;
  groupe: string;
  niveau: string;
  moduleCode: string;
  moduleIntitule: string;
  inscrits: number;
  presents: number;
  absents: number;
  stagiaires: PvStagiaireRow[];
}

function cellStatut(val: unknown): CalendrierStatut {
  if (val === null || val === undefined || val === "") return "VIDE";
  const s = String(val).trim();
  if (s === "1" || s === "1.0") return "FORMATION";
  if (s.toUpperCase() === "ST") return "STAGE";
  if (s.toUpperCase() === "EFF") return "FIN";
  if (/عطلة/.test(s)) return "VACANCES";
  if (/[\u0600-\u06FF]/.test(s)) return "FERIE";
  return "VIDE";
}

export function parseEtatXlsx(buffer: Buffer): EtatRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets["Sheet1"] ?? wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("Sheet1 not found");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
    raw: true,
  });

  const results: EtatRow[] = [];
  for (const row of rows) {
    const groupe = String(row["Groupe"] ?? "").trim();
    if (!groupe) continue;

    const mhGlobale = Number(row["MH.G"] ?? 0) || 0;
    const mhRealiseRaw = row["Réal.G"];
    const mhRealise =
      mhRealiseRaw === null ||
      mhRealiseRaw === undefined ||
      String(mhRealiseRaw).toLowerCase() === "nan" ||
      isNaN(Number(mhRealiseRaw))
        ? null
        : Number(mhRealiseRaw);

    const tauxReel =
      mhRealise !== null && mhGlobale > 0
        ? Math.min(mhRealise / mhGlobale, 1.07)
        : null;

    results.push({
      groupe,
      statut: String(row["Statut"] ?? "").trim(),
      module: String(row["Module"] ?? "").trim(),
      mhGlobale,
      mhRealise,
      tauxReel,
      nbSeancesVal: Number(row["NB.SValidées"] ?? 0) || 0,
      nbSeancesEnCours: Number(row["NB.SEn cours"] ?? 0) || 0,
    });
  }

  return results;
}

export function parseCalendrierXlsx(buffer: Buffer): CalendrierResult[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets["25-26"] ?? wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("Sheet 25-26 not found");

  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    raw: false,
  }) as unknown[][];

  if (raw.length < 5) throw new Error("Calendar sheet has too few rows");

  const dateRow = raw[4] as unknown[];
  const results: CalendrierResult[] = [];

  const targetRows: { label: string; rowIndex: number }[] = [];
  for (let i = 5; i < raw.length; i++) {
    const firstCell = String(raw[i][0] ?? "").trim();
    if (
      firstCell.includes("1A-CDJ") ||
      firstCell.includes("2A-CDJ") ||
      firstCell.includes("1A CDJ") ||
      firstCell.includes("2A CDJ")
    ) {
      targetRows.push({ label: firstCell, rowIndex: i });
    }
  }

  const now = new Date();
  const anneeFormation =
    now.getFullYear() >= 9
      ? `${now.getFullYear()}/${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}/${now.getFullYear()}`;

  for (const { label, rowIndex } of targetRows) {
    const dataRow = raw[rowIndex] as unknown[];
    const jourDetails: JourDetail[] = [];
    let totalJours = 0;
    let joursRealises = 0;
    const dateRef = now;

    for (let col = 1; col < dataRow.length; col++) {
      const rawDate = dateRow[col];
      let date: Date | null = null;

      if (rawDate instanceof Date) {
        date = rawDate;
      } else if (typeof rawDate === "string" && rawDate.trim()) {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) date = parsed;
      } else if (typeof rawDate === "number") {
        date = XLSX.SSF.parse_date_code
          ? new Date((rawDate - 25569) * 86400 * 1000)
          : null;
      }

      const statut = cellStatut(dataRow[col]);

      if (statut === "FORMATION") {
        totalJours++;
        if (date && date <= dateRef) {
          joursRealises++;
        }
      }

      jourDetails.push({
        date: date ? date.toISOString().split("T")[0] : "",
        statut,
      });
    }

    const tauxTheorique =
      totalJours > 0 ? Math.min(joursRealises / totalJours, 1) : 0;

    results.push({
      typeCalendrier: label,
      anneeFormation,
      totalJours,
      joursRealises,
      tauxTheorique,
      dateReference: dateRef,
      jourDetails,
    });
  }

  return results;
}

export function parsePvEfmPdf(text: string): PvEfmResult {
  const etablissementMatch = text.match(/Etablissement\s*:\s*(.+)/i);
  const filiereMatch = text.match(/Fili[eè]re\s*:\s*(.+)/i);
  const anneeMatch = text.match(/Ann[eé]e de formation\s*:\s*(\d{4}\/\d{4})/i);
  const groupeMatch = text.match(/Groupe de formation\s*:\s*([A-Z]{2}\d{3})/i);
  const niveauMatch = text.match(/Niveau\s*:\s*(.+)/i);
  const moduleMatch = text.match(/Intitul[eé] du Module:\s*(.+?)\s*\(M(\d+)\)/i);
  const inscritMatch = text.match(
    /Inscrits:(\d+)\s*\|Pr[eé]sents:(\d+)\s*\|Absents:(\d+)/i
  );

  const groupe = groupeMatch ? groupeMatch[1].trim() : "";
  const moduleCode = moduleMatch ? `M${moduleMatch[2]}` : "";
  const moduleIntitule = moduleMatch ? moduleMatch[1].trim() : "";

  const lines = text.split("\n");
  const stagiaires: PvStagiaireRow[] = [];

  const rowRegex = /^(\d{13,14})\s+(.+?)\s+([\d.]+)\s+([\d.]+|Absent)\s+([\d.]+)/;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(rowRegex);
    if (!match) continue;

    const cef = match[1];
    const nomPrenom = match[2].trim();
    const cc = parseFloat(match[3]);
    const efmRaw = match[4];
    const efmStatut: "PRESENT" | "ABSENT" =
      efmRaw.toLowerCase() === "absent" ? "ABSENT" : "PRESENT";
    const efm = efmStatut === "ABSENT" ? 0 : parseFloat(efmRaw);
    const moyenneOff = (cc + efm) / 3;

    if (!/^\d{13,14}$/.test(cef)) continue;

    stagiaires.push({
      cef,
      nomPrenom,
      cc,
      efm,
      efmStatut,
      moyenneOff,
    });
  }

  logger.info(
    { groupe, moduleCode, stagiaires: stagiaires.length },
    "PV EFM parsed"
  );

  return {
    etablissement: etablissementMatch
      ? etablissementMatch[1].trim()
      : "Inconnu",
    filiere: filiereMatch ? filiereMatch[1].trim() : "",
    anneeFormation: anneeMatch ? anneeMatch[1] : "2025/2026",
    groupe,
    niveau: niveauMatch ? niveauMatch[1].trim() : "Spécialisation",
    moduleCode,
    moduleIntitule,
    inscrits: inscritMatch ? parseInt(inscritMatch[1]) : 0,
    presents: inscritMatch ? parseInt(inscritMatch[2]) : 0,
    absents: inscritMatch ? parseInt(inscritMatch[3]) : 0,
    stagiaires,
  };
}
