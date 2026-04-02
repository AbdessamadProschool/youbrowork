import { randomUUID } from "crypto";

export interface AlerteItem {
  id: string;
  niveau: "disciplinaire" | "critique" | "warning" | "anomalie";
  message: string;
  entity: "stagiaire" | "groupe";
  entityId: string;
  entityLabel: string;
  createdAt: string;
}

// Threshold for disciplinary alert (number of EFM absences)
export const ABSENCE_DISCIPLINAIRE_SEUIL = 3;

/**
 * Compute disciplinary alerts for a stagiaire.
 * Returns a "disciplinaire" alert if (totalAbsences - absencesValidated) >= 3.
 */
export function computeDisciplinaireAlert(
  cef: string,
  nomComplet: string,
  totalAbsences: number,
  absencesValidated: number
): AlerteItem | null {
  const remaining = totalAbsences - absencesValidated;
  if (remaining < ABSENCE_DISCIPLINAIRE_SEUIL) return null;
  return {
    id: randomUUID(),
    niveau: "disciplinaire",
    message: `${remaining} absences EFM non justifiées — ACTION DISCIPLINAIRE REQUISE`,
    entity: "stagiaire",
    entityId: cef,
    entityLabel: nomComplet,
    createdAt: new Date().toISOString(),
  };
}

export function computeAlertesForStagiaire(
  cef: string,
  nomComplet: string,
  notes: Array<{
    moduleCode: string;
    moduleIntitule: string;
    cc: number;
    efm: number;
    efmStatut: string;
    moyenneOff: number;
  }>
): AlerteItem[] {
  const alertes: AlerteItem[] = [];
  const now = new Date().toISOString();

  for (const note of notes) {
    if (note.efmStatut === "ABSENT") {
      alertes.push({
        id: randomUUID(),
        niveau: "critique",
        message: `Absent(e) à l'EFM — ${note.moduleIntitule}`,
        entity: "stagiaire",
        entityId: cef,
        entityLabel: nomComplet,
        createdAt: now,
      });
    }

    if (note.moyenneOff < 10) {
      alertes.push({
        id: randomUUID(),
        niveau: "critique",
        message: `Moyenne ${note.moyenneOff.toFixed(2)}/20 < 10 — ${note.moduleIntitule}`,
        entity: "stagiaire",
        entityId: cef,
        entityLabel: nomComplet,
        createdAt: now,
      });
    }

    if (note.cc === 0) {
      alertes.push({
        id: randomUUID(),
        niveau: "warning",
        message: `CC = 0.00 (absence ou non rendu) — ${note.moduleIntitule}`,
        entity: "stagiaire",
        entityId: cef,
        entityLabel: nomComplet,
        createdAt: now,
      });
    }
  }

  return alertes;
}

export function computeAlertesForGroupe(
  groupeId: string,
  groupeCode: string,
  modules: Array<{
    moduleCode: string;
    moduleIntitule: string;
    tauxReel: number | null;
    tauxTheorique: number | null;
    ecart: number | null;
  }>,
  stagiairesNotes: Array<{
    moduleCode: string;
    efmStatut: string;
  }>,
  totalStagiaires: number
): AlerteItem[] {
  const alertes: AlerteItem[] = [];
  const now = new Date().toISOString();

  for (const mod of modules) {
    if (mod.ecart !== null && mod.ecart < -0.05) {
      alertes.push({
        id: randomUUID(),
        niveau: "critique",
        message: `Retard pédagogique de ${(Math.abs(mod.ecart) * 100).toFixed(1)}% — ${mod.moduleIntitule}`,
        entity: "groupe",
        entityId: groupeId,
        entityLabel: groupeCode,
        createdAt: now,
      });
    }

    if (mod.tauxReel !== null && mod.tauxReel > 1.07) {
      alertes.push({
        id: randomUUID(),
        niveau: "anomalie",
        message: `Taux réel ${(mod.tauxReel * 100).toFixed(1)}% anormal (> 107%) — ${mod.moduleIntitule}`,
        entity: "groupe",
        entityId: groupeId,
        entityLabel: groupeCode,
        createdAt: now,
      });
    }
  }

  if (totalStagiaires > 0) {
    const absentsPerModule: Record<string, number> = {};
    for (const sn of stagiairesNotes) {
      if (sn.efmStatut === "ABSENT") {
        absentsPerModule[sn.moduleCode] =
          (absentsPerModule[sn.moduleCode] ?? 0) + 1;
      }
    }

    for (const [modCode, count] of Object.entries(absentsPerModule)) {
      const pct = count / totalStagiaires;
      if (pct > 0.25) {
        const modIntitule = modules.find((m) => m.moduleCode === modCode)?.moduleIntitule ?? modCode;
        alertes.push({
          id: randomUUID(),
          niveau: "warning",
          message: `${count} stagiaires absents (${(pct * 100).toFixed(0)}%) à l'EFM — ${modIntitule}`,
          entity: "groupe",
          entityId: groupeId,
          entityLabel: groupeCode,
          createdAt: now,
        });
      }
    }
  }

  return alertes;
}
