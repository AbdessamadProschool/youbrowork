import { Router, type IRouter } from "express";
import { genererEmploiIA } from "../lib/ia-engine";
import { db, emploisIaTable, formateursTable, modulesTable, sallesTable, groupesTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";

const router: IRouter = Router();

// LIST STORED AI TIMETABLE (Dynamic & Real)
router.get("/emplois-ia", async (req, res) => {
  try {
    const etabId = req.headers["x-etab-id"] as string;
    const { startDate, endDate } = req.query;

    if (!etabId) return res.status(400).json({ error: "Missing context" });

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
    .innerJoin(groupesTable, eq(emploisIaTable.groupeId, groupesTable.id))
    .innerJoin(formateursTable, eq(emploisIaTable.formateurId, formateursTable.id))
    .innerJoin(modulesTable, eq(emploisIaTable.moduleId, modulesTable.id))
    .innerJoin(sallesTable, eq(emploisIaTable.salleId, sallesTable.id));

    const conditions = [eq(emploisIaTable.etablissementId, etabId)];

    if (startDate) conditions.push(gte(emploisIaTable.date, startDate as string));
    if (endDate) conditions.push(lte(emploisIaTable.date, endDate as string));

    const data = await query.where(and(...conditions));

    res.json(data);
  } catch (error) {
    console.error("Fetch Timetable Error:", error);
    res.status(500).json({ error: "Failed to fetch real timetable" });
  }
});

// GENERATE TIMETABLE with IA
router.post("/genere-emploi", async (req, res) => {
  try {
    const etabId = req.headers["x-etab-id"] as string;
    const weeksCount = parseInt((req.query.weeks as string) || "4");
    
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
  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ error: "Failed to run AI scheduler" });
  }
});

export default router;
