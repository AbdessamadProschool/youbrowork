import { Router } from "express";
import { db } from "@workspace/db";
import {
  notesModuleTable,
  avancementsTable,
  calendriersTable,
  groupesTable,
  stagiairesTable,
  stagiaireDisciplinesTable,
} from "@workspace/db";
import { GetAlertesResponse } from "@workspace/api-zod";
import {
  computeAlertesForGroupe,
  computeAlertesForStagiaire,
  computeDisciplinaireAlert,
} from "../lib/alertes";
import { sql, eq } from "drizzle-orm";

const router = Router();

router.get("/alertes", async (req, res): Promise<void> => {
  const { niveau, entity } = req.query as {
    niveau?: string;
    entity?: string;
  };

  const etablissementId = req.headers["x-etab-id"] as string | undefined;

  let groupesQuery = db.select().from(groupesTable);
  let stagiairesQuery = db.select().from(stagiairesTable);
  let avancementsQuery = db.select().from(avancementsTable);

  if (etablissementId) {
    groupesQuery = groupesQuery.where(eq(groupesTable.etablissementId, etablissementId)) as any;
    stagiairesQuery = stagiairesQuery.where(eq(stagiairesTable.etablissementId, etablissementId)) as any;
    avancementsQuery = avancementsQuery.where(eq(avancementsTable.etablissementId, etablissementId)) as any;
  }

  const groupes = await groupesQuery;
  const stagiaires = await stagiairesQuery;
  const avancements = await avancementsQuery;
  const notes = await db.select().from(notesModuleTable);

  const calendrier = await db
    .select()
    .from(calendriersTable)
    .orderBy(sql`${calendriersTable.importedAt} DESC`)
    .limit(1)
    .then((r) => r[0] ?? null);
  const tauxTheorique = calendrier ? calendrier.tauxTheorique : null;

  // Load last discipline validation per stagiaire
  const disciplines = await db.select().from(stagiaireDisciplinesTable);

  const allAlertes: ReturnType<typeof computeAlertesForStagiaire> = [];

  if (!entity || entity === "stagiaire") {
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

      // Disciplinary alert: count EFM absences vs last validation
      const totalAbsences = sNotes.filter((n) => n.efmStatut === "ABSENT").length;
      const lastDiscipline = disciplines
        .filter((d) => d.cef === s.cef)
        .sort((a, b) => new Date(b.validatedAt).getTime() - new Date(a.validatedAt).getTime())[0];
      const absencesValidated = lastDiscipline?.absencesCountAtValidation ?? 0;

      const sGroupe = groupes.find((g) => g.id === s.groupeId);
      const groupeExtra = sGroupe
        ? { groupeCode: sGroupe.code, anneeFormation: sGroupe.anneeFormation, filiereCode: sGroupe.filiereCode, filiereNom: sGroupe.filiereNom }
        : {};

      const discAlerte = computeDisciplinaireAlert(
        s.cef,
        `${s.prenom} ${s.nom}`,
        totalAbsences,
        absencesValidated
      );
      if (discAlerte) allAlertes.push({ ...discAlerte, ...groupeExtra });

      const alertes = computeAlertesForStagiaire(
        s.cef,
        `${s.prenom} ${s.nom}`,
        sNotes
      );
      allAlertes.push(...alertes.map((a) => ({ ...a, ...groupeExtra })));
    }
  }

  if (!entity || entity === "groupe") {
    for (const g of groupes) {
      const gAv = avancements
        .filter((a) => a.groupeId === g.id)
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

      const gStagiaires = stagiaires.filter((s) => s.groupeId === g.id);
      const gNotes = notes.filter((n) =>
        gStagiaires.some((s) => s.cef === n.cef)
      );

      const alertes = computeAlertesForGroupe(
        g.id,
        g.code,
        gAv,
        gNotes.map((n) => ({
          moduleCode: n.moduleCode,
          efmStatut: n.efmStatut,
        })),
        gStagiaires.length
      );
      allAlertes.push(...alertes);
    }
  }

  // Sort: disciplinaire first, then critique, then warning, then anomalie
  const niveauOrder: Record<string, number> = { disciplinaire: 0, critique: 1, warning: 2, anomalie: 3 };
  allAlertes.sort((a, b) => (niveauOrder[a.niveau] ?? 9) - (niveauOrder[b.niveau] ?? 9));

  let filtered = allAlertes;
  if (niveau) {
    filtered = filtered.filter((a) => a.niveau === niveau);
  }

  res.json(GetAlertesResponse.parse(filtered.map((a) => ({ ...a, createdAt: a.createdAt }))));
});

export default router;
