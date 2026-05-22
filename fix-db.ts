import { db } from "./lib/db/src/index.ts";
import { sql } from "drizzle-orm";

async function fix() {
  console.log("🛠️ Application de la contrainte d'unicité finale...");
  try {
    // 🛡️ Cette règle permet au "ON CONFLICT" de fonctionner
    await db.execute(sql`ALTER TABLE notes_module DROP CONSTRAINT IF EXISTS unique_cef_module`);
    await db.execute(sql`ALTER TABLE notes_module ADD CONSTRAINT unique_cef_module UNIQUE (cef, module_id)`);
    console.log("✅ SUCCÈS : La base de données est maintenant prête pour les mises à jour de notes !");
  } catch (err: any) {
    console.error("❌ ERREUR :", err.message);
  }
  process.exit(0);
}

fix();
