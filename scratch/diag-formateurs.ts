import { db } from "../lib/db/src/index.ts";
import { formateursTable, etablissementsTable } from "../lib/db/src/schema/ofppt.ts";
import { eq } from "drizzle-orm";

async function diagFormateurs() {
  const etabId = "8d16718e-1f4a-4ed0-b701-8b62c430266f"; // CF NAHDA
  const trainers = await db.select().from(formateursTable).where(eq(formateursTable.etablissementId, etabId));
  const allTrainers = await db.select().from(formateursTable);

  console.log(`--- DIAGNOSTIC FORMATEURS ---`);
  console.log(`Total formateurs en base: ${allTrainers.length}`);
  console.log(`Formateurs rattachés à CF NAHDA: ${trainers.length}`);

  if (trainers.length === 0 && allTrainers.length > 0) {
    console.log("ALERTE: Vos formateurs existent mais sont rattachés à un autre centre !");
    console.log("Correction en cours : Rattachement de tous les formateurs à CF NAHDA...");
    await db.update(formateursTable).set({ etablissementId: etabId });
    console.log("Correction terminée !");
  } else if (allTrainers.length === 0) {
    console.log("ALERTE: Aucun formateur n'existe en base de données. Vous devez en importer !");
  }
  
  process.exit(0);
}

diagFormateurs();
