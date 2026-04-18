import { randomUUID } from "crypto";
import { db } from "@workspace/db";
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
} from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

async function seed() {
  console.log("Seeding database with Multi-Establishment support…");

  // ETABLISSEMENT SEED
  const etabId = randomUUID();
  const etabCheck = await db.select().from(etablissementsTable).limit(1);
  if (etabCheck.length === 0) {
    await db.insert(etablissementsTable).values({
      id: etabId,
      code: "CF_SAMMARA",
      nom: "Complexe de Formation Sammara",
      ville: "Sammara"
    });
    console.log("Inserted default establishment: CF SAMMARA");
  } else {
    // Re-use existing for seeding consistency
    const existingEtab = etabCheck[0].id;
    console.log("Using existing establishment:", etabCheck[0].nom);
  }

  const activeEtabId = etabCheck.length > 0 ? etabCheck[0].id : etabId;

  // FILIERE SEED
  const filiereCheck = await db.select().from(filieresTable).where(eq(filieresTable.code, "EB")).limit(1);
  if (filiereCheck.length === 0) {
    await db.insert(filieresTable).values({
      id: randomUUID(),
      code: "EB",
      nom: "Electricité de Bâtiment",
      etablissementId: activeEtabId
    });
  }

  // FORMATEURS SEED
  const formCount = await db.select().from(formateursTable).then(r => r.length);
  if (formCount === 0) {
    await db.insert(formateursTable).values([
      {
        id: randomUUID(),
        matricule: "F001",
        nom: "CHATTAR",
        prenom: "Abdessamad",
        specialite: "Electrique",
        type: "CAT_36",
        optionHeuresSup: true,
        etablissementId: activeEtabId
      },
      {
        id: randomUUID(),
        matricule: "F002",
        nom: "MEHDAOUI",
        prenom: "Driss",
        specialite: "Electrique",
        type: "CAT_26",
        optionHeuresSup: false,
        etablissementId: activeEtabId
      },
      {
        id: randomUUID(),
        matricule: "V001",
        nom: "RACHIDA",
        prenom: "Nadia",
        specialite: "EGQ",
        type: "VACATAIRE_ACTIF",
        etablissementId: activeEtabId
      }
    ]);
    console.log("Inserted formateurs linked to", activeEtabId);
  }

  // SALLES SEED
  const salleCount = await db.select().from(sallesTable).then(r => r.length);
  if (salleCount === 0) {
    await db.insert(sallesTable).values([
      { id: randomUUID(), nom: "AT ELEC 1", type: "ATELIER", capacite: 25, etablissementId: activeEtabId },
      { id: randomUUID(), nom: "AT ELEC 2", type: "ATELIER", capacite: 25, etablissementId: activeEtabId },
      { id: randomUUID(), nom: "Salle 102", type: "SALLE_COURS", capacite: 30, etablissementId: activeEtabId },
      { id: randomUUID(), nom: "Salle de Dessin", type: "SALLE_COURS", capacite: 20, etablissementId: activeEtabId },
    ]);
    console.log("Inserted salles linked to", activeEtabId);
  }

  const calCount = await db
    .select()
    .from(calendriersTable)
    .then((r) => r.length);

  if (calCount === 0) {
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
    console.log("Inserted calendrier");
  }

  const existing = await db
    .select()
    .from(groupesTable)
    .where(and(eq(groupesTable.code, "EB101"), eq(groupesTable.etablissementId, activeEtabId)));

  if (existing.length > 0) {
    console.log("Seed data already present for this etab, skipping.");
    return;
  }

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
    etablissementId: activeEtabId
  });
  console.log("Inserted groupe EB101");

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
      etablissementId: activeEtabId
    },
    {
      id: m102Id,
      code: "M102",
      intitule: "Lecture et interprétation des plans et devis",
      mhGlobale: 42,
      filiereCode: "EB",
      niveau: "S",
      estMetier: false,
      etablissementId: activeEtabId
    },
  ]);
  console.log("Inserted modules M101, M102");

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
      etablissementId: activeEtabId,
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
      etablissementId: activeEtabId,
      importedAt: new Date(),
    },
  ]);
  console.log("Inserted avancements");

  const stagiaires = [
    { cef: "1234567890001", nom: "ALAMI", prenom: "Mohamed" },
    { cef: "1234567890002", nom: "BENALI", prenom: "Fatima" },
    { cef: "1234567890003", nom: "CHRAIBI", prenom: "Youssef" },
    { cef: "1234567890004", nom: "DARKAOUI", prenom: "Khadija" },
    { cef: "1234567890005", nom: "ELHACHIMI", prenom: "Omar" },
    { cef: "1234567890006", nom: "FILALI", prenom: "Aicha" },
    { cef: "1234567890007", nom: "GUESSOUS", prenom: "Hamid" },
    { cef: "1234567890008", nom: "HAJJI", prenom: "Zineb" },
    { cef: "1234567890009", nom: "IDRISSI", prenom: "Rachid" },
    { cef: "1234567890010", nom: "JAIDI", prenom: "Samira" },
    { cef: "1234567890011", nom: "KADIRI", prenom: "Abdelilah" },
    { cef: "1234567890012", nom: "LAHRICHI", prenom: "Nadia" },
    { cef: "1234567890013", nom: "MANSOURI", prenom: "Said" },
    { cef: "1234567890014", nom: "NASSIRI", prenom: "Houda" },
    { cef: "1234567890015", nom: "OUALI", prenom: "Mustapha" },
    { cef: "1234567890016", nom: "QACIMI", prenom: "Loubna" },
    { cef: "1234567890017", nom: "RACHIDI", prenom: "Anas" },
    { cef: "1234567890018", nom: "SBAI", prenom: "Ghita" },
    { cef: "1234567890019", nom: "TAZI", prenom: "Soufiane" },
  ];

  const notesM101 = [
    { cc: 14.0, efm: 13.5 },
    { cc: 12.5, efm: 11.0 },
    { cc: 16.0, efm: 15.5 },
    { cc: 9.5, efm: 8.0 },
    { cc: 11.0, efm: 0, absent: true },
    { cc: 13.5, efm: 12.0 },
    { cc: 8.0, efm: 9.5 },
    { cc: 15.0, efm: 14.5 },
    { cc: 10.5, efm: 11.0 },
    { cc: 17.0, efm: 16.0 },
    { cc: 7.5, efm: 8.5 },
    { cc: 14.5, efm: 13.0 },
    { cc: 11.5, efm: 10.5 },
    { cc: 13.0, efm: 12.5 },
    { cc: 9.0, efm: 8.5 },
    { cc: 16.5, efm: 15.0 },
    { cc: 12.0, efm: 11.5 },
    { cc: 10.0, efm: 9.0 },
    { cc: 15.5, efm: 14.0 },
  ];

  const notesM102 = [
    { cc: 13.0, efm: 12.0 },
    { cc: 11.0, efm: 10.5 },
    { cc: 15.0, efm: 14.5 },
    { cc: 8.5, efm: 0, absent: true },
    { cc: 12.0, efm: 11.0 },
    { cc: 14.0, efm: 13.5 },
    { cc: 9.0, efm: 9.5 },
    { cc: 16.0, efm: 15.5 },
    { cc: 11.5, efm: 10.0 },
    { cc: 17.5, efm: 17.0 },
    { cc: 8.0, efm: 7.5 },
    { cc: 13.5, efm: 12.5 },
    { cc: 10.5, efm: 9.5 },
    { cc: 12.5, efm: 12.0 },
    { cc: 8.5, efm: 8.0 },
    { cc: 15.5, efm: 14.0 },
    { cc: 11.5, efm: 11.0 },
    { cc: 9.5, efm: 8.5 },
    { cc: 14.5, efm: 13.5 },
  ];

  for (let i = 0; i < stagiaires.length; i++) {
    const s = stagiaires[i];
    const stagId = randomUUID();
    await db.insert(stagiairesTable).values({
      id: stagId,
      cef: s.cef,
      nom: s.nom,
      prenom: s.prenom,
      groupeId,
      etablissementId: activeEtabId
    });

    const nm101 = notesM101[i];
    const efm101 = nm101.absent ? 0 : nm101.efm;
    const efmStatut101 = nm101.absent ? "ABSENT" : "PRESENT";
    const moy101 = (nm101.cc + efm101) / 3;
    const moyNorm101 = (nm101.cc + efm101 / 2) / 2;

    const nm102 = notesM102[i];
    const efm102 = nm102.absent ? 0 : nm102.efm;
    const efmStatut102 = nm102.absent ? "ABSENT" : "PRESENT";
    const moy102 = (nm102.cc + efm102) / 3;
    const moyNorm102 = (nm102.cc + efm102 / 2) / 2;

    await db.insert(notesModuleTable).values([
      {
        id: randomUUID(),
        stagiaireId: stagId,
        cef: s.cef,
        moduleId: m101Id,
        moduleCode: "M101",
        moduleIntitule: "Réalisation d'installations électriques des bâtiments résidentiels",
        cc: nm101.cc,
        efm: efm101,
        efmStatut: efmStatut101 as "PRESENT" | "ABSENT",
        moyenneOff: moy101,
        moyenneNorm: moyNorm101,
        sourceFile: "seed",
        importedAt: new Date(),
      },
      {
        id: randomUUID(),
        stagiaireId: stagId,
        cef: s.cef,
        moduleId: m102Id,
        moduleCode: "M102",
        moduleIntitule: "Lecture et interprétation des plans et devis",
        cc: nm102.cc,
        efm: efm102,
        efmStatut: efmStatut102 as "PRESENT" | "ABSENT",
        moyenneOff: moy102,
        moyenneNorm: moyNorm102,
        sourceFile: "seed",
        importedAt: new Date(),
      },
    ]);
  }

  console.log("Inserted 19 stagiaires and their notes");
  console.log("Seeding complete!");
}

seed().catch(console.error).finally(() => process.exit(0));
