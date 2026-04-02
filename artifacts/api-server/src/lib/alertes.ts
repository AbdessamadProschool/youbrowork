import { randomUUID } from "crypto";

export interface AlerteItem {
  id: string;
  niveau: "critique" | "warning" | "anomalie";
  message: string;
  entity: "stagiaire" | "groupe";
  entityId: string;
  entityLabel: string;
  createdAt: string;
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
        message: `${nomComplet} est absent(e) à l'EFM du module ${note.moduleCode} — ${note.moduleIntitule}`,
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
        message: `Moyenne ${note.moyenneOff.toFixed(2)}/20 inférieure à 10 en ${note.moduleCode} — ${note.moduleIntitule}`,
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
        message: `CC = 0.00 en ${note.moduleCode} — ${note.moduleIntitule} (absence ou non rendu)`,
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
        message: `Retard pédagogique de ${(Math.abs(mod.ecart) * 100).toFixed(1)}% en ${mod.moduleCode} — ${mod.moduleIntitule}`,
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
        message: `Taux réel anormal: ${(mod.tauxReel * 100).toFixed(1)}% en ${mod.moduleCode} (dépassement > 107%)`,
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
        alertes.push({
          id: randomUUID(),
          niveau: "warning",
          message: `${count} stagiaires absents (${(pct * 100).toFixed(0)}%) à l'EFM du module ${modCode}`,
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
