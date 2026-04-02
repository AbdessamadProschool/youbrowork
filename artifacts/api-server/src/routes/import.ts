import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
// Use the internal lib to bypass the test-file read that runs at module init
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
import { eq, sql } from "drizzle-orm";
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

    if (!req.file) {
      res.status(400).json({ error: "Aucun fichier fourni" });
      return;
    }

    const type = req.body.type as "etat" | "calendrier" | "pv_efm";
    if (!type || !["etat", "calendrier", "pv_efm"].includes(type)) {
      res.status(400).json({ error: "Type de fichier invalide" });
      return;
    }

    const warnings: string[] = [];
    const errors: string[] = [];
    let imported = 0;

    try {
      if (type === "etat") {
        const rows = parseEtatXlsx(req.file.buffer);
        req.log.info({ rows: rows.length }, "Parsed etat xlsx rows");

        for (const row of rows) {
          if (!row.groupe || !row.module) {
            warnings.push(
              `Ligne ignorée: groupe ou module manquant (${row.groupe})`
            );
            continue;
          }

          let [groupe] = await db
            .select()
            .from(groupesTable)
            .where(eq(groupesTable.code, row.groupe));

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
                filiereNom:
                  filiereCode === "EB" ? "Electricité de Bâtiment" : filiereCode,
                statut: row.statut === "Actif" ? "Actif" : "Clôturé",
                anneeFormation: "2025/2026",
              })
              .returning();
          }

          let [module] = await db
            .select()
            .from(modulesTable)
            .where(eq(modulesTable.intitule, row.module));

          if (!module) {
            const moduleCodeMatch = row.module.match(/\(M(\d+)\)/);
            const code = moduleCodeMatch
              ? `M${moduleCodeMatch[1]}`
              : `M${Date.now()}`;

            [module] = await db
              .insert(modulesTable)
              .values({
                id: randomUUID(),
                code,
                intitule: row.module,
                mhGlobale: Math.round(row.mhGlobale),
                filiereCode: groupe.filiereCode,
                niveau: "S",
              })
              .returning();
          }

          if (row.tauxReel !== null && row.tauxReel > 1.07) {
            warnings.push(
              `Anomalie: taux réel ${(row.tauxReel * 100).toFixed(1)}% > 107% pour ${row.groupe} - ${row.module}`
            );
          }

          const existing = await db
            .select()
            .from(avancementsTable)
            .where(
              sql`${avancementsTable.groupeId} = ${groupe.id} AND ${avancementsTable.moduleId} = ${module.id}`
            );

          if (existing.length > 0) {
            await db
              .update(avancementsTable)
              .set({
                mhGlobale: row.mhGlobale,
                mhRealise: row.mhRealise,
                tauxReel: row.tauxReel,
                nbSeancesVal: row.nbSeancesVal,
                nbSeancesEnCours: row.nbSeancesEnCours,
                sourceFile: req.file!.originalname,
                importedAt: new Date(),
              })
              .where(eq(avancementsTable.id, existing[0].id));
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
              nbSeancesEnCours: row.nbSeancesEnCours,
              sourceFile: req.file!.originalname,
              importedAt: new Date(),
            });
          }

          imported++;
        }
      } else if (type === "calendrier") {
        const results = parseCalendrierXlsx(req.file.buffer);
        req.log.info({ results: results.length }, "Parsed calendrier xlsx");

        for (const cal of results) {
          const existing = await db
            .select()
            .from(calendriersTable)
            .where(
              sql`${calendriersTable.anneeFormation} = ${cal.anneeFormation} AND ${calendriersTable.typeCalendrier} = ${cal.typeCalendrier}`
            );

          if (existing.length > 0) {
            await db
              .update(calendriersTable)
              .set({
                totalJours: cal.totalJours,
                joursRealises: cal.joursRealises,
                tauxTheorique: cal.tauxTheorique,
                dateReference: cal.dateReference,
                jourDetails: cal.jourDetails,
                sourceFile: req.file!.originalname,
                importedAt: new Date(),
              })
              .where(eq(calendriersTable.id, existing[0].id));
          } else {
            await db.insert(calendriersTable).values({
              id: randomUUID(),
              anneeFormation: cal.anneeFormation,
              typeCalendrier: cal.typeCalendrier,
              totalJours: cal.totalJours,
              joursRealises: cal.joursRealises,
              tauxTheorique: cal.tauxTheorique,
              dateReference: cal.dateReference,
              jourDetails: cal.jourDetails,
              sourceFile: req.file!.originalname,
              importedAt: new Date(),
            });
          }
          imported++;
        }
      } else if (type === "pv_efm") {
        let pdfText = "";

        try {
          const data = await pdfParse(req.file.buffer);
          pdfText = data.text;
        } catch (e) {
          req.log.error({ err: e }, "Error parsing PDF");
          errors.push("Erreur lors de la lecture du PDF");
          res.json(
            ImportFileResponse.parse({
              success: false,
              imported: 0,
              warnings,
              errors,
              message: "Erreur de lecture du PDF",
            })
          );
          return;
        }

        const pvData = parsePvEfmPdf(pdfText);
        req.log.info(
          {
            groupe: pvData.groupe,
            module: pvData.moduleCode,
            stagiaires: pvData.stagiaires.length,
          },
          "PV EFM parsed"
        );

        if (!pvData.groupe) {
          errors.push("Groupe non détecté dans le PDF");
          res.json(
            ImportFileResponse.parse({
              success: false,
              imported: 0,
              warnings,
              errors,
              message: "Données invalides dans le PDF",
            })
          );
          return;
        }

        let [groupe] = await db
          .select()
          .from(groupesTable)
          .where(eq(groupesTable.code, pvData.groupe));

        if (!groupe) {
          const anneeMatch = pvData.groupe.match(/[A-Z]+(\d)/);
          const annee = anneeMatch ? parseInt(anneeMatch[1]) : 1;
          const filiereCode = pvData.groupe.replace(/\d+$/, "");

          [groupe] = await db
            .insert(groupesTable)
            .values({
              id: randomUUID(),
              code: pvData.groupe,
              annee,
              mode: "R_PP",
              filiereCode,
              filiereNom:
                filiereCode === "EB"
                  ? "Electricité de Bâtiment"
                  : pvData.filiere || filiereCode,
              statut: "Actif",
              anneeFormation: pvData.anneeFormation || "2025/2026",
            })
            .returning();
        }

        let [module] = await db
          .select()
          .from(modulesTable)
          .where(eq(modulesTable.code, pvData.moduleCode));

        if (!module) {
          [module] = await db
            .insert(modulesTable)
            .values({
              id: randomUUID(),
              code: pvData.moduleCode,
              intitule: pvData.moduleIntitule,
              mhGlobale: 0,
              filiereCode: groupe.filiereCode,
              niveau: "S",
            })
            .returning();
        }

        for (const s of pvData.stagiaires) {
          if (!/^\d{13,14}$/.test(s.cef)) {
            warnings.push(`CEF invalide: ${s.cef} — ligne ignorée`);
            continue;
          }

          const nameParts = s.nomPrenom.trim().split(/\s+/);
          const nom = nameParts[0] ?? "INCONNU";
          const prenom = nameParts.slice(1).join(" ") || "INCONNU";

          let [stagiaire] = await db
            .select()
            .from(stagiairesTable)
            .where(eq(stagiairesTable.cef, s.cef));

          if (!stagiaire) {
            [stagiaire] = await db
              .insert(stagiairesTable)
              .values({
                id: randomUUID(),
                cef: s.cef,
                nom,
                prenom,
                groupeId: groupe.id,
              })
              .returning();
          }

          const moyenneNorm = (s.cc + s.efm / 2) / 2;

          const existing = await db
            .select()
            .from(notesModuleTable)
            .where(
              sql`${notesModuleTable.cef} = ${s.cef} AND ${notesModuleTable.moduleId} = ${module.id}`
            );

          if (existing.length > 0) {
            await db
              .update(notesModuleTable)
              .set({
                cc: s.cc,
                efm: s.efm,
                efmStatut: s.efmStatut,
                moyenneOff: s.moyenneOff,
                moyenneNorm,
                sourceFile: req.file!.originalname,
                importedAt: new Date(),
              })
              .where(eq(notesModuleTable.id, existing[0].id));
          } else {
            await db.insert(notesModuleTable).values({
              id: randomUUID(),
              stagiaireId: stagiaire.id,
              cef: s.cef,
              moduleId: module.id,
              moduleCode: pvData.moduleCode,
              moduleIntitule: pvData.moduleIntitule,
              cc: s.cc,
              efm: s.efm,
              efmStatut: s.efmStatut,
              moyenneOff: s.moyenneOff,
              moyenneNorm,
              sourceFile: req.file!.originalname,
              importedAt: new Date(),
            });
          }

          imported++;
        }
      }

      const dureeMs = Date.now() - startTime;

      await db.insert(importLogsTable).values({
        id: randomUUID(),
        filename: req.file.originalname,
        type,
        nbLignes: imported,
        nbErreurs: errors.length,
        warnings,
        dureeMs,
      });

      res.json(
        ImportFileResponse.parse({
          success: errors.length === 0,
          imported,
          warnings,
          errors,
          message: `Import terminé: ${imported} enregistrements importés`,
        })
      );
    } catch (err) {
      req.log.error({ err }, "Import error");
      const dureeMs = Date.now() - startTime;

      await db.insert(importLogsTable).values({
        id: randomUUID(),
        filename: req.file.originalname,
        type,
        nbLignes: 0,
        nbErreurs: 1,
        warnings: [],
        dureeMs,
      });

      res.status(500).json({
        success: false,
        imported: 0,
        warnings: [],
        errors: [String(err)],
        message: "Erreur interne lors de l'import",
      });
    }
  }
);

router.get("/import/logs", async (req, res): Promise<void> => {
  const logs = await db
    .select()
    .from(importLogsTable)
    .orderBy(sql`${importLogsTable.createdAt} DESC`)
    .limit(50);

  res.json(
    GetImportLogsResponse.parse(
      logs.map((l) => ({
        id: l.id,
        filename: l.filename,
        type: l.type,
        nbLignes: l.nbLignes,
        nbErreurs: l.nbErreurs,
        warnings: (l.warnings as string[]) ?? [],
        dureeMs: l.dureeMs,
        createdAt: l.createdAt.toISOString(),
      }))
    )
  );
});

export default router;
