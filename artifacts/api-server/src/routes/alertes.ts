import { Router } from "express";
import { db } from "@workspace/db";
import {
  notesModuleTable,
  avancementsTable,
  calendriersTable,
  groupesTable,
  stagiairesTable,
} from "@workspace/db";
import { GetAlertesResponse } from "@workspace/api-zod";
import {
  computeAlertesForGroupe,
  computeAlertesForStagiaire,
} from "../lib/alertes";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/alertes", async (req, res): Promise<void> => {
  const { niveau, entity } = req.query as {
    niveau?: string;
    entity?: string;
  };

  const notes = await db.select().from(notesModuleTable);
  const avancements = await db.select().from(avancementsTable);
  const groupes = await db.select().from(groupesTable);
  const stagiaires = await db.select().from(stagiairesTable);

  const calendrier = await db
    .select()
    .from(calendriersTable)
    .orderBy(sql`${calendriersTable.importedAt} DESC`)
    .limit(1)
    .then((r) => r[0] ?? null);
  const tauxTheorique = calendrier ? calendrier.tauxTheorique : null;

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

      const alertes = computeAlertesForStagiaire(
        s.cef,
        `${s.prenom} ${s.nom}`,
        sNotes
      );
      allAlertes.push(...alertes);
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

  let filtered = allAlertes;
  if (niveau) {
    filtered = filtered.filter((a) => a.niveau === niveau);
  }

  res.json(GetAlertesResponse.parse(filtered.map((a) => ({ ...a, createdAt: a.createdAt }))));
});

export default router;
