import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * CONSEILLER PÉDAGOGIQUE VIRTUEL (IA GEMINI)
 * Analyse l'équilibre des journées pour éviter le surmenage.
 */
export async function suggererOptimisationsIA(etabNom: string, data: any) {
  if (!genAI) {
    logger.warn("Gemini API Key missing. Returning fallback suggestions.");
    return [
      "💡 [IA Désactivée] Veuillez poser votre GOLD_API_KEY dans le .env pour activer les prédictions."
    ];
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      Tu es l'Expert-Conseiller Pédagogique de l'OFPPT Régional. 
      Établissement : ${etabNom}.
      Analyse ce planning de rattrapage (format JSON) : ${JSON.stringify(data)}
      
      Ta mission : 
      1. Identifie si des formateurs ont trop d'heures consécutives sans pause (Fatigue).
      2. Suggère 2 à 3 ajustements prioritaires pour le confort des profs et des stagiaires.
      3. Réponds de façon succincte, professionnelle et en français.
      
      Format : Liste à puces de 3 points maximum.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return [text];
  } catch (error) {
    logger.error({ error }, "Gemini AI Prediction Error");
    return ["⚠️ Une erreur est survenue lors de l'analyse IA."];
  }
}
