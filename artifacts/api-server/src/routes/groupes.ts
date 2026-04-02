import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  groupesTable,
  avancementsTable,
  calendriersTable,
  notesModuleTable,
  stagiairesTable,
} from "@workspace/db";
import {
  GetGroupesResponse,
  GetGroupeResponse,
  GetGroupeAvancementResponse,
  GetGroupeStagiairesResponse,
  CreateGroupeBody,
} from "@workspace/api-zod";
import {
  computeAlertesForGroupe,
  computeAlertesForStagiaire,
} from "../lib/alertes";
import { randomUUID } from "crypto";

const router = Router();

function avancementStatut(
  tauxReel: number | null,
  tauxTheorique: number | null
) {
  if (tauxReel === null) return "non_demarre";
  if (tauxReel >= 1.0) return "en_avance";
  const ecart = tauxReel - (tauxTheorique ?? 0);
  if (ecart > 0.05) return "en_avance";
  if (ecart < -0.05) return "en_retard";
  return "a_jour";
}

function moduleStatut(
  tauxReel: number | null,
  tauxTheorique: number | null
): string {
  if (tauxReel === null) return "non_demarre";
  if (tauxReel > 1.07) return "anomalie";
  if (tauxReel >= 1.0) return "termine";
  const ecart = tauxReel - (tauxTheorique ?? 0);
  if (ecart > 0.05) return "en_avance";
  if (ecart < -0.05) return "en_retard";
  return "a_jour";
}

router.get("/groupes", async (req, res): Promise<void> => {
  const { statut } = req.query as { statut?: string };

  let groupes = await db.select().from(groupesTable);
  if (statut) {
    groupes = groupes.filter(
      (g) => g.statut.toLowerCase() === statut.toLowerCase()
    );
  }

  const calendrier = await db
    .select()
    .from(calendriersTable)
    .orderBy(sql`${calendriersTable.importedAt} DESC`)
    .limit(1)
    .then((r) => r[0] ?? null);

  const tauxTheorique = calendrier ? calendrier.tauxTheorique : null;

  const avancements = await db.select().from(avancementsTable);

  const stagiaires = await db.select().from(stagiairesTable);

  const result = groupes.map((g) => {
    const gAv = avancements.filter((a) => a.groupeId === g.id);
    const hasReel = gAv.some((a) => a.tauxReel !== null);

    let avgReel: number | null = null;
    if (hasReel) {
      const reelVals = gAv
        .filter((a) => a.tauxReel !== null)
        .map((a) => Math.min(a.tauxReel!, 1));
      avgReel =
        reelVals.length > 0
          ? reelVals.reduce((s, v) => s + v, 0) / reelVals.length
          : null;
    }

    const ecart =
      avgReel !== null && tauxTheorique !== null
        ? avgReel - tauxTheorique
        : null;

    const nbStagiaires = stagiaires.filter(
      (s) => s.groupeId === g.id
    ).length;

    return {
      id: g.id,
      code: g.code,
      annee: g.annee,
      mode: g.mode,
      filiereCode: g.filiereCode,
      filiereNom: g.filiereNom,
      statut: g.statut,
      anneeFormation: g.anneeFormation,
      tauxReel: avgReel,
      tauxTheorique,
      ecart,
      avancementStatut: avancementStatut(avgReel, tauxTheorique),
      nbStagiaires,
      createdAt: g.createdAt.toISOString(),
    };
  });

  res.json(GetGroupesResponse.parse(result));
});

router.post("/groupes", async (req, res): Promise<void> => {
  const parsed = CreateGroupeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const code = parsed.data.code.toUpperCase();
  const anneeMatch = code.match(/[A-Z]+(\d)/);
  const annee = anneeMatch ? parseInt(anneeMatch[1]) : 1;

  const [groupe] = await db
    .insert(groupesTable)
    .values({
      id: randomUUID(),
      code,
      annee,
      mode: parsed.data.mode as
        | "R_PP"
        | "R_FF"
        | "FPA_PP"
        | "FPA_FF",
      filiereCode: parsed.data.filiereCode,
      filiereNom: parsed.data.filiereNom,
      statut: parsed.data.statut ?? "Actif",
      anneeFormation: parsed.data.anneeFormation,
    })
    .returning();

  res.status(201).json(
    GetGroupeResponse.parse({
      id: groupe.id,
      code: groupe.code,
      annee: groupe.annee,
      mode: groupe.mode,
      filiereCode: groupe.filiereCode,
      filiereNom: groupe.filiereNom,
      statut: groupe.statut,
      anneeFormation: groupe.anneeFormation,
      tauxReel: null,
      tauxTheorique: null,
      ecart: null,
      avancementStatut: "non_demarre",
      nbStagiaires: 0,
      createdAt: groupe.createdAt.toISOString(),
    })
  );
});

router.get("/groupes/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [groupe] = await db
    .select()
    .from(groupesTable)
    .where(eq(groupesTable.id, id));

  if (!groupe) {
    res.status(404).json({ error: "Groupe not found" });
    return;
  }

  const calendrier = await db
    .select()
    .from(calendriersTable)
    .orderBy(sql`${calendriersTable.importedAt} DESC`)
    .limit(1)
    .then((r) => r[0] ?? null);
  const tauxTheorique = calendrier ? calendrier.tauxTheorique : null;

  const avancements = await db
    .select()
    .from(avancementsTable)
    .where(eq(avancementsTable.groupeId, id));

  const hasReel = avancements.some((a) => a.tauxReel !== null);
  let avgReel: number | null = null;
  if (hasReel) {
    const reelVals = avancements
      .filter((a) => a.tauxReel !== null)
      .map((a) => Math.min(a.tauxReel!, 1));
    avgReel =
      reelVals.length > 0
        ? reelVals.reduce((s, v) => s + v, 0) / reelVals.length
        : null;
  }

  const ecart =
    avgReel !== null && tauxTheorique !== null
      ? avgReel - tauxTheorique
      : null;

  const nbStagiaires = await db
    .select()
    .from(stagiairesTable)
    .where(eq(stagiairesTable.groupeId, id))
    .then((r) => r.length);

  res.json(
    GetGroupeResponse.parse({
      id: groupe.id,
      code: groupe.code,
      annee: groupe.annee,
      mode: groupe.mode,
      filiereCode: groupe.filiereCode,
      filiereNom: groupe.filiereNom,
      statut: groupe.statut,
      anneeFormation: groupe.anneeFormation,
      tauxReel: avgReel,
      tauxTheorique,
      ecart,
      avancementStatut: avancementStatut(avgReel, tauxTheorique),
      nbStagiaires,
      createdAt: groupe.createdAt.toISOString(),
    })
  );
});

router.get("/groupes/:id/avancement", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [groupe] = await db
    .select()
    .from(groupesTable)
    .where(eq(groupesTable.id, id));

  if (!groupe) {
    res.status(404).json({ error: "Groupe not found" });
    return;
  }

  const calendrier = await db
    .select()
    .from(calendriersTable)
    .orderBy(sql`${calendriersTable.importedAt} DESC`)
    .limit(1)
    .then((r) => r[0] ?? null);
  const tauxTheorique = calendrier ? calendrier.tauxTheorique : null;

  const avancements = await db
    .select()
    .from(avancementsTable)
    .where(eq(avancementsTable.groupeId, id));

  const modules = avancements.map((a) => {
    const reel = a.tauxReel !== null ? Math.min(a.tauxReel, 1.1) : null;
    const ecart =
      reel !== null && tauxTheorique !== null ? reel - tauxTheorique : null;
    return {
      id: a.id,
      moduleCode: a.moduleCode,
      moduleIntitule: a.moduleIntitule,
      mhGlobale: a.mhGlobale,
      mhRealise: a.mhRealise ?? null,
      tauxReel: reel,
      tauxTheorique,
      ecart,
      statut: moduleStatut(reel, tauxTheorique),
      nbSeancesVal: a.nbSeancesVal,
      nbSeancesEnCours: a.nbSeancesEnCours,
      sourceFile: a.sourceFile,
      importedAt: a.importedAt.toISOString(),
    };
  });

  const reelVals = modules
    .filter((m) => m.tauxReel !== null)
    .map((m) => m.tauxReel!);
  const avgReel =
    reelVals.length > 0
      ? reelVals.reduce((s, v) => s + v, 0) / reelVals.length
      : null;
  const ecartGlobal =
    avgReel !== null && tauxTheorique !== null
      ? avgReel - tauxTheorique
      : null;

  res.json(
    GetGroupeAvancementResponse.parse({
      groupeId: id,
      groupeCode: groupe.code,
      tauxTheorique,
      ecartGlobal,
      projection: null,
      modules,
    })
  );
});

router.get("/groupes/:id/stagiaires", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const stagiaires = await db
    .select()
    .from(stagiairesTable)
    .where(eq(stagiairesTable.groupeId, id));

  const notes = await db.select().from(notesModuleTable);

  const [groupe] = await db
    .select()
    .from(groupesTable)
    .where(eq(groupesTable.id, id));

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
      rang: idx + 1,
    };
  });

  result.sort((a, b) => (b.moyenneGenerale ?? 0) - (a.moyenneGenerale ?? 0));
  result.forEach((s, i) => (s.rang = i + 1));

  res.json(GetGroupeStagiairesResponse.parse(result));
});

export default router;
