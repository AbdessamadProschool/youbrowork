import { db } from "../lib/db/src/index.ts";
import { sallesTable } from "../lib/db/src/schema/ofppt.ts";
import { eq } from "drizzle-orm";

async function diagSalles() {
  const etabId = "8d16718e-1f4a-4ed0-b701-8b62c430266f";
  const rooms = await db.select().from(sallesTable).where(eq(sallesTable.etablissementId, etabId));
  const allRooms = await db.select().from(sallesTable);

  console.log(`--- DIAGNOSTIC SALLES ---`);
  console.log(`Total salles en base: ${allRooms.length}`);
  console.log(`Salles rattachées à CF NAHDA: ${rooms.length}`);

  if (rooms.length === 0 && allRooms.length > 0) {
     console.log("Correction : Rattachement des salles à CF NAHDA...");
     await db.update(sallesTable).set({ etablissementId: etabId });
  } else if (allRooms.length === 0) {
     console.log("ALERTE: Aucune salle n'existe !");
     console.log("Création de salles par défaut (SALLE01, AT-ELEC)...");
     await db.insert(sallesTable).values([
       { id: "s1", nom: "SALLE01", type: "SALLE_COURS", etablissementId: etabId },
       { id: "s2", nom: "AT-ELEC", type: "ATELIER", etablissementId: etabId }
     ]);
  }
  process.exit(0);
}

diagSalles();
