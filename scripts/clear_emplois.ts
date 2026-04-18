import { db, emploisIaTable } from "@workspace/db";

async function clearEmplois() {
  console.log("Cleaning emplois_ia table...");
  try {
    await db.delete(emploisIaTable);
    console.log("Table cleared.");
  } catch (e) {
    console.error("Error (maybe col doesn't exist yet):", e);
  }
}

clearEmplois();
