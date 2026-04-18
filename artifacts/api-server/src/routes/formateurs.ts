import { Router, type IRouter } from "express";
import { db, formateursTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

const router: IRouter = Router();

// GET all formateurs filtered by establishment
router.get("/formateurs", async (req, res) => {
  try {
    const etabId = req.headers["x-etab-id"] as string;
    if (!etabId) return res.status(401).json({ error: "No establishment context" });

    const list = await db.select().from(formateursTable).where(eq(formateursTable.etablissementId, etabId));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch formateurs" });
  }
});

// ADD/UPSERT formateur
router.post("/formateurs", async (req, res) => {
  try {
    const { matricule, nom, prenom, specialite, type, optionHeuresSup, etablissementId } = req.body;
    const finalEtabId = etablissementId || req.headers["x-etab-id"];

    if (!finalEtabId) return res.status(400).json({ error: "Establishment ID required" });

    const id = crypto.randomUUID();
    await db.insert(formateursTable).values({
      id,
      etablissementId: finalEtabId,
      matricule,
      nom,
      prenom,
      specialite,
      type,
      optionHeuresSup: !!optionHeuresSup,
    }).onConflictDoUpdate({
      target: formateursTable.matricule,
      set: { nom, prenom, specialite, type, etablissementId: finalEtabId, optionHeuresSup: !!optionHeuresSup }
    });
    res.json({ success: true, id });
  } catch (error) {
    console.error("Formateur Save Error:", error);
    res.status(500).json({ error: "Failed to save formateur" });
  }
});

// MARK DESISTEMENT (Trigger Alert)
router.patch("/formateurs/:id/desiste", async (req, res) => {
  try {
    const { id } = req.params;
    const { desiste } = req.body;
    await db.update(formateursTable)
      .set({ desiste: !!desiste })
      .where(eq(formateursTable.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update desiste status" });
  }
});

// DELETE formateur
router.delete("/formateurs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(formateursTable).where(eq(formateursTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Formateur Delete Error:", error);
    res.status(500).json({ error: "Failed to delete formateur" });
  }
});

export default router;
