import { Router } from "express";
import { db } from "@workspace/db";
import {
  groupesTable,
  avancementsTable,
  notesModuleTable,
  importLogsTable,
  stagiairesTable,
  stagiaireDisciplinesTable,
} from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";
import { computeAlertesForGroupe, computeAlertesForStagiaire, computeDisciplinaireAlert } from "../lib/alertes";
import { getCalendrierForGroupe } from "../lib/calendrier-helper";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard", async (req, res): Promise<void> => {
  const groupes = await db.select().from(groupesTable);
  const groupesActifs = groupes.filter((g) => g.statut === "Actif").length;

  // Compute a tauxTheorique per group and average them
  const activeGroupes = groupes.filter((g) => g.statut === "Actif");
  let tauxTheorique = 0;
  if (activeGroupes.length > 0) {
    let sum = 0;
    for (const g of activeGroupes) {
      const cal = await getCalendrierForGroupe(g.annee, g.mode);
      sum += cal ? cal.tauxTheorique : 0;
    }
    tauxTheorique = sum / activeGroupes.length;
  }

  const avancements = await db.select().from(avancementsTable);
  const notes = await db.select().from(notesModuleTable);
  const stagiaires = await db.select().from(stagiairesTable);
  const importLogs = await db
    .select()
    .from(importLogsTable)
    .orderBy(sql`${importLogsTable.createdAt} DESC`)
    .limit(5);

  // Avancement global: ALL modules included (null = 0%), matches Excel formula
  let modulesValides = 0;
  const modulesSet = new Set<string>();
  for (const av of avancements) {
    modulesSet.add(av.moduleId);
    if (av.tauxReel !== null && av.tauxReel >= 1.0) modulesValides++;
  }
  const modulesTotal = modulesSet.size;
  const tauxMoyen =
    modulesTotal > 0
      ? avancements.reduce((sum, av) => sum + (av.tauxReel ?? 0), 0) / modulesTotal
      : 0;

  const allAlertes: ReturnType<typeof computeAlertesForGroupe> = [];

  // Groupe alerts
  for (const groupe of groupes) {
    const groupeAv = avancements
      .filter((a) => a.groupeId === groupe.id)
      .map((a) => ({
        moduleCode: a.moduleCode,
        moduleIntitule: a.moduleIntitule,
        tauxReel: a.tauxReel,
        tauxTheorique,
        ecart:
          a.tauxReel !== null && tauxTheorique !== null
            ? a.tauxReel - tauxTheorique
            : null,
      }));

    const gStagiaires = stagiaires.filter((s) => s.groupeId === groupe.id);
    const gNotes = notes.filter((n) => gStagiaires.some((s) => s.cef === n.cef));

    const gAlertes = computeAlertesForGroupe(
      groupe.id,
      groupe.code,
      groupeAv,
      gNotes.map((n) => ({ moduleCode: n.moduleCode, efmStatut: n.efmStatut })),
      gStagiaires.length
    );
    allAlertes.push(...gAlertes);
  }

  // Load discipline validations
  const disciplines = await db.select().from(stagiaireDisciplinesTable);

  // Stagiaire alerts (same logic as /api/alertes route)
  for (const s of stagiaires) {
    const sNotes = notes
      .filter((n) => n.cef === s.cef)
      .map((n) => ({
        moduleCode: n.moduleCode,
        moduleIntitule: n.moduleIntitule,
        cc: n.cc,
        efm: n.efm,
        efmStatut: n.efmStatut,
        moyenneOff: n.moyenneOff,
      }));

    // Disciplinary alert first
    const totalAbsences = sNotes.filter((n) => n.efmStatut === "ABSENT").length;
    const lastDiscipline = disciplines
      .filter((d) => d.cef === s.cef)
      .sort((a, b) => new Date(b.validatedAt).getTime() - new Date(a.validatedAt).getTime())[0];
    const absencesValidated = lastDiscipline?.absencesCountAtValidation ?? 0;
    const discAlerte = computeDisciplinaireAlert(s.cef, `${s.prenom} ${s.nom}`, totalAbsences, absencesValidated);
    if (discAlerte) allAlertes.push(discAlerte);

    const sAlertes = computeAlertesForStagiaire(
      s.cef,
      `${s.prenom} ${s.nom}`,
      sNotes
    );
    allAlertes.push(...sAlertes);
  }

  // Sort: disciplinaire first
  const niveauOrder: Record<string, number> = { disciplinaire: 0, critique: 1, warning: 2, anomalie: 3 };
  allAlertes.sort((a, b) => (niveauOrder[a.niveau] ?? 9) - (niveauOrder[b.niveau] ?? 9));

  const alertesCount = allAlertes.length;
  const alertesCritiques = allAlertes.filter((a) => a.niveau === "critique").length;

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
