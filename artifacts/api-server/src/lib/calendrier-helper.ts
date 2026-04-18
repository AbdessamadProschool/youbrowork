import { db } from "@workspace/db";
import { calendriersTable, groupesTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

/**
 * Selects the correct tauxTheorique for a groupe based on its année and mode.
 * 
 * REGLE STRICTE:
 * - Niveau 'S' (Spécialisation) ou Année 2 Réelle -> Utilise le calendrier "2A-CDJ"
 * - Tout le reste (T, TS, Q) -> Utilise son année réelle (1A ou 2A)
 */
export async function getCalendrierForGroupe(
  id: string,
  annee: number,
  mode: string
): Promise<{ tauxTheorique: number; typeCalendrier: string } | null> {
  const [groupe] = await db.select().from(groupesTable).where(eq(groupesTable.id, id));
  
  // REGLE: Seul 'S' ou une 2ème année réelle déclenchent la règle 2A
  const effectiveAnnee = (groupe?.niveau === "S" || annee === 2) ? 2 : 1;
  const isResidentiel = mode.startsWith("R_");
  const prefix = effectiveAnnee === 1 ? "1A-CDJ" : "2A-CDJ";

  const rows = await db
    .select()
    .from(calendriersTable)
    .orderBy(sql`${calendriersTable.importedAt} DESC`);

  const matching = rows.filter((r: any) =>
    r.typeCalendrier.trim().startsWith(prefix)
  );

  if (matching.length === 0) {
    // Sécurité: Si pas de calendrier pour cette année, on ne "triche" pas.
    return null;
  }

  // 1ère année
  if (effectiveAnnee === 1) {
    const preferred = matching.find((r: any) =>
      r.typeCalendrier.includes("ésidentiel") &&
      r.typeCalendrier.toLowerCase().includes("passage")
    );
    if (preferred) return { tauxTheorique: preferred.tauxTheorique, typeCalendrier: preferred.typeCalendrier };
    return { tauxTheorique: matching[0].tauxTheorique, typeCalendrier: matching[0].typeCalendrier };
  }

  // 2ème année
  if (isResidentiel) {
    const preferred = matching.find((r: any) =>
      r.typeCalendrier.includes("ésidentiel") &&
      r.typeCalendrier.toLowerCase().includes("fin")
    );
    if (preferred) return { tauxTheorique: preferred.tauxTheorique, typeCalendrier: preferred.typeCalendrier };
    
    const resid = matching.find((r: any) => r.typeCalendrier.includes("ésidentiel"));
    if (resid) return { tauxTheorique: resid.tauxTheorique, typeCalendrier: resid.typeCalendrier };
  } else {
    const preferred = matching.find((r: any) =>
      r.typeCalendrier.toUpperCase().includes("FPA") &&
      r.typeCalendrier.toLowerCase().includes("fin")
    );
    if (preferred) return { tauxTheorique: preferred.tauxTheorique, typeCalendrier: preferred.typeCalendrier };

    const fpa = matching.find((r: any) => r.typeCalendrier.toUpperCase().includes("FPA"));
    if (fpa) return { tauxTheorique: fpa.tauxTheorique, typeCalendrier: fpa.typeCalendrier };
  }

  return { tauxTheorique: matching[0].tauxTheorique, typeCalendrier: matching[0].typeCalendrier };
}
