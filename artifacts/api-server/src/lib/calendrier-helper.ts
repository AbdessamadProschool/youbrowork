import { db } from "@workspace/db";
import { calendriersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Returns the appropriate tauxTheorique for a given groupe based on its
 * année de formation (1 or 2) and mode (R_PP / R_FF / FPA_PP / FPA_FF).
 *
 * Row priority:
 *  - annee 1 → "1A-CDJ%"
 *  - annee 2, Résidentiel (R_PP/R_FF) → "2A-CDJ%(Résidentiel-Fin%)" or "2A-CDJ%(Résidentiel%)"
 *  - annee 2, FPA → "2A-CDJ%(FPA-Fin%)" or "2A-CDJ%FPA%"
 *  - fallback → most recent calendrier row
 */
export async function getCalendrierForGroupe(
  annee: number,
  mode: string
): Promise<{ tauxTheorique: number; typeCalendrier: string } | null> {
  const isResidentiel = mode.startsWith("R_");
  const isFpa = mode.startsWith("FPA_");

  const prefix = annee === 1 ? "1A-CDJ" : "2A-CDJ";

  // Fetch all rows matching the année prefix, ordered most-recent first
  const rows = await db
    .select()
    .from(calendriersTable)
    .orderBy(sql`${calendriersTable.importedAt} DESC`);

  // Filter by année prefix
  const matching = rows.filter((r) =>
    r.typeCalendrier.trim().startsWith(prefix)
  );

  if (matching.length === 0) {
    // Fallback: any row, most recent
    const fallback = rows[0] ?? null;
    return fallback
      ? { tauxTheorique: fallback.tauxTheorique, typeCalendrier: fallback.typeCalendrier }
      : null;
  }

  if (matching.length === 1) {
    return { tauxTheorique: matching[0].tauxTheorique, typeCalendrier: matching[0].typeCalendrier };
  }

  // Multiple rows for this année: filter by mode
  if (annee === 2) {
    if (isResidentiel) {
      // Prefer rows with "Résidentiel" and "Fin de formation"
      const finRes = matching.find(
        (r) =>
          r.typeCalendrier.includes("ésidentiel") &&
          r.typeCalendrier.toLowerCase().includes("fin")
      );
      if (finRes) return { tauxTheorique: finRes.tauxTheorique, typeCalendrier: finRes.typeCalendrier };

      const res = matching.find((r) => r.typeCalendrier.includes("ésidentiel"));
      if (res) return { tauxTheorique: res.tauxTheorique, typeCalendrier: res.typeCalendrier };
    } else if (isFpa) {
      const fpaFin = matching.find(
        (r) =>
          r.typeCalendrier.toUpperCase().includes("FPA") &&
          r.typeCalendrier.toLowerCase().includes("fin")
      );
      if (fpaFin) return { tauxTheorique: fpaFin.tauxTheorique, typeCalendrier: fpaFin.typeCalendrier };

      const fpa = matching.find((r) => r.typeCalendrier.toUpperCase().includes("FPA"));
      if (fpa) return { tauxTheorique: fpa.tauxTheorique, typeCalendrier: fpa.typeCalendrier };
    }
  }

  // Default: first match (most recent)
  return { tauxTheorique: matching[0].tauxTheorique, typeCalendrier: matching[0].typeCalendrier };
}
