import { Router } from "express";
import { db } from "@workspace/db";
import { calendriersTable } from "@workspace/db";
import { GetCalendrierResponse } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/calendrier", async (req, res): Promise<void> => {
  const calendrier = await db
    .select()
    .from(calendriersTable)
    .orderBy(sql`${calendriersTable.importedAt} DESC`)
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!calendrier) {
    res.json(
      GetCalendrierResponse.parse({
        id: null,
        typeCalendrier: null,
        totalJours: 0,
        joursRealises: 0,
        tauxTheorique: 0,
        dateReference: null,
        sourceFile: null,
      })
    );
    return;
  }

  res.json(
    GetCalendrierResponse.parse({
      id: calendrier.id,
      typeCalendrier: calendrier.typeCalendrier,
      totalJours: calendrier.totalJours,
      joursRealises: calendrier.joursRealises,
      tauxTheorique: calendrier.tauxTheorique,
      dateReference: calendrier.dateReference?.toISOString() ?? null,
      sourceFile: calendrier.sourceFile,
    })
  );
});

export default router;
