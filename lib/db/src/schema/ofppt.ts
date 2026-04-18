import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  json,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const modeEnum = pgEnum("mode_enum", [
  "R_PP",
  "R_FF",
  "FPA_PP",
  "FPA_FF",
]);
export const efmStatutEnum = pgEnum("efm_statut_enum", ["PRESENT", "ABSENT"]);
export const importTypeEnum = pgEnum("import_type_enum", [
  "etat",
  "calendrier",
  "pv_efm",
]);

export const etablissementsTable = pgTable("etablissements", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  nom: text("nom").notNull(),
  ville: text("ville").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const filieresTable = pgTable("filieres", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  nom: text("nom").notNull(),
  etablissementId: text("etablissement_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const modulesTable = pgTable("modules", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  intitule: text("intitule").notNull(),
  mhGlobale: integer("mh_globale").notNull(),
  filiereCode: text("filiere_code").notNull(),
  niveau: text("niveau").notNull().default("S"),
  estMetier: boolean("est_metier").notNull().default(true),
  etablissementId: text("etablissement_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const groupesTable = pgTable("groupes", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  annee: integer("annee").notNull(),
  mode: modeEnum("mode").notNull(),
  filiereCode: text("filiere_code").notNull(),
  filiereNom: text("filiere_nom").notNull(),
  statut: text("statut").notNull().default("Actif"),
  niveau: text("niveau").notNull().default("T"),
  anneeFormation: text("annee_formation").notNull(),
  etablissementId: text("etablissement_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const stagiairesTable = pgTable("stagiaires", {
  id: text("id").primaryKey(),
  cef: text("cef").notNull().unique(),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  groupeId: text("groupe_id").notNull(),
  etablissementId: text("etablissement_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const avancementsTable = pgTable("avancements", {
  id: text("id").primaryKey(),
  groupeId: text("groupe_id").notNull(),
  moduleId: text("module_id").notNull(),
  moduleCode: text("module_code").notNull(),
  moduleIntitule: text("module_intitule").notNull(),
  mhGlobale: real("mh_globale").notNull(),
  mhRealise: real("mh_realise"),
  tauxReel: real("taux_reel"),
  nbSeancesVal: integer("nb_seances_val").notNull().default(0),
  nbSeancesEnCours: integer("nb_seances_en_cours").notNull().default(0),
  sourceFile: text("source_file").notNull(),
  etablissementId: text("etablissement_id"),
  importedAt: timestamp("imported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notesModuleTable = pgTable("notes_module", {
  id: text("id").primaryKey(),
  stagiaireId: text("stagiaire_id").notNull(),
  cef: text("cef").notNull(),
  moduleId: text("module_id").notNull(),
  moduleCode: text("module_code").notNull(),
  moduleIntitule: text("module_intitule").notNull(),
  cc: real("cc").notNull(),
  efm: real("efm").notNull(),
  efmStatut: efmStatutEnum("efm_statut").notNull(),
  moyenneOff: real("moyenne_off").notNull(),
  moyenneNorm: real("moyenne_norm").notNull(),
  sourceFile: text("source_file").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const calendriersTable = pgTable("calendriers", {
  id: text("id").primaryKey(),
  anneeFormation: text("annee_formation").notNull(),
  typeCalendrier: text("type_calendrier").notNull(),
  totalJours: integer("total_jours").notNull(),
  joursRealises: integer("jours_realises").notNull(),
  tauxTheorique: real("taux_theorique").notNull(),
  dateReference: timestamp("date_reference", { withTimezone: true }),
  jourDetails: json("jour_details"),
  sourceFile: text("source_file").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const stagiaireDisciplinesTable = pgTable("stagiaire_disciplines", {
  id: text("id").primaryKey(),
  cef: text("cef").notNull(),
  absencesCountAtValidation: integer("absences_count_at_validation").notNull(),
  validatedAt: timestamp("validated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const importLogsTable = pgTable("import_logs", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  type: importTypeEnum("type").notNull(),
  nbLignes: integer("nb_lignes").notNull().default(0),
  nbErreurs: integer("nb_erreurs").notNull().default(0),
  warnings: json("warnings").$type<string[]>().notNull().default([]),
  dureeMs: integer("duree_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const formateurTypeEnum = pgEnum("formateur_type_enum", [
  "CAT_36",
  "CAT_26",
  "VACATAIRE_RETRAITE",
  "VACATAIRE_ACTIF",
]);

export const salleTypeEnum = pgEnum("salle_type_enum", ["ATELIER", "SALLE_COURS"]);

export const formateursTable = pgTable("formateurs", {
  id: text("id").primaryKey(),
  matricule: text("matricule").notNull().unique(),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  specialite: text("specialite").notNull(),
  type: formateurTypeEnum("type").notNull(),
  optionHeuresSup: boolean("option_heures_sup").notNull().default(false),
  desiste: boolean("desiste").notNull().default(false),
  etablissementId: text("etablissement_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sallesTable = pgTable("salles", {
  id: text("id").primaryKey(),
  nom: text("nom").notNull().unique(),
  type: salleTypeEnum("type").notNull(),
  capacite: integer("capacite").notNull().default(30),
  etablissementId: text("etablissement_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const emploisIaTable = pgTable("emplois_ia", {
  id: text("id").primaryKey(),
  groupeId: text("groupe_id").notNull(),
  formateurId: text("formateur_id"),
  moduleId: text("module_id").notNull(),
  salleId: text("salle_id"),
  jourSemaine: integer("jour_semaine").notNull(), // 1=Lundi, 6=Samedi
  heureDebut: text("heure_debut").notNull(), // format "HH:mm"
  heureFin: text("heure_fin").notNull(),
  estForcé: boolean("est_force").notNull().default(false), // true si généré cause retard
  etablissementId: text("etablissement_id").notNull(),
  date: text("date").notNull(), // format "YYYY-MM-DD"
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const indisponibilitesTable = pgTable("indisponibilites", {
  id: text("id").primaryKey(),
  targetType: text("target_type").notNull(), // "FORMATEUR" | "SALLE"
  targetId: text("target_id").notNull(),
  dateDebut: timestamp("date_debut", { withTimezone: true }).notNull(),
  dateFin: timestamp("date_fin", { withTimezone: true }).notNull(),
  motif: text("motif"),
  etablissementId: text("etablissement_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertGroupeSchema = createInsertSchema(groupesTable).omit({
  createdAt: true,
});
export type Etablissement = typeof etablissementsTable.$inferSelect;
export type InsertGroupe = z.infer<typeof insertGroupeSchema>;
export type Groupe = typeof groupesTable.$inferSelect;
export type Stagiaire = typeof stagiairesTable.$inferSelect;
export type Avancement = typeof avancementsTable.$inferSelect;
export type NoteModule = typeof notesModuleTable.$inferSelect;
export type Calendrier = typeof calendriersTable.$inferSelect;
export type ImportLog = typeof importLogsTable.$inferSelect;
export type Module = typeof modulesTable.$inferSelect;
export type StagiaireDiscipline = typeof stagiaireDisciplinesTable.$inferSelect;
export type Formateur = typeof formateursTable.$inferSelect;
export type Salle = typeof sallesTable.$inferSelect;
export type EmploiIa = typeof emploisIaTable.$inferSelect;
export type Indisponibilite = typeof indisponibilitesTable.$inferSelect;
