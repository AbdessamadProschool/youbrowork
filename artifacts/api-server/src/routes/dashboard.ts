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
import { sql, eq } from "drizzle-orm";

const router = Router();

router.get("/dashboard", async (req, res): Promise<void> => {
  const etablissementId = req.headers["x-etab-id"] as string | undefined;

  let groupesQuery = db.select().from(groupesTable);
  let avancementsQuery = db.select().from(avancementsTable);
  let stagiairesQuery = db.select().from(stagiairesTable);
  // Notes don't have etablissementId directly, we should filter them later if needed, or they are just isolated per stagiaire

  if (etablissementId) {
    groupesQuery = groupesQuery.where(eq(groupesTable.etablissementId, etablissementId)) as any;
    avancementsQuery = avancementsQuery.where(eq(avancementsTable.etablissementId, etablissementId)) as any;
    stagiairesQuery = stagiairesQuery.where(eq(stagiairesTable.etablissementId, etablissementId)) as any;
  }

  const groupes = await groupesQuery;
  const activeGroupes = groupes.filter((g) => g.statut === "Actif");
  const groupesActifs = activeGroupes.length;

  const avancements = await avancementsQuery;
  const notes = await db.select().from(notesModuleTable); // All notes; we'll filter by valid stagiaires later
  const stagiaires = await stagiairesQuery;
  const importLogs = await db
    .select()
    .from(importLogsTable)
    .orderBy(sql`${importLogsTable.createdAt} DESC`)
    .limit(5);

  // --- Per-group stats (for chart) ---
  const parGroupe: {
    code: string;
    annee: number;
    filiere: string;
    tauxMoyen: number;
    tauxTheorique: number;
    modulesValides: number;
    modulesTotal: number;
  }[] = [];

  const groupeTauxTheorique: Record<string, number> = {};

  for (const g of activeGroupes) {
    const cal = await getCalendrierForGroupe(g.id, g.annee, g.mode);
    const tt = cal ? cal.tauxTheorique : 0;
    groupeTauxTheorique[g.id] = tt;

    const gAv = avancements.filter((av) => av.groupeId === g.id);
    const gTauxMoyen =
      gAv.length > 0
        ? gAv.reduce((s, av) => s + (av.tauxReel ?? 0), 0) / gAv.length
        : 0;
    const gModulesValides = gAv.filter(
      (av) => av.tauxReel !== null && av.tauxReel >= 1.0
    ).length;

    parGroupe.push({
      code: g.code,
      annee: g.annee,
      filiere: g.filiereCode,
      tauxMoyen: gTauxMoyen,
      tauxTheorique: tt,
      modulesValides: gModulesValides,
      modulesTotal: gAv.length,
    });
  }

  // --- Global avancement: average over all avancement rows (FIXED — not /uniqueModules) ---
  const modulesTotal = avancements.length;
  const modulesValides = avancements.filter(
    (av) => av.tauxReel !== null && av.tauxReel >= 1.0
  ).length;
  const tauxMoyen =
    modulesTotal > 0
      ? avancements.reduce((sum, av) => sum + (av.tauxReel ?? 0), 0) / modulesTotal
      : 0;

  // --- Global taux théorique: average of per-group théoriques ---
  const tauxTheorique =
    activeGroupes.length > 0
      ? Object.values(groupeTauxTheorique).reduce((s, t) => s + t, 0) /
        activeGroupes.length
      : 0;

  // --- Per-year stats ---
  const annees = [...new Set(activeGroupes.map((g) => g.annee))].sort();
  const parAnnee = annees.map((annee) => {
    const anneeGroups = activeGroupes.filter((g) => g.annee === annee);
    const anneeAv = avancements.filter((av) =>
      anneeGroups.some((g) => g.id === av.groupeId)
    );
    const taux =
      anneeAv.length > 0
        ? anneeAv.reduce((s, av) => s + (av.tauxReel ?? 0), 0) / anneeAv.length
        : 0;
    const mv = anneeAv.filter(
      (av) => av.tauxReel !== null && av.tauxReel >= 1.0
    ).length;
    const tt =
      anneeGroups.length > 0
        ? anneeGroups.reduce((s, g) => s + (groupeTauxTheorique[g.id] ?? 0), 0) /
          anneeGroups.length
        : 0;
    return {
      annee,
      label: annee === 1 ? "1ère année" : `${annee}ème année`,
      taux,
      tauxTheorique: tt,
      nbGroupes: anneeGroups.length,
      modulesValides: mv,
      modulesTotal: anneeAv.length,
    };
  });

  // --- Taux d'examen: unique module IDs with notes vs unique at 100% ---
  const modulesAvecExamenSet = new Set(notes.map((n) => n.moduleId));
  const modulesTerminesSet = new Set(
    avancements
      .filter((av) => av.tauxReel !== null && av.tauxReel >= 1.0)
      .map((av) => av.moduleId)
  );
  const modulesAvecExamen = modulesAvecExamenSet.size;
  const modulesTermines = modulesTerminesSet.size;
  const tauxExamen =
    modulesTermines > 0 ? modulesAvecExamen / modulesTermines : 0;

  // --- Alertes ---
  const allAlertes: ReturnType<typeof computeAlertesForGroupe> = [];

  for (const groupe of groupes) {
    const tt = groupeTauxTheorique[groupe.id] ?? tauxTheorique;
    const groupeAv = avancements
      .filter((a) => a.groupeId === groupe.id)
      .map((a) => ({
        moduleCode: a.moduleCode,
        moduleIntitule: a.moduleIntitule,
        tauxReel: a.tauxReel,
        tauxTheorique: tt,
        ecart: a.tauxReel !== null ? a.tauxReel - tt : null,
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

  const disciplines = await db.select().from(stagiaireDisciplinesTable);

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

    const totalAbsences = sNotes.filter((n) => n.efmStatut === "ABSENT").length;
    const lastDiscipline = disciplines
      .filter((d) => d.cef === s.cef)
      .sort(
        (a, b) =>
          new Date(b.validatedAt).getTime() - new Date(a.validatedAt).getTime()
      )[0];
    const absencesValidated = lastDiscipline?.absencesCountAtValidation ?? 0;
    const discAlerte = computeDisciplinaireAlert(
      s.cef,
      `${s.prenom} ${s.nom}`,
      totalAbsences,
      absencesValidated
    );
    if (discAlerte) allAlertes.push(discAlerte);

    const sAlertes = computeAlertesForStagiaire(s.cef, `${s.prenom} ${s.nom}`, sNotes);
    allAlertes.push(...sAlertes);
  }

  const niveauOrder: Record<string, number> = {
    disciplinaire: 0,
    critique: 1,
    warning: 2,
    anomalie: 3,
  };
  
  allAlertes.sort(
    (a, b) => (niveauOrder[a.niveau] ?? 9) - (niveauOrder[b.niveau] ?? 9)
  );

  const alertesCount = allAlertes.length;
  const alertesCritiques = allAlertes.filter(
    (a) => a.niveau === "critique"
  ).length;

  // --- Taux de réussite: % stagiaires with average >= 10 ---
  const stagiaireMoyennes = stagiaires.map((s) => {
    const sNotes = notes.filter((n) => n.cef === s.cef);
    if (sNotes.length === 0) return null;
    return sNotes.reduce((sum, n) => sum + n.moyenneOff, 0) / sNotes.length;
  }).filter(m => m !== null) as number[];
  
  const stagiairesReussis = stagiaireMoyennes.filter(m => m >= 10).length;
  const tauxReussite = stagiaireMoyennes.length > 0 ? stagiairesReussis / stagiaireMoyennes.length : 0;

  const responseData = {
    groupesActifs,
    tauxMoyen,
    tauxTheorique,
    alertesCount,
    alertesCritiques,
    modulesValides,
    modulesTotal,
    modulesTermines,
    modulesAvecExamen,
    tauxExamen,
    tauxReussite,
    parGroupe,
    parAnnee,
    topAlerts: allAlertes.slice(0, 5).map((a) => ({ ...a, createdAt: a.createdAt })),
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
