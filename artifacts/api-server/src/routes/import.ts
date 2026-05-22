import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

import { db } from "@workspace/db";
import {
  groupesTable,
  avancementsTable,
  modulesTable,
  stagiairesTable,
  notesModuleTable,
  importLogsTable,
} from "@workspace/db";
import {
  parseEtatXlsx,
  parsePvEfmPdf,
} from "../lib/parsers";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.post(
  "/import",
  upload.single("file"),
  async (req, res): Promise<void> => {
    const etablissementId = (req as any).etabId; 
    if (!req.file) {
      res.status(400).json({ success: false, errors: ["Fichier manquant"] });
      return;
    }

    const type = req.body.type as "etat" | "calendrier" | "pv_efm";
    let imported = 0;

    try {
      if (type === "etat") {
        const rows = parseEtatXlsx(req.file.buffer);
        for (const row of rows) {
          if (!row.groupe || !row.module) continue;
          let [groupe] = await db.select().from(groupesTable).where(and(eq(groupesTable.code, row.groupe), eq(groupesTable.etablissementId, etablissementId)));
          if (!groupe) {
             const m = row.groupe.match(/[A-Z]+(\d)/);
             const filiereCode = row.groupe.replace(/\d+$/, "");
             [groupe] = await db.insert(groupesTable).values({
               id: randomUUID(), code: row.groupe, annee: m ? parseInt(m[1]) : 1,
               mode: "R_PP", filiereCode, filiereNom: filiereCode, 
               statut: row.statut === "Actif" ? "Actif" : "Clôturé",
               etablissementId, anneeFormation: "2025/2026", niveau: "T"
             }).returning();
          }
          const allModules = await db.select().from(modulesTable).where(eq(modulesTable.etablissementId, etablissementId));
          let module = allModules.find(m => m.intitule === row.module);
          if (module) {
             await db.insert(avancementsTable).values({
               id: randomUUID(), groupeId: groupe.id, moduleId: module.id,
               moduleCode: module.code, moduleIntitule: module.intitule || "Module",
               mhGlobale: row.mhGlobale, mhRealise: row.mhRealise, tauxReel: row.tauxReel,
               etablissementId, sourceFile: req.file.originalname, importedAt: new Date()
             }).onConflictDoUpdate({
               target: [avancementsTable.groupeId, avancementsTable.moduleId],
               set: { mhRealise: row.mhRealise, tauxReel: row.tauxReel, importedAt: new Date() }
             });
          }
          imported++;
        }
      } else if (type === "pv_efm") {
        let pdfData;
        try {
          // 🛡️ Double wrap safety for bundled pdf-parse
          const parser = typeof pdfParse === "function" ? pdfParse : (pdfParse as any).default;
          pdfData = await parser(req.file.buffer);
        } catch (pdfErr: any) {
          logger.error({ pdfErr: pdfErr.message }, "PDF_READER_CRASH");
          throw new Error(`Échec de lecture du PDF: ${pdfErr.message}`);
        }
        
        if (!pdfData || !pdfData.text) {
          throw new Error("Le PDF semble vide ou illisible (OCR requis ?)");
        }

        const pvData = parsePvEfmPdf(pdfData.text);
        if (!pvData.groupe) throw new Error("Groupe non trouvé dans le texte du PV");

        let [groupe] = await db.select().from(groupesTable).where(and(eq(groupesTable.code, pvData.groupe), eq(groupesTable.etablissementId, etablissementId)));
        if (!groupe) throw new Error(`Groupe '${pvData.groupe}' inconnu dans ce centre.`);

        const allModules = await db.select().from(modulesTable).where(eq(modulesTable.etablissementId, etablissementId));
        
        // 🔍 Ultra-Smart Matching Logic
        const module = allModules.find(m => {
          const mCode = m.code.toUpperCase();
          const targetCode = (pvData.moduleCode || "").toUpperCase();
          const mIntitule = (m.intitule || "").toLowerCase();
          const targetIntitule = (pvData.moduleIntitule || "").toLowerCase();
          
          // 1. Match par code exact ou nettoyé
          if (mCode === targetCode || mCode.replace(/[^A-Z0-9]/g, "") === targetCode.replace(/[^A-Z0-9]/g, "")) return true;
          
          // 2. Match par titre (si le titre de la DB contient le titre du PDF ou vice-versa)
          if (targetIntitule.length > 5 && (mIntitule.includes(targetIntitule) || targetIntitule.includes(mIntitule))) return true;
          
          // 3. Match de secours par mot clé (Anglais, Français, Arabe, Sport...)
          const subjects = ["anglais", "français", "arabe", "sport", "culture", "analyse", "métier", "formation"];
          for (const s of subjects) {
            if (mIntitule.includes(s) && targetIntitule.includes(s)) return true;
          }
          
          return false;
        });

        if (!module) {
          throw new Error(`Module '${pvData.moduleIntitule}' (${pvData.moduleCode}) inconnu. Il n'est pas dans l'État d'avancement.`);
        }

        for (const s of pvData.stagiaires) {
          let [st] = await db.select().from(stagiairesTable).where(and(eq(stagiairesTable.cef, s.cef), eq(stagiairesTable.etablissementId, etablissementId)));
          if (!st) {
             const names = s.nomPrenom.split(" ");
             [st] = await db.insert(stagiairesTable).values({
               id: randomUUID(), cef: s.cef, nom: names[0] || "STAGIAIRE", prenom: names.slice(1).join(" ") || "...", etablissementId, groupeId: groupe.id
             }).returning();
          }
          await db.insert(notesModuleTable).values({
            id: randomUUID(), stagiaireId: st.id, cef: s.cef, moduleId: module.id, 
            moduleCode: module.code, moduleIntitule: module.intitule || "Module", cc: s.cc, efm: s.efm, 
            efmStatut: s.efmStatut, moyenneOff: s.moyenneOff, moyenneNorm: s.moyenneOff, 
            etablissementId, sourceFile: req.file.originalname, importedAt: new Date()
          }).onConflictDoUpdate({
            target: [notesModuleTable.cef, notesModuleTable.moduleId],
            set: { cc: s.cc, efm: s.efm, efmStatut: s.efmStatut, moyenneOff: s.moyenneOff, importedAt: new Date() }
          });
          imported++;
        }
      }
      res.json({ success: true, imported });
    } catch (err: any) {
      logger.error({ err: err.message }, "IMPORT_ERROR");
      res.status(500).json({ success: false, errors: [err.message] });
    }
  }
);

router.get("/import/logs", async (req, res) => {
  try {
    const etabId = (req as any).etabId;
    const logs = await db.select().from(importLogsTable).where(eq(importLogsTable.etablissementId, etabId)).limit(10);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ success: false, errors: [err.message] });
  }
});

export default router;
