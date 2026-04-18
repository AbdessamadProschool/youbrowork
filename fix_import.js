const fs = require('fs');
let code = fs.readFileSync('artifacts/api-server/src/routes/import.ts', 'utf8');

// Add "and" to import
if (!code.includes('and } from "drizzle-orm"')) {
    code = code.replace('import { eq, sql } from "drizzle-orm";', 'import { eq, sql, and } from "drizzle-orm";');
}

// Add etablissementId
const destHeader = `    const etablissementId = req.headers["x-etab-id"] as string | undefined;
    if (!etablissementId) {
      res.status(400).json({ error: "etablissementId manquant (header x-etab-id)" });
      return;
    }
    const type = req.body.type as "etat" | "calendrier" | "pv_efm";`;
code = code.replace('const type = req.body.type as "etat" | "calendrier" | "pv_efm";', destHeader);

// Fix groupesTable lookups
code = code.replace(/eq\(groupesTable\.code, row\.groupe\)/g, 'and(eq(groupesTable.code, row.groupe), eq(groupesTable.etablissementId, etablissementId))');
code = code.replace(/eq\(groupesTable\.code, pvData\.groupe\)/g, 'and(eq(groupesTable.code, pvData.groupe), eq(groupesTable.etablissementId, etablissementId))');

// Fix modulesTable lookups
code = code.replace(/eq\(modulesTable\.filiereCode, groupe\.filiereCode\)/g, 'and(eq(modulesTable.filiereCode, groupe.filiereCode), eq(modulesTable.etablissementId, etablissementId))');

// Inject etablissementId in inserts
code = code.replace(/niveau: niveau \|\| "T",(\s+})\)/g, 'niveau: niveau || "T",\netablissementId,$1)');

code = code.replace(/anneeFormation: "2025\/2026",\n                niveau: niveau \|\| "T",\n              }\)/g, 'anneeFormation: "2025/2026",\n                niveau: niveau || "T",\n                etablissementId,\n              })');

code = code.replace(/sourceFile: req\.file!\.originalname,\n              importedAt: new Date\(\),\n            }\);/g, 'sourceFile: req.file!.originalname,\n              importedAt: new Date(),\n              etablissementId,\n            });');

code = code.replace(/importedAt: new Date\(\),\n        }\);/g, 'importedAt: new Date(),\n          etablissementId,\n        });');

fs.writeFileSync('artifacts/api-server/src/routes/import.ts', code);
console.log('Fixed import.ts');
