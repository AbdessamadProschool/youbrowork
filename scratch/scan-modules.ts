import { db } from "../lib/db/src/index.ts";
import { modulesTable } from "../lib/db/src/schema/ofppt.ts";
import { eq } from "drizzle-orm";

async function list() {
  const etabId = "8d16718e-1f4a-4ed0-b701-8b62c430266f";
  const modules = await db.select().from(modulesTable).where(eq(modulesTable.etablissementId, etabId));
  console.log("--- LISTE DES MODULES ---");
  modules.forEach(m => console.log(`[${m.code}] ${m.intitule}`));
  process.exit(0);
}

list();
