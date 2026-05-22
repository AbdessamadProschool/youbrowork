import { db } from "../lib/db/src/index.ts";
import { sql } from "drizzle-orm";

async function setup() {
  console.log("--- SETUP PERMANENT TABLE ---");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS emplois (
        id TEXT PRIMARY KEY,
        groupe_id TEXT NOT NULL,
        formateur_id TEXT,
        module_id TEXT NOT NULL,
        salle_id TEXT,
        jour_semaine INTEGER NOT NULL,
        heure_debut TEXT NOT NULL,
        heure_fin TEXT NOT NULL,
        type TEXT DEFAULT 'NORMAL',
        etablissement_id TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Table 'emplois' prête.");
  } catch (e) {
    console.error("Erreur:", e.message);
  }
  process.exit(0);
}

setup();
