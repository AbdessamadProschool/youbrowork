import { db, etablissementsTable } from "./lib/db/src/index";

async function check() {
  try {
     console.log("Checking for establishments...");
     const list = await db.select().from(etablissementsTable);
     console.log("Found establishments:", list);
     if (list.length === 0) {
        console.log("No establishments found. Running seed...");
        // Re-import seed logic? 
     }
  } catch (error: any) {
     console.error("DB Error:", error.message);
  }
  process.exit();
}

check();
