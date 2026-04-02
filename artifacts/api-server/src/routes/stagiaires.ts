import { Router } from "express";
import { eq, ilike, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { stagiairesTable, notesModuleTable, groupesTable } from "@workspace/db";
import {
  GetStagiairesResponse,
  GetStagiaireNotesResponse,
} from "@workspace/api-zod";
import { computeAlertesForStagiaire } from "../lib/alertes";

const router = Router();

router.get("/stagiaires", async (req, res): Promise<void> => {
  const { groupeId, search } = req.query as {
    groupeId?: string;
    search?: string;
  };

  let stagiaires = await db.select().from(stagiairesTable);
  if (groupeId) {
    stagiaires = stagiaires.filter((s) => s.groupeId === groupeId);
  }
  if (search) {
    const q = search.toLowerCase();
    stagiaires = stagiaires.filter(
      (s) =>
        s.nom.toLowerCase().includes(q) ||
        s.prenom.toLowerCase().includes(q) ||
        s.cef.includes(q)
    );
  }

  const notes = await db.select().from(notesModuleTable);
  const groupes = await db.select().from(groupesTable);

  const result = stagiaires.map((s, idx) => {
    const sNotes = notes
      .filter((n) => n.cef === s.cef)
      .map((n) => ({
        id: n.id,
        moduleCode: n.moduleCode,
        moduleIntitule: n.moduleIntitule,
        cc: n.cc,
        efm: n.efm,
        efmStatut: n.efmStatut,
        moyenneOff: n.moyenneOff,
        moyenneNorm: n.moyenneNorm,
        valide: n.moyenneOff >= 10,
        sourceFile: n.sourceFile,
        importedAt: n.importedAt.toISOString(),
      }));

    const alertes = computeAlertesForStagiaire(
      s.cef,
      `${s.prenom} ${s.nom}`,
      sNotes.map((n) => ({
        moduleCode: n.moduleCode,
        moduleIntitule: n.moduleIntitule,
        cc: n.cc,
        efm: n.efm,
        efmStatut: n.efmStatut,
        moyenneOff: n.moyenneOff,
      }))
    );

    const groupe = groupes.find((g) => g.id === s.groupeId);
    const moyenneGenerale =
      sNotes.length > 0
        ? sNotes.reduce((sum, n) => sum + n.moyenneOff, 0) / sNotes.length
        : null;

    return {
      id: s.id,
      cef: s.cef,
      nom: s.nom,
      prenom: s.prenom,
      nomComplet: `${s.prenom} ${s.nom}`,
      groupeId: s.groupeId,
      groupeCode: groupe?.code ?? "",
      moyenneGenerale,
      notes: sNotes,
      alertes: alertes.map((a) => ({ ...a, createdAt: a.createdAt })),
      rang: null,
    };
  });

  result.sort(
    (a, b) => (b.moyenneGenerale ?? -1) - (a.moyenneGenerale ?? -1)
  );

  res.json(GetStagiairesResponse.parse(result));
});

router.get("/stagiaires/:cef/notes", async (req, res): Promise<void> => {
  const cef = Array.isArray(req.params.cef)
    ? req.params.cef[0]
    : req.params.cef;

  const [stagiaire] = await db
    .select()
    .from(stagiairesTable)
    .where(eq(stagiairesTable.cef, cef));

  if (!stagiaire) {
    res.status(404).json({ error: "Stagiaire not found" });
    return;
  }

  const rawNotes = await db
    .select()
    .from(notesModuleTable)
    .where(eq(notesModuleTable.cef, cef));

  const [groupe] = await db
    .select()
    .from(groupesTable)
    .where(eq(groupesTable.id, stagiaire.groupeId));

  const notes = rawNotes.map((n) => ({
    id: n.id,
    moduleCode: n.moduleCode,
    moduleIntitule: n.moduleIntitule,
    cc: n.cc,
    efm: n.efm,
    efmStatut: n.efmStatut,
    moyenneOff: n.moyenneOff,
    moyenneNorm: n.moyenneNorm,
    valide: n.moyenneOff >= 10,
    sourceFile: n.sourceFile,
    importedAt: n.importedAt.toISOString(),
  }));

  const alertes = computeAlertesForStagiaire(
    stagiaire.cef,
    `${stagiaire.prenom} ${stagiaire.nom}`,
    notes.map((n) => ({
      moduleCode: n.moduleCode,
      moduleIntitule: n.moduleIntitule,
      cc: n.cc,
      efm: n.efm,
      efmStatut: n.efmStatut,
      moyenneOff: n.moyenneOff,
    }))
  );

  const moyenneGenerale =
    notes.length > 0
      ? notes.reduce((sum, n) => sum + n.moyenneOff, 0) / notes.length
      : null;

  res.json(
    GetStagiaireNotesResponse.parse({
      stagiaire: {
        id: stagiaire.id,
        cef: stagiaire.cef,
        nom: stagiaire.nom,
        prenom: stagiaire.prenom,
        nomComplet: `${stagiaire.prenom} ${stagiaire.nom}`,
        groupeId: stagiaire.groupeId,
        groupeCode: groupe?.code ?? "",
      },
      notes,
      alertes: alertes.map((a) => ({ ...a, createdAt: a.createdAt })),
      moyenneGenerale,
    })
  );
});

export default router;
