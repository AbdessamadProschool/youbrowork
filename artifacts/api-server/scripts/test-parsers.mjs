import { parsePvEfmPdf } from "../dist/index.mjs";

const samplePv = `Etablissement: Centre Test
Filiere: Électricité
Année de formation: 2024/2025
Groupe de formation: EB12
Intitulé du Module: Installation électrique (M101)
Inscrits: 3
Présents: 2
Absents: 1

2009052100036ABBID HAMZA18.0029.0015.67
2009042900033BASSADDOUG DRISS14.00Absent4.67
2009052100037DOE JOHN17.0030.0015.67
`;

console.log("=== Running parsePvEfmPdf sample ===");
const pv = parsePvEfmPdf(samplePv);
console.log(JSON.stringify(pv, null, 2));

console.log("=== Done ===");
