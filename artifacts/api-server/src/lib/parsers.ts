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

// ─────────────────────────────────────────────────────────────────────────────
// État d'avancement (Excel)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Calendrier (Excel) — reads "Taux d'AP objectif" column directly
// ─────────────────────────────────────────────────────────────────────────────
export function parseCalendrierXlsx(buffer: Buffer): CalendrierResult[] {
  const wb = XLSX.read(buffer, { type: "buffer" });

  const sheetName =
    wb.SheetNames.find(
      (n) => /25.?26|26|Cal/i.test(n)
    ) ?? wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet not found. Available: ${wb.SheetNames.join(", ")}`);

  logger.info({ sheetName, allSheets: wb.SheetNames }, "Calendrier sheet selected");

  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];

  logger.info({ totalRows: rawRows.length }, "Calendrier raw rows");

  // ── Step 1: Find all columns whose header contains "Taux" + "AP" + "objectif"
  // Scan rows 0-10 for header cells
  const tauxApColumns: number[] = [];
  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r] as unknown[];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? "").toLowerCase();
      if (
        cell.includes("taux") &&
        (cell.includes("ap") || cell.includes("a.p")) &&
        cell.includes("objectif")
      ) {
        tauxApColumns.push(c);
        logger.info({ rowIdx: r, colIdx: c, cell }, "Found Taux AP objectif column");
      }
    }
  }

  // Also accept column headers that contain just "objectif" as fallback
  if (tauxApColumns.length === 0) {
    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const row = rawRows[r] as unknown[];
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] ?? "").toLowerCase();
        if (cell.includes("objectif")) {
          tauxApColumns.push(c);
          logger.info({ rowIdx: r, colIdx: c, cell }, "Found objectif column (fallback)");
        }
      }
    }
  }

  logger.info({ tauxApColumns }, "All Taux AP objectif column indices found");

  // Use the RIGHTMOST column (most recent year in multi-year calendar)
  const tauxCol =
    tauxApColumns.length > 0
      ? Math.max(...tauxApColumns)
      : -1;

  if (tauxCol < 0) {
    logger.warn("No 'Taux d\\'AP objectif' column found in calendar");
    return [];
  }

  // ── Step 2: Find CDJ rows (rows where column A matches 1A-CDJ or 2A-CDJ)
  const now = new Date();
  const anneeFormation =
    now.getMonth() >= 8
      ? `${now.getFullYear()}/${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}/${now.getFullYear()}`;

  const results: CalendrierResult[] = [];

  // Log all labeled rows for debugging
  const labeledRows: { idx: number; label: string; tauxVal: unknown }[] = [];
  for (let r = 0; r < rawRows.length; r++) {
    const label = String(rawRows[r][0] ?? "").trim();
    if (label) {
      labeledRows.push({ idx: r, label, tauxVal: rawRows[r][tauxCol] });
    }
  }
  logger.info({ labeledRows }, "All labeled rows with Taux AP values");

  for (const { label, idx, tauxVal } of labeledRows) {
    // Match 1A-CDJ or 2A-CDJ patterns
    if (!/^[12]A.?CDJ/i.test(label)) continue;

    // Parse the tauxTheorique value
    let tauxTheorique = 0;
    if (typeof tauxVal === "number" && !isNaN(tauxVal)) {
      // Excel percentage is stored as decimal (0.68 = 68%)
      tauxTheorique = tauxVal <= 1 ? tauxVal : tauxVal / 100;
    } else if (typeof tauxVal === "string" && tauxVal.trim()) {
      const parsed = parseFloat(tauxVal.replace("%", "").replace(",", ".").trim());
      if (!isNaN(parsed)) {
        tauxTheorique = parsed > 1 ? parsed / 100 : parsed;
      }
    }

    logger.info(
      {
        label,
        rowIdx: idx,
        tauxCol,
        tauxVal,
        tauxTheorique: (tauxTheorique * 100).toFixed(1) + "%",
      },
      "CDJ row parsed"
    );

    results.push({
      typeCalendrier: label,
      anneeFormation,
      totalJours: 0,      // not computed from dates — using pre-computed value
      joursRealises: 0,
      tauxTheorique,
      dateReference: now,
      jourDetails: [],
    });
  }

  logger.info({ count: results.length }, "Calendrier parse complete");
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// PV EFM (PDF) — OFPPT format
//
// Each student row: <13-14 digit CEF><UPPERCASE NAME><CC/20><EFM/40 or Absent><Moy/20>
// Numbers have EXACTLY 2 decimal places. No delimiters between fields.
// Example:  2009052100036ABBID HAMZA18.0029.0015.67
// Absent:   2009042900033BASSADDOUG DRISS14.00Absent4.67
// moyenneOff = (CC + EFM) / 3  where EFM is /40
// ─────────────────────────────────────────────────────────────────────────────
export function parsePvEfmPdf(text: string): PvEfmResult {
  const etablissementMatch = text.match(/[Éé]tablissement\s*[:\-]?\s*(.+)/i);
  const filiereMatch = text.match(/Fili[eè]re\s*[:\-]?\s*(.+?)(?:\t|$)/im);
  const anneeMatch = text.match(/Ann[eé]e\s+de\s+formation\s*[:\-]?\s*(\d{4}[\/\-]\d{4})/i);
  const groupeMatch =
    text.match(/Groupe\s+de\s+formation\s*[:\-]?\s*([A-Z]{2}\d{2,3})/i) ??
    text.match(/\bGroupe\b[:\-\s]*([A-Z]{2}\d{2,3})/i);
  const niveauMatch = text.match(/Niveau\s*[:\-]?\s*(.+?)(?:\t|$)/im);

  // Module: "Intitulé du Module: Titre du module (M101)"
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
  } else {
    const mFallback = text.match(/\bM(\d{2,3})\b/);
    if (mFallback) moduleCode = `M${mFallback[1]}`;
  }

  const groupe = groupeMatch ? groupeMatch[1].trim() : "";
  const inscritMatch = text.match(/Inscrits?\s*:?\s*(\d+)/i);
  const presentMatch = text.match(/Pr[eé]sents?\s*:?\s*(\d+)/i);
  const absentMatch = text.match(/Absents?\s*:?\s*(\d+)/i);

  // ── Parse student rows ────────────────────────────────────────────────────
  // Each line starts with exactly 13–14 digits (CEF) immediately followed by
  // an uppercase letter (first char of the student name).
  // Numbers always have EXACTLY 2 decimal places (use \d+\.\d{2} to split them).
  const stagiaires: PvStagiaireRow[] = [];
  const lines = text.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Must start with 13-14 digits followed immediately by an uppercase letter
    const cefMatch = line.match(/^(\d{13,14})([A-Z])/);
    if (!cefMatch) continue;

    const cef = cefMatch[1];
    const rest = line.substring(cef.length); // e.g. "ABBID HAMZA18.0029.0015.67"

    // Name ends at the first digit
    const firstDigitIdx = rest.search(/\d/);
    if (firstDigitIdx <= 0) continue;

    const nomPrenom = rest.substring(0, firstDigitIdx).trim();
    const afterName = rest.substring(firstDigitIdx); // e.g. "18.0029.0015.67" or "14.00Absent4.67"

    // Extract tokens: numbers with exactly 2 decimal places OR "Absent"
    // Using \d{2} prevents greedy merging of adjacent numbers (18.0029.00 → 18.00 + 29.00)
    const tokenMatches = [...afterName.matchAll(/(\d+\.\d{2}|Absent)/gi)];
    const tokens = tokenMatches.map((m) => m[1]);

    if (tokens.length < 2) {
      logger.debug({ cef, line, tokens, reason: "too few tokens" }, "Skipping line");
      continue;
    }

    const cc = parseFloat(tokens[0]);
    const efmRaw = tokens[1];
    const isAbsent = efmRaw.toLowerCase() === "absent";
    const efm = isAbsent ? 0 : parseFloat(efmRaw);
    const efmStatut: "PRESENT" | "ABSENT" = isAbsent ? "ABSENT" : "PRESENT";

    // Validate ranges: CC 0–20, EFM 0–40
    if (isNaN(cc) || isNaN(efm) || cc > 20 || efm > 40) {
      logger.debug({ cef, cc, efm, reason: "out of range" }, "Skipping line");
      continue;
    }

    // moyenneOff = (CC + EFM) / 3, rounded to 2 decimal places
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
