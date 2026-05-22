import { Router, type IRouter } from "express";
import { genererEmploiIA } from "../lib/ia-engine";
import { db, emploisIaTable, emploisTable, formateursTable, modulesTable, sallesTable, groupesTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";

const router: IRouter = Router();

// LIST STORED AI TIMETABLE (Dynamic & Real)
router.get("/emplois-ia", async (req, res) => {
  try {
    const etabId = req.headers["x-etab-id"] as string;
    // ✅ Fix: Support both dateDebut (Front) and startDate (Legacy)
    const startDate = (req.query.dateDebut || req.query.startDate) as string;
    const endDate = (req.query.dateFin || req.query.endDate) as string;

    if (!etabId) return res.status(400).json({ error: "Missing context" });

    // ✅ Fix: Use LeftJoin instead of InnerJoin to avoid 500 if one reference is missing
    let query = db.select({
      id: emploisIaTable.id,
      groupeCode: groupesTable.code,
      formateurNom: formateursTable.nom,
      moduleCode: modulesTable.code,
      moduleIntitule: modulesTable.intitule,
      filiereCode: groupesTable.filiereCode,
      salleNom: sallesTable.nom,
      jourSemaine: emploisIaTable.jourSemaine,
      heureDebut: emploisIaTable.heureDebut,
      heureFin: emploisIaTable.heureFin,
      date: emploisIaTable.date,
      estForcé: emploisIaTable.estForcé
    })
    .from(emploisIaTable)
    .leftJoin(groupesTable, eq(emploisIaTable.groupeId, groupesTable.id))
    .leftJoin(formateursTable, eq(emploisIaTable.formateurId, formateursTable.id))
    .leftJoin(modulesTable, eq(emploisIaTable.moduleId, modulesTable.id))
    .leftJoin(sallesTable, eq(emploisIaTable.salleId, sallesTable.id));

    const conditions = [eq(emploisIaTable.etablissementId, etabId)];

    if (startDate) conditions.push(gte(emploisIaTable.date, startDate));
    if (endDate) conditions.push(lte(emploisIaTable.date, endDate));

    const data = await query.where(and(...conditions));

    // ✅ Fix: Wrap in { emplois: ... } to match the Front-end expectation
    res.json({ emplois: data, anomalies: [], conseils: [] });
  } catch (error: any) {
    console.error("Fetch Timetable Error:", error.message);
    res.status(500).json({ error: "Failed to fetch real timetable" });
  }
});

router.get("/emplois", async (req, res) => {
  try {
    const { etablissementId } = req.query;
    if (!etablissementId) return res.status(400).json({ error: "EtabId manquant" });
    
    const emplois = await db.select({
      id: emploisTable.id,
      date: emploisTable.date,
      heureDebut: emploisTable.heureDebut,
      heureFin: emploisTable.heureFin,
      jourSemaine: emploisTable.jourSemaine,
      type: emploisTable.type,
      groupeId: emploisTable.groupeId,
      groupeCode: groupesTable.code,
      formateurNom: formateursTable.nom,
      formateurPrenom: formateursTable.prenom,
      moduleCode: modulesTable.code,
      moduleIntitule: modulesTable.intitule,
      salleNom: sallesTable.nom
    })
    .from(emploisTable)
    .leftJoin(groupesTable, eq(emploisTable.groupeId, groupesTable.id))
    .leftJoin(formateursTable, eq(emploisTable.formateurId, formateursTable.id))
    .leftJoin(modulesTable, eq(emploisTable.moduleId, modulesTable.id))
    .leftJoin(sallesTable, eq(emploisTable.salleId, sallesTable.id))
    .where(eq(emploisTable.etablissementId, etablissementId as string));

    res.json({ success: true, emplois });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/valide-ia", async (req, res) => {
  try {
    const { etablissementId } = req.body;
    if (!etablissementId) return res.status(400).json({ error: "EtabId manquant" });

    // 1. Get all current IA sessions
    const iaSessions = await db.select().from(emploisIaTable).where(eq(emploisIaTable.etablissementId, etablissementId));
    
    if (iaSessions.length === 0) return res.json({ success: false, message: "Aucune proposition IA à figer." });

    // 2. Transform into Permanent sessions
    const permanentSessions = iaSessions.map(s => ({
      ...s,
      type: "IA_VALIDEE",
      createdAt: new Date()
    }));

    // 3. Move to permanent table
    await db.insert(emploisTable).values(permanentSessions);
    
    // 4. Clear the IA table
    await db.delete(emploisIaTable).where(eq(emploisIaTable.etablissementId, etablissementId));

    res.json({ success: true, count: permanentSessions.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GENERATE TIMETABLE with IA
router.post("/genere-emploi", async (req, res) => {
  try {
    const etabId = req.headers["x-etab-id"] as string;
    const weeksCount = parseInt((req.body.weeksCount || req.query.weeks || "4").toString());
    
    if (!etabId) {
      res.status(400).json({ error: "Context d'établissement manquant." });
      return;
    }

    const result = await genererEmploiIA(etabId, weeksCount);
    res.json({ 
      success: result.success, 
      message: `${result.count} séances ont été priorisées sur ${weeksCount} semaines.`,
      count: result.count,
      anomalies: result.anomalies,
      conseils: result.conseils
    });
  } catch (error: any) {
    console.error("AI Generation Error:", error.message);
    res.status(500).json({ error: error.message || "Failed to run AI scheduler" });
  }
});

export default router;
