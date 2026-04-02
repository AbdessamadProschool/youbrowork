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
  if (s === "1" || s === "1.0" || s === "1.00") return "FORMATION";
  if (s.toUpperCase() === "ST") return "STAGE";
  if (s.toUpperCase() === "EFF" || s.toUpperCase() === "FIN") return "FIN";
  if (/عطلة/i.test(s)) return "VACANCES";
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

  // Try multiple possible sheet names
  const sheetName =
    wb.SheetNames.find((n) => n.includes("25-26") || n.includes("26") || n.includes("Cal")) ??
    wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet not found. Available: ${wb.SheetNames.join(", ")}`);

  logger.info({ sheetName, allSheets: wb.SheetNames }, "Calendrier sheet selected");

  // Read with raw=true to get actual values, not formatted strings
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];

  logger.info({ totalRows: rawRows.length }, "Calendrier raw rows loaded");

  // Find the date row: look for a row that has many date-like values
  let dateRowIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i] as unknown[];
    let dateCount = 0;
    for (let c = 1; c < Math.min(row.length, 30); c++) {
      const v = row[c];
      if (v instanceof Date) dateCount++;
      else if (typeof v === "number" && v > 40000 && v < 50000) dateCount++; // Excel date serial
    }
    if (dateCount >= 5) {
      dateRowIndex = i;
      logger.info({ dateRowIndex, sampleValue: rawRows[i][1] }, "Found date row");
      break;
    }
  }

  if (dateRowIndex === -1) {
    // Fallback: assume row 4 (index)
    dateRowIndex = 4;
    logger.warn({ fallbackDateRow: dateRowIndex }, "Could not detect date row, using fallback row 4");
  }

  const dateRow = rawRows[dateRowIndex] as unknown[];

  // Log all row labels in the first column to understand structure
  const rowLabels: { idx: number; label: string }[] = [];
  for (let i = dateRowIndex + 1; i < rawRows.length; i++) {
    const firstCell = String(rawRows[i][0] ?? "").trim();
    if (firstCell) rowLabels.push({ idx: i, label: firstCell });
  }
  logger.info({ rowLabels }, "All labeled rows in calendar");

  const now = new Date();
  const anneeFormation =
    now.getMonth() >= 8
      ? `${now.getFullYear()}/${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}/${now.getFullYear()}`;

  // CDJ target rows: match "1A-CDJ" (any suffix) and "2A-CDJ" (any suffix)
  const targetPatterns = [
    { pattern: /1A.?CDJ/i, label: "1A-CDJ" },
    { pattern: /2A.?CDJ/i, label: "2A-CDJ" },
  ];

  const targetRows: { label: string; rowIndex: number }[] = [];
  for (const { idx, label } of rowLabels) {
    for (const { pattern, label: canonical } of targetPatterns) {
      if (pattern.test(label)) {
        targetRows.push({ label: canonical, rowIndex: idx });
        logger.info({ rowIndex: idx, originalLabel: label, canonical }, "CDJ row matched");
      }
    }
  }

  if (targetRows.length === 0) {
    logger.warn({ rowLabels }, "No CDJ rows found matching 1A-CDJ or 2A-CDJ patterns");
  }

  const results: CalendrierResult[] = [];

  for (const { label, rowIndex } of targetRows) {
    const dataRow = rawRows[rowIndex] as unknown[];
    const jourDetails: JourDetail[] = [];
    let totalJours = 0;
    let joursRealises = 0;

    // Parse dates from dateRow
    const parsedDates: (Date | null)[] = [];
    for (let col = 1; col < dateRow.length; col++) {
      const rawDate = dateRow[col];
      let date: Date | null = null;

      if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
        date = rawDate;
      } else if (typeof rawDate === "number" && rawDate > 40000 && rawDate < 50000) {
        // Excel serial date: days since Jan 1 1900
        const d = new Date(Date.UTC(1899, 11, 30) + rawDate * 86400 * 1000);
        if (!isNaN(d.getTime())) date = d;
      } else if (typeof rawDate === "string" && rawDate.trim()) {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) date = parsed;
      }

      parsedDates.push(date);
    }

    for (let col = 1; col < dataRow.length; col++) {
      const date = parsedDates[col - 1];
      const rawVal = dataRow[col];
      const statut = cellStatut(rawVal);

      if (statut === "FORMATION") {
        totalJours++;
        // Count as realized if date is on or before today
        if (date && date.getTime() <= now.getTime()) {
          joursRealises++;
        }
      }

      jourDetails.push({
        date: date ? date.toISOString().split("T")[0] : "",
        statut,
      });
    }

    const tauxTheorique = totalJours > 0 ? joursRealises / totalJours : 0;

    logger.info(
      { label, totalJours, joursRealises, tauxTheorique: (tauxTheorique * 100).toFixed(1) + "%" },
      "Calendrier row computed"
    );

    results.push({
      typeCalendrier: label,
      anneeFormation,
      totalJours,
      joursRealises,
      tauxTheorique,
      dateReference: now,
      jourDetails,
    });
  }

  return results;
}

export function parsePvEfmPdf(text: string): PvEfmResult {
  // The OFPPT PV EFM PDF format (after pdf-parse extraction):
  //   Header lines with Etablissement, Filière, Groupe, Module...
  //   Student rows (NO separator between fields):
  //     <CEF-13digits><NOM PRENOM><CC/20><EFM/40 or "Absent"><Moy/20>
  //   Example: "2009052100036ABBID HAMZA18.0029.0015.67"
  //   Absent:  "2009042900033BASSADDOUG DRISS14.00Absent4.67"
  //   Note: EFM is out of 40. moyenneOff = (CC + EFM) / 3

  const etablissementMatch = text.match(/[Éé]tablissement\s*[:\-]?\s*(.+)/i);
  const filiereMatch = text.match(/Fili[eè]re\s*[:\-]?\s*(.+?)(?:\t|$)/im);
  const anneeMatch = text.match(/Ann[eé]e\s+de\s+formation\s*[:\-]?\s*(\d{4}[\/\-]\d{4})/i);
  const groupeMatch =
    text.match(/Groupe\s+de\s+formation\s*[:\-]?\s*([A-Z]{2}\d{2,3})/i) ??
    text.match(/\bGroupe\b[:\-\s]*([A-Z]{2}\d{2,3})/i);
  const niveauMatch = text.match(/Niveau\s*[:\-]?\s*(.+?)(?:\t|$)/im);

  // Extract module: format "(M101)" appears in "Intitulé du Module: Métier et formation (M101)"
  const moduleFullMatch = text.match(
    /Intitul[eé](?:\s+du)?\s+[Mm]odule\s*[:\-]?\s*(.+?)\s*\(M(\d+)\)/i
  );
  const moduleAltMatch = text.match(/\(M(\d+)\)/i);

  let moduleCode = "";
  let moduleIntitule = "";

  if (moduleFullMatch) {
    moduleIntitule = moduleFullMatch[1].trim();
    moduleCode = `M${moduleFullMatch[2]}`;
  } else if (moduleAltMatch) {
    moduleCode = `M${moduleAltMatch[1]}`;
  }

  // Fallback: search for Mxxx pattern anywhere
  if (!moduleCode) {
    const mMatch = text.match(/\bM(\d{2,3})\b/);
    if (mMatch) moduleCode = `M${mMatch[1]}`;
  }

  const groupe = groupeMatch ? groupeMatch[1].trim() : "";

  const inscritMatch = text.match(/Inscrits?\s*:?\s*(\d+)/i);
  const presentMatch = text.match(/Pr[eé]sents?\s*:?\s*(\d+)/i);
  const absentMatch = text.match(/Absents?\s*:?\s*(\d+)/i);

  // ── Student row parser ───────────────────────────────────────────────────
  // Format: <13-14 digit CEF><UPPERCASE NAME><CC.xx><EFM.xx or Absent><Moy.xx>
  // The name is all uppercase letters, spaces, hyphens, apostrophes.
  // There is NO delimiter between CEF, name, and the numbers.
  // CC is /20, EFM is /40, moyenneOff = (CC + EFM) / 3.
  const rowRegex =
    /(\d{13,14})([A-ZÉÈÀÙÂÊÎÔÛÄËÏÖÜ][A-ZÉÈÀÙÂÊÎÔÛÄËÏÖÜ\s\-']+?)(\d+\.\d+)(Absent|\d+\.\d+)(\d+\.\d+)/g;

  const stagiaires: PvStagiaireRow[] = [];
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(text)) !== null) {
    const cef = match[1];
    const nomPrenom = match[2].trim();
    const cc = parseFloat(match[3]);
    const efmRaw = match[4];
    const isAbsent = efmRaw.toLowerCase() === "absent";
    const efm = isAbsent ? 0 : parseFloat(efmRaw);
    const efmStatut: "PRESENT" | "ABSENT" = isAbsent ? "ABSENT" : "PRESENT";

    // Validate ranges: CC 0-20, EFM 0-40
    if (cc > 20 || efm > 40) {
      logger.debug({ cef, cc, efm, reason: "out of range" }, "Skipping student row");
      continue;
    }

    const moyenneOff = Math.round(((cc + efm) / 3) * 100) / 100;

    logger.debug({ cef, nomPrenom, cc, efm, efmStatut, moyenneOff }, "Student parsed");
    stagiaires.push({ cef, nomPrenom, cc, efm, efmStatut, moyenneOff });
  }

  logger.info(
    { groupe, moduleCode, moduleIntitule, stagiaires: stagiaires.length },
    "PV EFM parsed"
  );

  return {
    etablissement: etablissementMatch ? etablissementMatch[1].trim() : "Inconnu",
    filiere: filiereMatch ? filiereMatch[1].trim() : "",
    anneeFormation: anneeMatch ? anneeMatch[1] : "2025/2026",
    groupe,
    niveau: niveauMatch ? niveauMatch[1].trim() : "Spécialisation",
    moduleCode,
    moduleIntitule,
    inscrits: inscritMatch ? parseInt(inscritMatch[1]) : 0,
    presents: presentMatch ? parseInt(presentMatch[1]) : 0,
    absents: absentMatch ? parseInt(absentMatch[1]) : 0,
    stagiaires,
  };
}
