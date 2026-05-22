import { db } from "../lib/db/src/index.ts";
import { emploisIaTable } from "../lib/db/src/schema/ofppt.ts";

async function purge() {
  console.log("Purge de la table IA...");
  await db.delete(emploisIaTable);
  console.log("Table IA vide !");
  process.exit(0);
}

purge();
