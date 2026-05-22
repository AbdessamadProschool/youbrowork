import { db } from "../lib/db/src/index.ts";
import { sql } from "drizzle-orm";

async function inspectTable() {
  console.log("--- INSPECTION TABLE CALENDRIERS ---");
  try {
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'calendriers'
    `);
    
    if (res.rows.length === 0) {
      console.log("ALERTE: La table 'calendriers' n'existe pas ou est vide !");
    } else {
      res.rows.forEach(row => {
        console.log(` - Colonne: [${row.column_name}] | Type: ${row.data_type}`);
      });
    }
  } catch (e) {
    console.error("Erreur lors de l'inspection:", e.message);
  }
  process.exit(0);
}

inspectTable();
