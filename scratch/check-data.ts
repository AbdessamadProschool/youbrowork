import { db } from "../lib/db/src/index.ts";
import { avancementsTable, groupesTable } from "../lib/db/src/schema/ofppt.ts";
import { eq } from "drizzle-orm";

async function check() {
  const etabId = "8d16718e-1f4a-4ed0-b701-8b62c430266f";
  const progress = await db.select().from(avancementsTable).where(eq(avancementsTable.etablissementId, etabId));
  const groups = await db.select().from(groupesTable).where(eq(groupesTable.etablissementId, etabId));

  console.log(`--- DIAGNOSTIC DATA ---`);
  console.log(`Groupes trouvés: ${groups.length}`);
  console.log(`Lignes d'avancement: ${progress.length}`);

  if (progress.length > 0) {
    const group1 = groups[0];
    const p1 = progress.filter(p => p.groupeId === group1.id);
    console.log(`Exemple Groupe [${group1.code}]: ${p1.length} modules en cours.`);
    p1.forEach(m => {
       const remaining = (m.mhGlobale || 0) - (m.mhRealise || 0);
       console.log(` - Module ${m.moduleId}: Reliquat ${remaining}h`);
    });
  }
  process.exit(0);
}

check();
