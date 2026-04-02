import { Router } from "express";
import { db } from "@workspace/db";
import { modulesTable } from "@workspace/db";
import { GetModulesResponse } from "@workspace/api-zod";

const router = Router();

router.get("/modules", async (req, res): Promise<void> => {
  const modules = await db.select().from(modulesTable);
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
