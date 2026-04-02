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

export const filieresTable = pgTable("filieres", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  nom: text("nom").notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const groupesTable = pgTable("groupes", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  annee: integer("annee").notNull(),
  mode: modeEnum("mode").notNull(),
  filiereCode: text("filiere_code").notNull(),
  filiereNom: text("filiere_nom").notNull(),
  statut: text("statut").notNull().default("Actif"),
  anneeFormation: text("annee_formation").notNull(),
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

export const insertGroupeSchema = createInsertSchema(groupesTable).omit({
  createdAt: true,
});
export type InsertGroupe = z.infer<typeof insertGroupeSchema>;
export type Groupe = typeof groupesTable.$inferSelect;
export type Stagiaire = typeof stagiairesTable.$inferSelect;
export type Avancement = typeof avancementsTable.$inferSelect;
export type NoteModule = typeof notesModuleTable.$inferSelect;
export type Calendrier = typeof calendriersTable.$inferSelect;
export type ImportLog = typeof importLogsTable.$inferSelect;
export type Module = typeof modulesTable.$inferSelect;
export type StagiaireDiscipline = typeof stagiaireDisciplinesTable.$inferSelect;
