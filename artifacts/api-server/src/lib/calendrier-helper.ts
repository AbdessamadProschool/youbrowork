import { db } from "@workspace/db";
import { calendriersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Selects the correct tauxTheorique for a groupe based on its année and mode.
 *
 * Priority (Résidentiel groups):
 *   annee 1  →  "1A-CDJ (Résidentiel-passage)"  (fallback: any "1A-CDJ%")
 *   annee 2  →  "2A-CDJ (Résidentiel-Fin de formation)"  (fallback: any "2A-CDJ%Résidentiel%")
 *
 * FPA groups:
 *   annee 2  →  "2A-CDJ (FPA-Fin de formation)"  (fallback: any "2A-CDJ%FPA%")
 */
export async function getCalendrierForGroupe(
  annee: number,
  mode: string
): Promise<{ tauxTheorique: number; typeCalendrier: string } | null> {
  const isResidentiel = mode.startsWith("R_");
  const prefix = annee === 1 ? "1A-CDJ" : "2A-CDJ";

  // Fetch all rows, most recent first
  const rows = await db
    .select()
    .from(calendriersTable)
    .orderBy(sql`${calendriersTable.importedAt} DESC`);

  // All rows matching this année prefix
  const matching = rows.filter((r) =>
    r.typeCalendrier.trim().startsWith(prefix)
  );

  if (matching.length === 0) {
    // Absolute fallback: most recent row of any type
    return rows.length > 0
      ? { tauxTheorique: rows[0].tauxTheorique, typeCalendrier: rows[0].typeCalendrier }
      : null;
  }

  // ── 1ère année ────────────────────────────────────────────────────────────
  if (annee === 1) {
    // Prefer "1A-CDJ (Résidentiel-passage)" — exact or partial match
    const preferred = matching.find(
      (r) =>
        r.typeCalendrier.includes("ésidentiel") &&
        r.typeCalendrier.toLowerCase().includes("passage")
    );
    if (preferred)
      return { tauxTheorique: preferred.tauxTheorique, typeCalendrier: preferred.typeCalendrier };

    // Fallback: any 1A-CDJ row (most recent)
    return { tauxTheorique: matching[0].tauxTheorique, typeCalendrier: matching[0].typeCalendrier };
  }

  // ── 2ème année ────────────────────────────────────────────────────────────
  if (isResidentiel) {
    // Prefer "2A-CDJ (Résidentiel-Fin de formation)"
    const preferred = matching.find(
      (r) =>
        r.typeCalendrier.includes("ésidentiel") &&
        r.typeCalendrier.toLowerCase().includes("fin")
    );
    if (preferred)
      return { tauxTheorique: preferred.tauxTheorique, typeCalendrier: preferred.typeCalendrier };

    // Fallback: any 2A-CDJ Résidentiel row
    const resid = matching.find((r) => r.typeCalendrier.includes("ésidentiel"));
    if (resid)
      return { tauxTheorique: resid.tauxTheorique, typeCalendrier: resid.typeCalendrier };
  } else {
    // FPA: prefer "2A-CDJ (FPA-Fin de formation)"
    const preferred = matching.find(
      (r) =>
        r.typeCalendrier.toUpperCase().includes("FPA") &&
        r.typeCalendrier.toLowerCase().includes("fin")
    );
    if (preferred)
      return { tauxTheorique: preferred.tauxTheorique, typeCalendrier: preferred.typeCalendrier };

    const fpa = matching.find((r) => r.typeCalendrier.toUpperCase().includes("FPA"));
    if (fpa)
      return { tauxTheorique: fpa.tauxTheorique, typeCalendrier: fpa.typeCalendrier };
  }

  // Fallback: most recent matching row
  return { tauxTheorique: matching[0].tauxTheorique, typeCalendrier: matching[0].typeCalendrier };
}
