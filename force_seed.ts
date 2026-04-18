import { db } from "./lib/db/src/index";
import { sql } from "drizzle-orm";
import {
  groupesTable,
  modulesTable,
  stagiairesTable,
  avancementsTable,
  notesModuleTable,
  calendriersTable,
  formateursTable,
  sallesTable,
  etablissementsTable,
  filieresTable,
} from "./lib/db/src/schema/ofppt";
import { randomUUID } from "crypto";

async function forceSeed() {
  console.log("Wiping database for clean SAMMARA seed...");
  await db.execute(sql`TRUNCATE TABLE etablissements, filieres, formateurs, salles, groupes, modules, avancements, stagiaires, notes_module, calendriers CASCADE;`);

  console.log("DB wiped. Seeding Sammara...");

  const etabId = randomUUID();
  await db.insert(etablissementsTable).values({
    id: etabId,
    code: "CF_SAMMARA",
    nom: "Complexe de Formation Sammara",
    ville: "Sammara"
  });

  await db.insert(filieresTable).values({
    id: randomUUID(),
    code: "EB",
    nom: "Electricité de Bâtiment",
    etablissementId: etabId
  });

  await db.insert(formateursTable).values([
    {
      id: randomUUID(),
      matricule: "F001",
      nom: "CHATTAR",
      prenom: "Abdessamad",
      specialite: "Electrique",
      type: "CAT_36",
      optionHeuresSup: true,
      etablissementId: etabId
    },
    {
      id: randomUUID(),
      matricule: "F002",
      nom: "MEHDAOUI",
      prenom: "Driss",
      specialite: "Electrique",
      type: "CAT_26",
      optionHeuresSup: false,
      etablissementId: etabId
    },
    {
      id: randomUUID(),
      matricule: "V001",
      nom: "RACHIDA",
      prenom: "Nadia",
      specialite: "EGQ",
      type: "VACATAIRE_ACTIF",
      etablissementId: etabId
    }
  ]);

  await db.insert(sallesTable).values([
    { id: randomUUID(), nom: "AT ELEC 1", type: "ATELIER", capacite: 25, etablissementId: etabId },
    { id: randomUUID(), nom: "AT ELEC 2", type: "ATELIER", capacite: 25, etablissementId: etabId },
    { id: randomUUID(), nom: "Salle 102", type: "SALLE_COURS", capacite: 30, etablissementId: etabId },
    { id: randomUUID(), nom: "Salle de Dessin", type: "SALLE_COURS", capacite: 20, etablissementId: etabId },
  ]);

  await db.insert(calendriersTable).values({
    id: randomUUID(),
    anneeFormation: "2025/2026",
    typeCalendrier: "1A-CDJ",
    totalJours: 220,
    joursRealises: 126,
    tauxTheorique: 0.573,
    dateReference: new Date("2026-04-02"),
    jourDetails: [],
    sourceFile: "seed",
    importedAt: new Date(),
  });

  const groupeId = randomUUID();
  await db.insert(groupesTable).values({
    id: groupeId,
    code: "EB101",
    annee: 1,
    mode: "R_PP",
    filiereCode: "EB",
    filiereNom: "Electricité de Bâtiment",
    statut: "Actif",
    anneeFormation: "2025/2026",
    etablissementId: etabId
  });

  const m101Id = randomUUID();
  const m102Id = randomUUID();
  await db.insert(modulesTable).values([
    {
      id: m101Id,
      code: "M101",
      intitule: "Réalisation d'installations électriques des bâtiments résidentiels",
      mhGlobale: 70,
      filiereCode: "EB",
      niveau: "S",
      estMetier: true,
      etablissementId: etabId
    },
    {
      id: m102Id,
      code: "M102",
      intitule: "Lecture et interprétation des plans et devis",
      mhGlobale: 42,
      filiereCode: "EB",
      niveau: "S",
      estMetier: false,
      etablissementId: etabId
    },
  ]);

  await db.insert(avancementsTable).values([
    {
      id: randomUUID(),
      groupeId,
      moduleId: m101Id,
      moduleCode: "M101",
      moduleIntitule: "Réalisation d'installations électriques des bâtiments résidentiels",
      mhGlobale: 70,
      mhRealise: 35,
      tauxReel: 0.50,
      nbSeancesVal: 5,
      nbSeancesEnCours: 0,
      sourceFile: "seed",
      etablissementId: etabId,
      importedAt: new Date(),
    },
    {
      id: randomUUID(),
      groupeId,
      moduleId: m102Id,
      moduleCode: "M102",
      moduleIntitule: "Lecture et interprétation des plans et devis",
      mhGlobale: 42,
      mhRealise: 28,
      tauxReel: 0.667,
      nbSeancesVal: 4,
      nbSeancesEnCours: 1,
      sourceFile: "seed",
      etablissementId: etabId,
      importedAt: new Date(),
    },
  ]);

  console.log("Data inserted for SAMMARA! Ready to go.");
  process.exit(0);
}

forceSeed().catch(console.error);
