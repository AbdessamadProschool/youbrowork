import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse.js");
import { db } from "@workspace/db";
import {
  groupesTable,
  avancementsTable,
  modulesTable,
  stagiairesTable,
  notesModuleTable,
  calendriersTable,
  importLogsTable,
} from "@workspace/db";
import { ImportFileResponse, GetImportLogsResponse } from "@workspace/api-zod";
import {
  parseEtatXlsx,
  parseCalendrierXlsx,
  parsePvEfmPdf,
} from "../lib/parsers";
import { eq, sql, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  "/import",
  upload.single("file"),
  async (req, res): Promise<void> => {
    const startTime = Date.now();
    const etablissementId = (req as any).etabId; // Injected by tenantGuard

    if (!req.file) {
      res.status(400).json({ error: "Aucun fichier fourni" });
      return;
    }

    const type = req.body.type as "etat" | "calendrier" | "pv_efm";
    const niveau = (req.body.niveau as string)?.trim().toUpperCase() || undefined;

    if (!type || !["etat", "calendrier", "pv_efm"].includes(type)) {
      res.status(400).json({ error: "Type de fichier invalide" });
      return;
    }

    const warnings: string[] = [];
    const errors: string[] = [];
    let imported = 0;
    let updated = 0;

    try {
      if (type === "etat") {
        const rows = parseEtatXlsx(req.file.buffer);
        for (const row of rows) {
          if (!row.groupe || !row.module) continue;

          // 🛡️ BLOCK-002 FIX: FILTER BY etablissementId
          let [groupe] = await db
            .select()
            .from(groupesTable)
            .where(and(eq(groupesTable.code, row.groupe), eq(groupesTable.etablissementId, etablissementId)));

          if (!groupe) {
            const anneeMatch = row.groupe.match(/[A-Z]+(\d)/);
            const annee = anneeMatch ? parseInt(anneeMatch[1]) : 1;
            const filiereCode = row.groupe.replace(/\d+$/, "");

            [groupe] = await db
              .insert(groupesTable)
              .values({
                id: randomUUID(),
                code: row.groupe,
                annee,
                mode: "R_PP",
                filiereCode,
                filiereNom: filiereCode,
                statut: row.statut === "Actif" ? "Actif" : "Clôturé",
                anneeFormation: "2025/2026",
                niveau: niveau || "T",
                etablissementId,
              })
              .returning();
          }

          const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
          const allModulesForEtab = await db
            .select()
            .from(modulesTable)
            .where(and(eq(modulesTable.filiereCode, groupe.filiereCode), eq(modulesTable.etablissementId, etablissementId)));
            
          let module = allModulesForEtab.find(
            (m) => normalize(m.intitule) === normalize(row.module)
          );

          if (!module) {
            [module] = await db
              .insert(modulesTable)
              .values({
                id: randomUUID(),
                code: row.moduleCode || `MOD_${randomUUID().slice(0, 8)}`,
                intitule: row.module,
                mhGlobale: Math.round(row.mhGlobale),
                filiereCode: groupe.filiereCode,
                niveau: niveau || "T",
                etablissementId,
              })
              .returning();
          }

          const existing = await db
            .select()
            .from(avancementsTable)
            .where(and(
              eq(avancementsTable.groupeId, groupe.id),
              eq(avancementsTable.moduleId, module.id),
              eq(avancementsTable.etablissementId, etablissementId)
            ));

          if (existing.length > 0) {
            await db
              .update(avancementsTable)
              .set({
                mhGlobale: row.mhGlobale,
                mhRealise: row.mhRealise,
                tauxReel: row.tauxReel,
                nbSeancesVal: row.nbSeancesVal,
                sourceFile: req.file!.originalname,
                importedAt: new Date(),
              })
              .where(eq(avancementsTable.id, existing[0].id));
            updated++;
          } else {
            await db.insert(avancementsTable).values({
              id: randomUUID(),
              groupeId: groupe.id,
              moduleId: module.id,
              moduleCode: module.code,
              moduleIntitule: module.intitule,
              mhGlobale: row.mhGlobale,
              mhRealise: row.mhRealise,
              tauxReel: row.tauxReel,
              nbSeancesVal: row.nbSeancesVal,
              etablissementId,
              sourceFile: req.file!.originalname,
              importedAt: new Date(),
            });
          }
          imported++;
        }
      } else if (type === "pv_efm") {
        const data = await pdfParse(req.file.buffer);
        const pvData = parsePvEfmPdf(data.text);

        if (!pvData.groupe) {
          errors.push("Groupe non trouvé dans le PV");
          res.status(400).json({ success: false, errors });
          return;
        }

        let [groupe] = await db
          .select()
          .from(groupesTable)
          .where(and(eq(groupesTable.code, pvData.groupe), eq(groupesTable.etablissementId, etablissementId)));

        if (!groupe) {
           errors.push(`Groupe ${pvData.groupe} inconnu. Importez d'abord l'état d'avancement.`);
           res.status(400).json({ success: false, errors });
           return;
        }

        const allModules = await db.select().from(modulesTable).where(eq(modulesTable.etablissementId, etablissementId));
        const module = allModules.find(m => m.code === pvData.moduleCode || m.intitule === pvData.moduleIntitule);

        if (!module) {
           errors.push(`Module ${pvData.moduleIntitule} inconnu.`);
           res.status(400).json({ success: false, errors });
           return;
        }

        for (const s of pvData.stagiaires) {
           // 🛡️ BLOCK FIX: Search by CEF AND etablissementId
           let [stagiaire] = await db.select().from(stagiairesTable).where(and(
             eq(stagiairesTable.cef, s.cef),
             eq(stagiairesTable.etablissementId, etablissementId)
           ));

           if (!stagiaire) {
             const nameParts = s.nomPrenom.trim().split(/\s+/);
             [stagiaire] = await db.insert(stagiairesTable).values({
               id: randomUUID(),
               cef: s.cef,
               nom: nameParts[0] || "NOM",
               prenom: nameParts.slice(1).join(" ") || "PRENOM",
               groupeId: groupe.id,
               etablissementId,
             }).returning();
           }

           const existingNote = await db.select().from(notesModuleTable).where(and(
             eq(notesModuleTable.cef, s.cef),
             eq(notesModuleTable.moduleId, module.id),
             eq(notesModuleTable.etablissementId, etablissementId)
           ));

           if (existingNote.length > 0) {
             await db.update(notesModuleTable).set({
               cc: s.cc, efm: s.efm, efmStatut: s.efmStatut, moyenneOff: s.moyenneOff,
               sourceFile: req.file!.originalname, importedAt: new Date()
             }).where(eq(notesModuleTable.id, existingNote[0].id));
             updated++;
           } else {
             await db.insert(notesModuleTable).values({
               id: randomUUID(), stagiaireId: stagiaire.id, cef: s.cef,
               moduleId: module.id, moduleCode: module.code, moduleIntitule: module.intitule,
               cc: s.cc, efm: s.efm, efmStatut: s.efmStatut, moyenneOff: s.moyenneOff,
               etablissementId, sourceFile: req.file!.originalname, importedAt: new Date()
             });
           }
           imported++;
        }
      }

      res.json({ success: true, imported, updated, warnings, errors });
    } catch (err) {
      logger.error({ err }, "Import Error");
      res.status(500).json({ success: false, errors: [String(err)] });
    }
  }
);

router.get("/import/logs", async (req, res) => {
  const etabId = (req as any).etabId;
  const logs = await db.select().from(importLogsTable)
    .where(eq(importLogsTable.etablissementId, etabId))
    .orderBy(sql`${importLogsTable.createdAt} DESC`).limit(20);
  res.json(logs);
});

export default router;
