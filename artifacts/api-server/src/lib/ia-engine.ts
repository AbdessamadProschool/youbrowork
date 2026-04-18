import { db, emploisIaTable, formateursTable, sallesTable, avancementsTable, modulesTable, calendriersTable, groupesTable, etablissementsTable } from "@workspace/db";
import { eq, and, sql, gte } from "drizzle-orm";
import crypto from "node:crypto";
import { suggererOptimisationsIA } from "./gemini";
import { logger } from "./logger";

// ⚙️ CONFIGURATION DES QUOTAS OFPPT
const QUOTAS = {
  VACATAIRE: 26,
  PERMANENT: 36,
  DEFAULT: 36
};

const DURATION_PER_SLOT = 2.5; // Heures par séance

/**
 * 🚀 MOTEUR DE GÉNÉRATION D'EMPLOIS DU TEMPS IA (OFPPT)
 * Version 4.1 : Sécurisée, Paramétrable et Optimisée
 */
export async function genererEmploiIA(etablissementId: string) {
  const anomalies: string[] = [];
  const startTime = Date.now();
  
  logger.info({ etablissementId }, "Lancement de la régulation IA...");

  // 1. Chargement des Données avec isolation stricte
  const formateurs = await db.select().from(formateursTable).where(
    and(
      eq(formateursTable.desiste, false),
      eq(formateursTable.etablissementId, etablissementId)
    )
  );
  
  const salles = await db.select().from(sallesTable).where(eq(sallesTable.etablissementId, etablissementId));
  const avancements = await db.select().from(avancementsTable).where(eq(avancementsTable.etablissementId, etablissementId));
  const calendriers = await db.select().from(calendriersTable).where(eq(calendriersTable.etablissementId, etablissementId));
  const groupes = await db.select().from(groupesTable).where(eq(groupesTable.etablissementId, etablissementId));
  const allModules = await db.select().from(modulesTable).where(eq(modulesTable.etablissementId, etablissementId));

  if (formateurs.length === 0 || salles.length === 0) {
    return { success: false, count: 0, anomalies: ["Ressources manquantes (Formateurs ou Salles)."], conseils: ["Importez vos ressources via l'onglet Import."] };
  }

  // 2. Nettoyage de l'existant futur (Isolation Garantie)
  const now = new Date();
  const dayMap: Record<string, number> = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 };
  const currentDayStr = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Africa/Casablanca' }).format(now);
  let startDay = dayMap[currentDayStr] || 1;
  if (startDay === 7) startDay = 1;

  await db.delete(emploisIaTable).where(
    and(
      eq(emploisIaTable.etablissementId, etablissementId),
      gte(emploisIaTable.jourSemaine, startDay)
    )
  );

  // 3. Occupation tracking & Quotas
  const profOccupations = new Set<string>();   
  const salleOccupations = new Set<string>();  
  const groupeOccupations = new Set<string>(); 
  const profWeeklyHours = new Map<string, number>();

  const getQuota = (f: any) => {
     const type = (f.type || "").toUpperCase();
     if (type.includes("VACATAIRE")) return QUOTAS.VACATAIRE;
     return QUOTAS.PERMANENT;
  };

  // 4. Initialisation des Groupes Actifs
  const activeGroupes = groupes.filter(g => g.statut === "Actif");
  const groupeInfos = activeGroupes.map(groupe => {
     const modules = avancements.filter(a => a.groupeId === groupe.id && (a.tauxReel || 0) < 1.0);
     return { groupe, modules, moduleIndex: 0 };
  }).filter(g => g.modules.length > 0);

  const SLOTS = [
    { debut: "08:30", fin: "11:00" },
    { debut: "11:00", fin: "13:30" },
    { debut: "13:30", fin: "16:00" },
    { debut: "16:00", fin: "18:30" },
  ];

  const planned: any[] = [];
  const normalization = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // 5. Boucle d'Interleaving
  for (let jour = startDay; jour <= 6; jour++) {
    for (const slot of SLOTS) {
      for (const gi of groupeInfos) {
        if (groupeOccupations.has(`${jour}-${slot.debut}-${gi.groupe.id}`)) continue;

        const currentMod = gi.modules[gi.moduleIndex % gi.modules.length];
        const mDetails = allModules.find(m => m.id === currentMod.moduleId);

        // Matching formateurs
        const matchingProfs = formateurs.filter(f => {
           if (profOccupations.has(`${jour}-${slot.debut}-${f.id}`)) return false;
           const hoursUsed = profWeeklyHours.get(f.id) || 0;
           if (hoursUsed + DURATION_PER_SLOT > getQuota(f)) return false;
           
           const spec = normalization(f.specialite);
           const modIntitule = normalization(currentMod.moduleIntitule);
           return modIntitule.includes(spec) || spec === "general";
        });

        if (matchingProfs.length === 0) continue;

        // Choix du prof le moins chargé
        matchingProfs.sort((a,b) => (profWeeklyHours.get(a.id)||0) - (profWeeklyHours.get(b.id)||0));
        const prof = matchingProfs[0];

        // Salle (simple isolation)
        const typeRequis = mDetails?.estMetier ? "ATELIER" : "SALLE_COURS";
        const salle = salles.find(s => s.type === typeRequis && !salleOccupations.has(`${jour}-${slot.debut}-${s.id}`)) 
                    || salles.find(s => !salleOccupations.has(`${jour}-${slot.debut}-${s.id}`));

        if (!salle) continue;

        planned.push({
          id: crypto.randomUUID(),
          etablissementId,
          groupeId: gi.groupe.id,
          formateurId: prof.id,
          moduleId: currentMod.moduleId,
          salleId: salle.id,
          jourSemaine: jour,
          heureDebut: slot.debut,
          heureFin: slot.fin,
          estForcé: true
        });

        profOccupations.add(`${jour}-${slot.debut}-${prof.id}`);
        salleOccupations.add(`${jour}-${slot.debut}-${salle.id}`);
        groupeOccupations.add(`${jour}-${slot.debut}-${gi.groupe.id}`);
        profWeeklyHours.set(prof.id, (profWeeklyHours.get(prof.id)||0) + DURATION_PER_SLOT);
        gi.moduleIndex++;
      }
    }
  }

  // 6. Persistence et Retour
  if (planned.length > 0) {
    await db.insert(emploisIaTable).values(planned);
  }

  const duration = Date.now() - startTime;
  logger.info({ count: planned.length, durationMs: duration }, "Génération IA terminée.");

  return { success: true, count: planned.length, anomalies, conseils: ["Optimisation complétée avec succès."] };
}
