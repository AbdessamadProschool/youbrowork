import { Router } from "express";
import { db } from "@workspace/db";
import {
  groupesTable,
  avancementsTable,
  calendriersTable,
  notesModuleTable,
  importLogsTable,
} from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";
import { computeAlertesForGroupe } from "../lib/alertes";
import { and, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard", async (req, res): Promise<void> => {
  const groupes = await db.select().from(groupesTable);
  const groupesActifs = groupes.filter((g) => g.statut === "Actif").length;

  const calendrier = await db
    .select()
    .from(calendriersTable)
    .orderBy(calendriersTable.importedAt)
    .limit(1)
    .then((r) => r[0] ?? null);

  const tauxTheorique = calendrier ? calendrier.tauxTheorique : 0;

  const avancements = await db.select().from(avancementsTable);
  const notes = await db.select().from(notesModuleTable);
  const importLogs = await db
    .select()
    .from(importLogsTable)
    .orderBy(sql`${importLogsTable.createdAt} DESC`)
    .limit(5);

  let totalTaux = 0;
  let tauxCount = 0;
  let modulesValides = 0;
  const modulesSet = new Set<string>();
  for (const av of avancements) {
    modulesSet.add(av.moduleId);
    if (av.tauxReel !== null) {
      const reel = Math.min(av.tauxReel, 1);
      totalTaux += reel;
      tauxCount++;
      if (reel >= 1) modulesValides++;
    }
  }
  const tauxMoyen = tauxCount > 0 ? totalTaux / tauxCount : 0;
  const modulesTotal = modulesSet.size;

  const allAlertes: ReturnType<typeof computeAlertesForGroupe> = [];
  for (const groupe of groupes) {
    const groupeAv = avancements
      .filter((a) => a.groupeId === groupe.id)
      .map((a) => ({
        moduleCode: a.moduleCode,
        moduleIntitule: a.moduleIntitule,
        tauxReel: a.tauxReel,
        tauxTheorique,
        ecart: a.tauxReel !== null ? a.tauxReel - tauxTheorique : null,
      }));

    const groupeNotes = notes.filter((n) => {
      const s = groupeAv.find(() => true);
      return !!s;
    });

    const nbStagiaires = notes.filter((n) => {
      const stagiaires = [
        ...new Set(
          notes
            .filter(
              (nn) =>
                avancements.find((a) => a.groupeId === groupe.id) !== undefined
            )
            .map((nn) => nn.cef)
        ),
      ];
      return stagiaires.includes(n.cef);
    }).length;

    const gAlertes = computeAlertesForGroupe(
      groupe.id,
      groupe.code,
      groupeAv,
      groupeNotes.map((n) => ({
        moduleCode: n.moduleCode,
        efmStatut: n.efmStatut,
      })),
      nbStagiaires
    );
    allAlertes.push(...gAlertes);
  }

  const alertesCount = allAlertes.length;
  const alertesCritiques = allAlertes.filter((a) => a.niveau === "critique")
    .length;

  const responseData = {
    groupesActifs,
    tauxMoyen,
    tauxTheorique,
    alertesCount,
    alertesCritiques,
    modulesValides,
    modulesTotal,
    topAlerts: allAlertes.slice(0, 5).map((a) => ({
      ...a,
      createdAt: a.createdAt,
    })),
    recentImports: importLogs.map((il) => ({
      id: il.id,
      filename: il.filename,
      type: il.type,
      nbLignes: il.nbLignes,
      nbErreurs: il.nbErreurs,
      warnings: (il.warnings as string[]) ?? [],
      dureeMs: il.dureeMs,
      createdAt: il.createdAt.toISOString(),
    })),
  };

  res.json(GetDashboardResponse.parse(responseData));
});

export default router;
