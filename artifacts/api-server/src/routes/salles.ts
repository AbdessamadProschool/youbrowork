import { Router, type IRouter } from "express";
import { db, sallesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";

const router: IRouter = Router();

// GET salles filtered by establishment context
router.get("/salles", async (req, res) => {
  try {
    const etabId = req.headers["x-etab-id"] as string;
    if (!etabId) return res.status(401).json({ error: "No establishment context" });

    const list = await db.select().from(sallesTable).where(eq(sallesTable.etablissementId, etabId));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch salles" });
  }
});

// ADD/UPSERT salle in the active establishment silo
router.post("/salles", async (req, res) => {
  try {
    const { nom, type, capacite, etablissementId } = req.body;
    const finalEtabId = etablissementId || req.headers["x-etab-id"];

    if (!finalEtabId) return res.status(400).json({ error: "Establishment ID required" });

    const id = crypto.randomUUID();
    await db.insert(sallesTable).values({
      id,
      etablissementId: finalEtabId,
      nom: nom.toUpperCase(),
      type,
      capacite: parseInt(capacite) || 30,
    }).onConflictDoUpdate({
      target: sallesTable.nom,
      set: { type, capacite: parseInt(capacite) || 30 }
    });
    
    res.json({ success: true, id });
  } catch (error) {
    console.error("Salle Save Error:", error);
    res.status(500).json({ error: "Failed to save salle to silo" });
  }
});

// DELETE salle
router.delete("/salles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(sallesTable).where(eq(sallesTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Salle Delete Error:", error);
    res.status(500).json({ error: "Failed to delete salle" });
  }
});

export default router;
