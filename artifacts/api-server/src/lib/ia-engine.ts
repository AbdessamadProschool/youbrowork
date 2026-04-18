import { db, emploisIaTable, formateursTable, sallesTable, avancementsTable, modulesTable, calendriersTable, groupesTable, etablissementsTable, indisponibilitesTable } from "@workspace/db";
import { eq, and, sql, gte, lte, or } from "drizzle-orm";
import crypto from "node:crypto";
import { suggererOptimisationsIA } from "./gemini";
import { logger } from "./logger";

const QUOTAS = { VACATAIRE: 26, PERMANENT: 36, DEFAULT: 36 };
const DURATION_PER_SLOT = 2.5;

export async function genererEmploiIA(etablissementId: string, weeksCount: number = 4) {
  const anomalies: string[] = [];
  const startTime = Date.now();
  
  const formateurs = await db.select().from(formateursTable).where(and(eq(formateursTable.desiste, false), eq(formateursTable.etablissementId, etablissementId)));
  const salles = await db.select().from(sallesTable).where(eq(sallesTable.etablissementId, etablissementId));
  const avancements = await db.select().from(avancementsTable).where(and(eq(avancementsTable.etablissementId, etablissementId)));
  const groupes = await db.select().from(groupesTable).where(eq(groupesTable.etablissementId, etablissementId));
  const allModules = await db.select().from(modulesTable).where(eq(modulesTable.etablissementId, etablissementId));
  const indispos = await db.select().from(indisponibilitesTable).where(eq(indisponibilitesTable.etablissementId, etablissementId));

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  await db.delete(emploisIaTable).where(and(eq(emploisIaTable.etablissementId, etablissementId), gte(emploisIaTable.date, todayStr)));

  const getStartMonday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 1 : (day === 1 ? 0 : 8 - day);
    d.setDate(d.getDate() + diff);
    d.setHours(12, 0, 0, 0); // Éviter les shifts de minuit
    return d;
  };
  const monday = getStartMonday();

  const SLOTS = [ { debut: "08:30", fin: "11:00" }, { debut: "11:00", fin: "13:30" }, { debut: "13:30", fin: "16:00" }, { debut: "16:00", fin: "18:30" } ];
  const groupeInfos = groupes.filter(g => g.statut === "Actif").map(groupe => {
     const modules = avancements.filter(a => a.groupeId === groupe.id && (a.tauxReel || 0) < 1.0);
     return { groupe, modules, moduleOffset: 0 };
  }).filter(g => g.modules.length > 0);

  const planned: any[] = [];
  const normalization = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  for (let w = 0; w < weeksCount; w++) {
    const profWeeklyHours = new Map<string, number>();

    for (let dayOffset = 0; dayOffset < 6; dayOffset++) {
      const currentDayDate = new Date(monday);
      currentDayDate.setDate(monday.getDate() + (w * 7) + dayOffset);
      const dateStr = currentDayDate.toISOString().split('T')[0];

      const profOccupations = new Set<string>();   
      const salleOccupations = new Set<string>();  
      const groupeOccupations = new Set<string>(); 

      for (const slot of SLOTS) {
        for (const gi of groupeInfos) {
          if (groupeOccupations.has(`${slot.debut}-${gi.groupe.id}`)) continue;

          let matchFound = false;
          for (let mIdx = 0; mIdx < gi.modules.length; mIdx++) {
            const currentMod = gi.modules[(gi.moduleOffset + mIdx) % gi.modules.length];
            const mDetails = allModules.find(m => m.id === currentMod.moduleId);

            const matchingProfs = formateurs.filter(f => {
              if (profOccupations.has(`${slot.debut}-${f.id}`)) return false;
              const hoursUsed = profWeeklyHours.get(f.id) || 0;
              const quota = f.type.includes("26") ? QUOTAS.VACATAIRE : QUOTAS.PERMANENT;
              if (hoursUsed + DURATION_PER_SLOT > quota) return false;

              const spec = normalization(f.specialite);
              const mIntitule = normalization(currentMod.moduleIntitule);
              const matchesSpec = mIntitule.includes(spec) || spec === "general" || (mDetails && normalization(mDetails.filiereCode).includes(spec.substring(0,2)));
              if (!matchesSpec) return false;

              return !indispos.some(i => i.targetType === "FORMATEUR" && i.targetId === f.id && (currentDayDate >= i.dateDebut && currentDayDate <= i.dateFin));
            });

            if (matchingProfs.length > 0) {
              matchingProfs.sort((a,b) => (profWeeklyHours.get(a.id)||0) - (profWeeklyHours.get(b.id)||0));
              const prof = matchingProfs[0];
              const typeRequis = mDetails?.estMetier ? "ATELIER" : "SALLE_COURS";
              const salle = salles.find(s => !salleOccupations.has(`${slot.debut}-${s.id}`) && s.type === typeRequis) || salles.find(s => !salleOccupations.has(`${slot.debut}-${s.id}`));

              if (salle) {
                planned.push({
                  id: crypto.randomUUID(),
                  etablissementId,
                  groupeId: gi.groupe.id,
                  formateurId: prof.id,
                  moduleId: currentMod.moduleId,
                  salleId: salle.id,
                  jourSemaine: dayOffset + 1,
                  heureDebut: slot.debut,
                  heureFin: slot.fin,
                  date: dateStr,
                  estForcé: true
                });

                profOccupations.add(`${slot.debut}-${prof.id}`);
                salleOccupations.add(`${slot.debut}-${salle.id}`);
                groupeOccupations.add(`${slot.debut}-${gi.groupe.id}`);
                profWeeklyHours.set(prof.id, (profWeeklyHours.get(prof.id)||0) + DURATION_PER_SLOT);
                gi.moduleOffset = (gi.moduleOffset + mIdx + 1) % gi.modules.length;
                matchFound = true;
                break;
              }
            }
          }
        }
      }
    }
  }

  if (planned.length > 0) await db.insert(emploisIaTable).values(planned);
  return { success: true, count: planned.length, anomalies, conseils: ["Système adaptatif mis à jour."] };
}
