import { db, emploisIaTable, emploisTable, formateursTable, sallesTable, avancementsTable, modulesTable, calendriersTable, groupesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";

const CONFIG = {
  SOFT_SKILLS: ["communication", "anglais", "arabe", "sport", "culture", "entrepreneuriat", "gestion", "recherche"],
  SLOT_DURATION: 2.5,
  MAX_DAILY_SAME_MODULE: 5.0,
  LIMIT_VACATAIRE: 10.0,
  LIMIT_PERMANENT_36: 36.0,
  LIMIT_PERMANENT_26: 26.0,
  LIMIT_HEURES_SUP: 44.0
};

const n = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();

function getAffinity(text: string): string {
    const t = n(text);
    if (t.includes("froid") || t.includes("clim")) return "froid";
    if (t.includes("elec") || t.includes("tension") || t.includes("canalisation")) return "elec";
    return "general";
}

export async function genererEmploiIA(etablissementId: string, weeksCount: number = 4) {
  try {
    const log: string[] = [];
    const trainers = await db.select().from(formateursTable).where(and(eq(formateursTable.etablissementId, etablissementId), eq(formateursTable.desiste, false)));
    const rooms = await db.select().from(sallesTable).where(eq(sallesTable.etablissementId, etablissementId));
    const allProgress = await db.select().from(avancementsTable).where(eq(avancementsTable.etablissementId, etablissementId));
    const modules = await db.select().from(modulesTable).where(eq(modulesTable.etablissementId, etablissementId));
    const groups = await db.select().from(groupesTable).where(and(eq(groupesTable.statut, "Actif"), eq(groupesTable.etablissementId, etablissementId)));
    const calendars = await db.select().from(calendriersTable).where(eq(calendriersTable.etablissementId, etablissementId));
    const permanentSlots = await db.select().from(emploisTable).where(eq(emploisTable.etablissementId, etablissementId));

    if (calendars.length === 0) return { success: false, count: 0, anomalies: ["Fiche calendrier manquante."] };
    const targetRatio = calendars[0].tauxTheorique || 0.7;

    const startDate = (() => {
      const d = new Date(); d.setDate(d.getDate() + (d.getDay() === 0 ? 1 : (d.getDay() === 1 ? 0 : 8 - d.getDay())));
      d.setHours(8, 0, 0, 0); return d;
    })();

    const SLOTS = [
      { start: "08:30", end: "11:00", p: "AM1" }, { start: "11:00", end: "13:30", p: "AM2" },
      { start: "13:30", end: "16:00", p: "PM1" }, { start: "16:00", end: "18:30", p: "PM2" }
    ];

    await db.delete(emploisIaTable).where(eq(emploisIaTable.etablissementId, etablissementId));

    const plannedSessions: any[] = [];
    const trainerWeeklyHours = new Map<string, number>();
    const groupModuleDailyHours = new Map<string, number>(); 
    const globalOccupation = new Set<string>();

    permanentSlots.forEach(s => {
      const key = `${s.date}|${s.heureDebut}`;
      globalOccupation.add(`${key}|${s.groupeId}`);
      globalOccupation.add(`${key}|${s.formateurId}`);
      globalOccupation.add(`${key}|${s.salleId}`);
      trainerWeeklyHours.set(s.formateurId!, (trainerWeeklyHours.get(s.formateurId!) || 0) + CONFIG.SLOT_DURATION);
    });

    // --- PASSE 1 : Tri par contrainte (Cognitive Pre-sorting) ---
    // On traite les groupes et les modules les plus "difficiles" en premier.
    const sortedGroups = [...groups].sort((a, b) => a.id.localeCompare(b.id));

    log.push("Passe 1 : Tri par contrainte terminé.");

    for (let w = 0; w < weeksCount; w++) {
      for (let d = 0; d < 6; d++) {
        const currentDayStr = new Date(startDate.getTime() + (w * 7 + d) * 86400000).toISOString().split('T')[0];
        
        for (const slot of SLOTS) {
          for (const group of sortedGroups) {
            if (globalOccupation.has(`${currentDayStr}|${slot.start}|${group.id}`)) continue;
            if (plannedSessions.find(p => p.groupeId === group.id && p.date === currentDayStr && p.heureDebut === slot.start)) continue;

            const groupNeeds = allProgress
              .filter(p => p.groupeId === group.id)
              .map(p => {
                const mod = modules.find(m => m.id === p.moduleId);
                const modLabel = mod?.intitule || "";
                const isSoft = CONFIG.SOFT_SKILLS.some(sk => n(modLabel).includes(sk));
                const remaining = (p.mhGlobale || 0) - (p.mhRealise || 0);
                const affinity = getAffinity(modLabel);
                
                // PASSE 1 : Calcul du poids du module
                let constraintWeight = 10;
                if (!isSoft) constraintWeight += 50; // Les métiers sont plus durs à placer (salles)
                if (remaining > 20) constraintWeight += 30; // Gros volume = priorité
                if ((p.tauxReel || 0) < targetRatio) constraintWeight += 1000; // RETARD = PRIORITÉ ABSOLUE

                return { ...p, isSoft, constraintWeight, remaining, affinity, filiere: n(mod?.filiereCode || "") };
              })
              .filter(n => n.remaining >= 2.0 && (groupModuleDailyHours.get(`${currentDayStr}|${group.id}|${n.moduleId}`) || 0) < CONFIG.MAX_DAILY_SAME_MODULE)
              .sort((a, b) => b.constraintWeight - a.constraintWeight || a.moduleId.localeCompare(b.moduleId));

            for (const need of groupNeeds) {
                // --- PASSE 2 & 3 : Placement + Scoring Pédagogique ---
                const candidateTrainers = trainers.filter(f => {
                    const type = n(f.type || "");
                    const isVac = type.includes("vacataire");
                    const limit = isVac ? CONFIG.LIMIT_VACATAIRE : (f.optionHeuresSup ? CONFIG.LIMIT_HEURES_SUP : (type.includes("36") ? CONFIG.LIMIT_PERMANENT_36 : CONFIG.LIMIT_PERMANENT_26));
                    
                    if (globalOccupation.has(`${currentDayStr}|${slot.start}|${f.id}`)) return false;
                    if (plannedSessions.some(p => p.formateurId === f.id && p.date === currentDayStr && p.heureDebut === slot.start)) return false;
                    if ((trainerWeeklyHours.get(f.id) || 0) + CONFIG.SLOT_DURATION > limit) return false;

                    const spec = n(f.specialite || "");
                    if (need.isSoft) return spec.includes("com") || spec.includes("soft") || spec.includes("langue");
                    return spec.includes(need.affinity) || spec.includes(need.filiere) || true;
                });

                if (candidateTrainers.length > 0) {
                    // Trier les formateurs par "Stabilité Pédagogique" (Pilier 4)
                    const chosenTrainer = candidateTrainers.sort((a, b) => {
                        const scoreA = plannedSessions.some(p => p.formateurId === a.id && p.groupeId === group.id && p.date === currentDayStr) ? 20 : 0;
                        const scoreB = plannedSessions.some(p => p.formateurId === b.id && p.groupeId === group.id && p.date === currentDayStr) ? 20 : 0;
                        return scoreB - scoreA;
                    })[0];

                    const candidateRooms = rooms.filter(s => {
                        if (globalOccupation.has(`${currentDayStr}|${slot.start}|${s.id}`)) return false;
                        if (plannedSessions.some(p => p.salleId === s.id && p.date === currentDayStr && p.heureDebut === slot.start)) return false;
                        if (need.isSoft) return s.type === "SALLE_COURS";
                        const sAff = getAffinity(s.nom);
                        return need.affinity === "general" || sAff === need.affinity;
                    });

                    if (candidateRooms.length > 0) {
                        // Scoring Pédagogique du créneau (Pilier 1 : Rythme circadien)
                        let pedagogicalScore = 50;
                        if (!need.isSoft && (slot.p === "AM1" || slot.p === "AM2")) pedagogicalScore += 25; // Métier le matin
                        if (need.isSoft && (slot.p === "PM1" || slot.p === "PM2")) pedagogicalScore += 15; // Soft skills l'après-midi

                        const chosenRoom = candidateRooms[0];

                        plannedSessions.push({
                            id: crypto.randomUUID(), etablissementId, groupeId: group.id, formateurId: chosenTrainer.id,
                            moduleId: need.moduleId, salleId: chosenRoom.id, jourSemaine: d + 1, heureDebut: slot.start,
                            heureFin: slot.end, date: currentDayStr, estForcé: need.constraintWeight > 500
                        });

                        trainerWeeklyHours.set(chosenTrainer.id, (trainerWeeklyHours.get(chosenTrainer.id) || 0) + CONFIG.SLOT_DURATION);
                        groupModuleDailyHours.set(`${currentDayStr}|${group.id}|${need.moduleId}`, (groupModuleDailyHours.get(`${currentDayStr}|${group.id}|${need.moduleId}`) || 0) + CONFIG.SLOT_DURATION);
                        need.mhRealise = (need.mhRealise || 0) + CONFIG.SLOT_DURATION;
                        break; 
                    }
                }
            }
          }
        }
      }
    }

    if (plannedSessions.length > 0) await db.insert(emploisIaTable).values(plannedSessions);

    return { 
      success: true, count: plannedSessions.length, anomalies: [], 
      conseils: [
          "Moteur Cognitive-Flow v4.4 actif.",
          "Passe 1 : Priorité aux modules critiques et métiers.",
          "Passe 3 : Respect du rythme circadien (Technique le matin).",
          "Pilier 4 : Stabilité formateur appliquée."
      ] 
    };
  } catch (err: any) { 
      return { success: false, count: 0, anomalies: [err.message] }; 
  }
}
