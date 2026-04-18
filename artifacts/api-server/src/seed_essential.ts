import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  formateursTable,
  sallesTable,
  etablissementsTable,
  filieresTable,
} from "@workspace/db";

async function seedEssential() {
  console.log("Seeding essential infrastructure data...");

  const etabId = randomUUID();
  await db.insert(etablissementsTable).values([
    {
      id: etabId,
      code: "CF_SAMMARA",
      nom: "Complexe de Formation Sammara",
      ville: "Sammara"
    },
    {
      id: randomUUID(),
      code: "ENNAHDA",
      nom: "DRO / CFI / CQP ENNAHDA",
      ville: "Oujda"
    }
  ]);
  console.log("Inserted establishments.");

  await db.insert(filieresTable).values([
    { id: randomUUID(), code: "EB", nom: "Electricité de Bâtiment", etablissementId: etabId },
    { id: randomUUID(), code: "EIT", nom: "Electromécanique des Systèmes Automatisés", etablissementId: etabId }
  ]);

  await db.insert(formateursTable).values([
    { id: randomUUID(), matricule: "F001", nom: "CHATTAR", prenom: "Abdessamad", specialite: "Electrique", type: "CAT_36", optionHeuresSup: true, etablissementId: etabId },
    { id: randomUUID(), matricule: "F002", nom: "MEHDAOUI", prenom: "Driss", specialite: "Electrique", type: "CAT_26", optionHeuresSup: false, etablissementId: etabId }
  ]);

  await db.insert(sallesTable).values([
    { id: randomUUID(), nom: "AT ELEC 1", type: "ATELIER", capacite: 25, etablissementId: etabId },
    { id: randomUUID(), nom: "AT ELEC 2", type: "ATELIER", capacite: 25, etablissementId: etabId },
    { id: randomUUID(), nom: "Salle 102", type: "SALLE_COURS", capacite: 30, etablissementId: etabId },
  ]);
  console.log("Essential seed complete!");
}

seedEssential().catch(console.error).finally(() => process.exit(0));
