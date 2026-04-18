import { Router, type IRouter } from "express";
import { db, etablissementsTable } from "@workspace/db";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

// GET ALL ESTABLISHMENTS
router.get("/etablissements", async (req, res) => {
  try {
    const list = await db.select().from(etablissementsTable);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch establishments" });
  }
});

// CREATE (For admin setup)
router.post("/etablissements", async (req, res) => {
  try {
    const { id, code, nom, ville } = req.body;
    await db.insert(etablissementsTable).values({
      id: id || randomUUID(),
      code,
      nom,
      ville
    });
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to create establishment" });
  }
});

export default router;
