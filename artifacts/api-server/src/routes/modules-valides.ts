import { Router } from "express";
import { db } from "@workspace/db";
import {
  avancementsTable,
  groupesTable,
  notesModuleTable,
  stagiairesTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

router.get("/modules-valides", async (req, res): Promise<void> => {
  const etablissementId = req.headers["x-etab-id"] as string | undefined;

  let avancementsQuery = db.select().from(avancementsTable);
  let groupsQuery = db.select().from(groupesTable);
  let stagiairesQuery = db.select().from(stagiairesTable);

  if (etablissementId) {
    avancementsQuery = avancementsQuery.where(eq(avancementsTable.etablissementId, etablissementId)) as any;
    groupsQuery = groupsQuery.where(eq(groupesTable.etablissementId, etablissementId)) as any;
    stagiairesQuery = stagiairesQuery.where(eq(stagiairesTable.etablissementId, etablissementId)) as any;
  }

  const avancements = await avancementsQuery;
  const groups = await groupsQuery;
  const allStagiaires = await stagiairesQuery;
  const allNotes = await db.select().from(notesModuleTable);

  const valides = avancements
    .filter((av) => av.tauxReel !== null && av.tauxReel >= 1.0)
    .map((av) => {
      const group = groups.find((g) => g.id === av.groupeId);
      
      // Get CEFs of stagiaires in this group
      const groupStagiaireCefs = allStagiaires
        .filter(s => s.groupeId === av.groupeId)
        .map(s => s.cef);

      // Check if any stagiaire in this group has a note for this module
      const hasNotes = allNotes.some(n => 
        n.moduleId === av.moduleId && 
        groupStagiaireCefs.includes(n.cef)
      );

      return {
        id: av.id,
        moduleCode: av.moduleCode,
        moduleIntitule: av.moduleIntitule,
        groupeId: av.groupeId,
        groupeCode: group?.code ?? "Inconnu",
        filiereCode: group?.filiereCode ?? "Inconnu",
        tauxReel: av.tauxReel,
        mhGlobale: av.mhGlobale,
        mhRealise: av.mhRealise,
        hasNotes,
        importedAt: av.importedAt.toISOString(),
      };
    });

  res.json(valides);
});

export default router;
