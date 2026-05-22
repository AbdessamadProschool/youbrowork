import { db } from "../lib/db/src/index.ts";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("--- MIGRATION CALENDRIER ---");
  try {
    // 1. Ajouter la colonne
    await db.execute(sql`ALTER TABLE calendriers ADD COLUMN IF NOT EXISTS etablissement_id TEXT`);
    console.log("✅ Colonne etablissement_id ajoutée.");

    // 2. Lier au centre actuel (CF NAHDA) pour ne pas perdre les données chargées
    const etabId = "8d16718e-1f4a-4ed0-b701-8b62c430266f";
    await db.execute(sql`UPDATE calendriers SET etablissement_id = ${etabId}`);
    console.log("✅ Calendrier existant rattaché au centre CF NAHDA.");

  } catch (e) {
    console.error("Erreur migration:", e.message);
  }
  process.exit(0);
}

migrate();
