import { db, stagiairesTable, notesModuleTable, avancementsTable, modulesTable, groupesTable, formateursTable, sallesTable, filieresTable, etablissementsTable, calendriersTable, importLogsTable, emploisIaTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function reset() {
  console.log("⚠️ Resetting database (Truncating all tables)...");
  
  try {
    // Truncate in reverse order of dependencies
    await db.execute(sql`TRUNCATE TABLE ${emploisIaTable} CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${notesModuleTable} CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${avancementsTable} CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${stagiairesTable} CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${modulesTable} CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${groupesTable} CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${formateursTable} CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${sallesTable} CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${filieresTable} CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${etablissementsTable} CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${calendriersTable} CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${importLogsTable} CASCADE`);
    
    console.log("✅ Database successfully cleared.");
  } catch (err) {
    console.error("❌ Error resetting database:", err);
  } finally {
    process.exit(0);
  }
}

reset();
