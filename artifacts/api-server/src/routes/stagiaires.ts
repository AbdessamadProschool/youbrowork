import { Router } from "express";
import { eq, and, sql, avg, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { stagiairesTable, notesModuleTable, groupesTable, stagiaireDisciplinesTable } from "@workspace/db";
import {
  GetStagiairesResponse,
  GetStagiaireNotesResponse,
} from "@workspace/api-zod";
import { computeAlertesForStagiaire } from "../lib/alertes";
import { randomUUID } from "crypto";

const router = Router();

/**
 * GET /stagiaires
 * Récupère la liste des stagiaires filtrée par établissement (via middleware).
 * Calcule les moyennes générales en SQL pour la performance.
 */
router.get("/stagiaires", async (req, res): Promise<void> => {
  const etabId = (req as any).etabId;
  const { groupeId, search, annee, filiere } = req.query as any;

  // 1. Base Query with SQL Aggregation for Average and Alert counts
  const statsQuery = db
    .select({
      id: stagiairesTable.id,
      cef: stagiairesTable.cef,
      nom: stagiairesTable.nom,
      prenom: stagiairesTable.prenom,
      groupeId: stagiairesTable.groupeId,
      groupeCode: groupesTable.code,
      moyenneGenerale: sql<number>`ROUND(AVG(${notesModuleTable.moyenneOff})::numeric, 2)`,
      nbNotes: count(notesModuleTable.id),
    })
    .from(stagiairesTable)
    .leftJoin(groupesTable, eq(stagiairesTable.groupeId, groupesTable.id))
    .leftJoin(notesModuleTable, eq(stagiairesTable.cef, notesModuleTable.cef))
    .where(eq(stagiairesTable.etablissementId, etabId))
    .groupBy(stagiairesTable.id, groupesTable.code);

  const results = await statsQuery;

  // 2. Filtering in JS for complex optional fields (or could be done in SQL)
  let filtered = results;
  if (groupeId) filtered = filtered.filter(s => s.groupeId === groupeId);
  if (search) {
     const q = search.toLowerCase();
     filtered = filtered.filter(s => s.nom.toLowerCase().includes(q) || s.prenom.toLowerCase().includes(q) || s.cef.includes(q));
  }
  
  // 3. Mapping and Alert computation (lightweight)
  const final = filtered.map(s => ({
    ...s,
    nomComplet: `${s.prenom} ${s.nom}`,
    moyenneGenerale: s.nbNotes > 0 ? Number(s.moyenneGenerale) : null,
    alertes: [], // Summary listed only, details in specific profile
    rang: null,
    notes: [] 
  }));

  res.json(GetStagiairesResponse.parse(final));
});

/**
 * GET /stagiaires/:cef/notes
 * Sécurisé : Vérifie que le stagiaire appartient au bon établissement.
 */
router.get("/stagiaires/:cef/notes", async (req, res): Promise<void> => {
  const etabId = (req as any).etabId;
  const cef = req.params.cef;

  // 🛡️ BLOCK-001 FIX: Check etabId AND cef
  const [stagiaire] = await db
    .select()
    .from(stagiairesTable)
    .where(and(
      eq(stagiairesTable.cef, cef),
      eq(stagiairesTable.etablissementId, etabId)
    ));

  if (!stagiaire) {
    res.status(404).json({ error: "Stagiaire introuvable dans cet établissement." });
    return;
  }

  const rawNotes = await db
    .select()
    .from(notesModuleTable)
    .where(and(
      eq(notesModuleTable.cef, cef),
      eq(notesModuleTable.etablissementId, etabId)
    ));

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
    notes
  );

  const avgValue = notes.length > 0
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
      alertes,
      moyenneGenerale: avgValue ? Number(avgValue.toFixed(2)) : null,
    })
  );
});

/**
 * POST /stagiaires/:cef/discipline
 */
router.post("/stagiaires/:cef/discipline", async (req, res): Promise<void> => {
  const etabId = (req as any).etabId;
  const cef = req.params.cef;

  const [stagiaire] = await db.select().from(stagiairesTable).where(and(
    eq(stagiairesTable.cef, cef),
    eq(stagiairesTable.etablissementId, etabId)
  ));
  
  if (!stagiaire) {
    res.status(404).json({ error: "Stagiaire introuvable." });
    return;
  }

  const notes = await db.select().from(notesModuleTable).where(and(
    eq(notesModuleTable.cef, cef),
    eq(notesModuleTable.etablissementId, etabId)
  ));
  
  const totalAbsences = notes.filter((n) => n.efmStatut === "ABSENT").length;

  await db.insert(stagiaireDisciplinesTable).values({
    id: randomUUID(),
    cef,
    absencesCountAtValidation: totalAbsences,
  });

  res.json({ success: true, cef, absencesCountAtValidation: totalAbsences });
});

export default router;
