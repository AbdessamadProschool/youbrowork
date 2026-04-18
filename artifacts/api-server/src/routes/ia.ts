import { Router, type IRouter } from "express";
import { genererEmploiIA } from "../lib/ia-engine";
import { db, emploisIaTable, formateursTable, modulesTable, sallesTable, groupesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// LIST STORED AI TIMETABLE (Dynamic & Real)
router.get("/emplois-ia", async (req, res) => {
  try {
    const etabId = req.headers["x-etab-id"] as string;
    if (!etabId) return res.status(400).json({ error: "Missing context" });

    // Join to get human-readable names instead of raw IDs
    const data = await db.select({
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
      estForcé: emploisIaTable.estForcé
    })
    .from(emploisIaTable)
    .innerJoin(groupesTable, eq(emploisIaTable.groupeId, groupesTable.id))
    .innerJoin(formateursTable, eq(emploisIaTable.formateurId, formateursTable.id))
    .innerJoin(modulesTable, eq(emploisIaTable.moduleId, modulesTable.id))
    .innerJoin(sallesTable, eq(emploisIaTable.salleId, sallesTable.id))
    .where(eq(emploisIaTable.etablissementId, etabId));

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch real timetable" });
  }
});

// GENERATE TIMETABLE with IA
router.post("/genere-emploi", async (req, res) => {
  try {
    const etabId = req.headers["x-etab-id"] as string;
    
    if (!etabId) {
      res.status(400).json({ error: "Context d'établissement manquant pour la génération IA." });
      return;
    }

    const result = await genererEmploiIA(etabId);
    res.json({ 
      success: result.success, 
      message: `${result.count} séances ont été priorisées.`,
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
