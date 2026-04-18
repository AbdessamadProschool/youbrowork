import { genererEmploiIA } from "../src/lib/ia-engine";

async function testGeneration() {
  const etabId = "8d16718e-1f4a-4ed0-b701-8b62c430266f"; // CF NAHDA
  console.log("Generating for 4 weeks...");
  const result = await genererEmploiIA(etabId, 4);
  console.log("Result:", result);
}

testGeneration();
