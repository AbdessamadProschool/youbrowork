const fs = require('fs');
let code = fs.readFileSync('artifacts/api-server/src/lib/ia-engine.ts', 'utf8');

// 1. Threshold for orange regulation labeling
code = code.replace('.filter(a => a.ecart > 0.01) // Seuil de 1% au lieu de 5%', '.filter(a => a.ecart > 0.05) // Seuil de 5% pour tagguer "En retard" réel');

// 2. Sort availableProfs by hours before taking [0]
code = code.replace(
  '        if (availableProfs.length === 0) {',
  '        // Sort profs to load-balance assignments\n        availableProfs.sort((p1, p2) => (profHeures.get(p1.id) || 0) - (profHeures.get(p2.id) || 0));\n\n        if (availableProfs.length === 0) {'
);

// 3. Use moduleIntitule in anomalies
code = code.replace(
  'anomalies.push(`🔴 BLOCAGE : Le module [${currentModule.moduleCode}] est en retard, mais aucun formateur spécialisé n\\'est disponible.`);',
  'anomalies.push(`🔴 BLOCAGE : Le module [${currentModule.moduleIntitule}] est en retard, mais aucun formateur spécialisé n\\'est disponible.`);'
);
code = code.replace(
  'anomalies.push(`🔴 LOGISTIQUE : Impossible de planifier [${currentModule.moduleCode}], aucune salle de type [${typeRequis}] libre.`);',
  'anomalies.push(`🔴 LOGISTIQUE : Impossible de planifier [${currentModule.moduleIntitule}], aucune salle de type [${typeRequis}] libre.`);'
);

// Fix the other place where it pushes anomalies? Wait, I should make sure there aren't others.
// The user said "JE TE DIRE QUE LES MESSAGE AFFICHER EN HAUT DE EMPLOI DOIT AFFICHER LE NOM DE MODULE ET LA FILIERE".
// Let's add the filiere to the anomaly text as requested!
code = code.replace(
  /\[\$\{currentModule\.moduleIntitule\}\]/g, 
  '[${currentModule.moduleIntitule}] (${currentModule.filiereCode})'
);

fs.writeFileSync('artifacts/api-server/src/lib/ia-engine.ts', code);
console.log('Fixed ia-engine.ts part 2');
