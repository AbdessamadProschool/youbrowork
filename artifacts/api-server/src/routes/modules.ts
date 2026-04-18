import { Router } from "express";
import { db } from "@workspace/db";
import { modulesTable } from "@workspace/db";
import { GetModulesResponse } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/modules", async (req, res): Promise<void> => {
  const etablissementId = req.headers["x-etab-id"] as string | undefined;

  let query = db.select().from(modulesTable);
  if (etablissementId) {
    query = query.where(eq(modulesTable.etablissementId, etablissementId)) as any;
  }

  const modules = await query;
  res.json(
    GetModulesResponse.parse(
      modules.map((m) => ({
        id: m.id,
        code: m.code,
        intitule: m.intitule,
        mhGlobale: m.mhGlobale,
        filiereCode: m.filiereCode,
        niveau: m.niveau,
      }))
    )
  );
});

export default router;
