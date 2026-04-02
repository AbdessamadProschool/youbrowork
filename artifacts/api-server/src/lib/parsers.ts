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
// Calendrier (Excel) — counts "1" cells per CDJ row vs date_ref
// Formula:
//   date_ref      = min(today, last_calendar_date)
//   jours_realises = COUNT(cell == 1 AND date <= date_ref)
//   total_jours    = COUNT(all cells == 1)
//   taux_theorique = jours_realises / total_jours
// ─────────────────────────────────────────────────────────────────────────────
/** Try to parse a cell value as a JS Date using multiple strategies. */
function cellToDate(cell: XLSX.CellObject | undefined): Date | null {
  if (!cell) return null;

  // Strategy 1: already converted to Date by cellDates:true
  if (cell.t === "d" && cell.v instanceof Date) {
    const d = cell.v;
    return isNaN(d.getTime()) ? null : d;
  }

  // Strategy 2: numeric Excel serial in realistic date range (year 2000–2099)
  if (cell.t === "n" && typeof cell.v === "number") {
    const serial = cell.v;
    if (serial > 36526 && serial < 73050) {
      // 2000-01-01 to 2099-12-31
      const utcMs = (serial - 25569) * 86400 * 1000;
      const d = new Date(utcMs);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  // Strategy 3: text date string (dd/mm/yyyy, d/m/yyyy, yyyy-mm-dd, etc.)
  if (cell.t === "s" && typeof cell.v === "string") {
    const s = cell.v.trim();
    // dd/mm/yyyy or d/m/yy
    const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (dmy) {
      const day = parseInt(dmy[1]);
      const month = parseInt(dmy[2]) - 1;
      let year = parseInt(dmy[3]);
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) return d;
    }
    // yyyy-mm-dd
    const ymd = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (ymd) {
      const d = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]));
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) return d;
    }
  }

  return null;
}

export function parseCalendrierXlsx(buffer: Buffer): CalendrierResult[] {
  // Parse twice: once with cellDates for date detection, once raw for values
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: true });

  const sheetName =
    wb.SheetNames.find((n) => /25.?26|26|Cal/i.test(n)) ?? wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet not found. Available: ${wb.SheetNames.join(", ")}`);

  logger.info({ sheetName, allSheets: wb.SheetNames }, "Calendrier sheet selected");

  const wsRef = ws["!ref"];
  if (!wsRef) return [];
  const range = XLSX.utils.decode_range(wsRef);

  // ── Step 1: Find the date header row ─────────────────────────────────────
  // Scan rows 0-30 for a row with ≥5 date-type cells across columns 1+
  // A date cell = type 'd', OR numeric serial in 2000-2099 range, OR text date string
  let dateRowIdx = -1;
  const colDates = new Map<number, Date>(); // column index → JS Date

  for (let R = 0; R <= Math.min(range.e.r, 30); R++) {
    const tempDates = new Map<number, Date>();
    for (let C = 1; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      const d = cellToDate(cell);
      if (d) tempDates.set(C, d);
    }
    if (tempDates.size >= 5) {
      dateRowIdx = R;
      for (const [c, d] of tempDates) colDates.set(c, d);
      break;
    }
  }

  if (dateRowIdx < 0 || colDates.size === 0) {
    logger.warn({ sheetName }, "No date row found in calendar — dumping row 0-5 cell types for debug");
    for (let R = 0; R <= Math.min(range.e.r, 5); R++) {
      const sample: string[] = [];
      for (let C = 0; C <= Math.min(range.e.c, 10); C++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        sample.push(cell ? `${cell.t}:${JSON.stringify(cell.v)}` : "·");
      }
      logger.warn({ R, sample }, "Row sample");
    }
    return [];
  }

  const allDateValues = [...colDates.values()];
  const lastCalDate = new Date(Math.max(...allDateValues.map((d) => d.getTime())));
  const firstCalDate = new Date(Math.min(...allDateValues.map((d) => d.getTime())));

  // date_ref = min(today, last calendar date)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastCalDate.setHours(0, 0, 0, 0);
  firstCalDate.setHours(0, 0, 0, 0);
  const dateRef = today <= lastCalDate ? today : lastCalDate;

  logger.info(
    {
      dateRowIdx,
      dateColumnCount: colDates.size,
      firstDate: firstCalDate.toISOString().split("T")[0],
      lastDate: lastCalDate.toISOString().split("T")[0],
      dateRef: dateRef.toISOString().split("T")[0],
    },
    "Date row detected"
  );

  const now = new Date();
  const anneeFormation =
    now.getMonth() >= 8
      ? `${now.getFullYear()}/${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}/${now.getFullYear()}`;

  // ── Step 2: Locate summary columns (Taux d'AP objectif) as fallback ────────
  // The summary columns appear AFTER the day-data columns; scan the last row before data for headers
  const summaryColsMap = new Map<string, number>(); // header text → col index
  const maxDataCol = Math.max(...colDates.keys());
  for (let R = 0; R <= Math.min(dateRowIdx + 5, range.e.r); R++) {
    for (let C = maxDataCol + 1; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell || cell.t !== "s") continue;
      const txt = String(cell.v ?? "").toLowerCase().trim();
      if (txt.includes("taux") && txt.includes("ap")) summaryColsMap.set("tauxAP", C);
      if (txt.includes("jour") && txt.includes("ouvr")) summaryColsMap.set("joursOuv", C);
    }
  }
  logger.info({ summaryColsMap: Object.fromEntries(summaryColsMap) }, "Summary columns located");

  // ── Step 3: For each CDJ/CDS row, count formation days (cells == 1) ───────
  // Widened regex: matches 1A-CDJ, 2A-CDJ, 3A-CDJ, CDS 1A+2A, CDS-3A, etc.
  const CDJ_LABEL_RE = /^([123]A.{0,10}CDJ|CDS)/i;

  const results: CalendrierResult[] = [];

  for (let R = 0; R <= range.e.r; R++) {
    if (R === dateRowIdx) continue;

    const cellA = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
    const label = String(cellA?.v ?? "").trim();
    if (!CDJ_LABEL_RE.test(label)) continue;

    let totalJours = 0;
    let joursRealises = 0;
    const jourDetails: JourDetail[] = [];

    for (const [C, cellDate] of colDates) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      const val = cell?.v;

      // A formation day is marked with value 1 (numeric) or "1" (string)
      const isFormation = val === 1 || val === "1";
      if (!isFormation) continue;

      totalJours++;

      const d = new Date(cellDate);
      d.setHours(0, 0, 0, 0);
      if (d <= dateRef) joursRealises++;

      jourDetails.push({
        date: cellDate.toISOString().split("T")[0],
        statut: "FORMATION",
      });
    }

    // Fallback: if cell-counting gives 0 total, read summary column directly
    let tauxTheorique = 0;
    if (totalJours > 0) {
      tauxTheorique = Math.min(joursRealises / totalJours, 1);
    } else if (summaryColsMap.has("tauxAP")) {
      const tauxCell = ws[XLSX.utils.encode_cell({ r: R, c: summaryColsMap.get("tauxAP")! })];
      if (tauxCell && tauxCell.t === "n" && typeof tauxCell.v === "number") {
        // stored as decimal fraction (0.68 = 68%)
        tauxTheorique = Math.min(Math.abs(tauxCell.v), 1);
        logger.info({ label, tauxFromSummary: tauxCell.v }, "Using summary column fallback for taux");
      }
    }

    logger.info(
      {
        label,
        totalJours,
        joursRealises,
        tauxTheorique: (tauxTheorique * 100).toFixed(1) + "%",
        dateRef: dateRef.toISOString().split("T")[0],
      },
      "CDJ row taux computed"
    );

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
