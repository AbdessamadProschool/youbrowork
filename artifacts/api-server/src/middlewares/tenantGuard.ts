import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Middleware de garde pour l'isolation Multi-Tenant.
 * Extrait x-etab-id, le valide et l'injecte dans req.etabId.
 */
export const tenantGuard = (req: Request, res: Response, next: NextFunction) => {
  const etabId = req.headers["x-etab-id"];

  if (!etabId || typeof etabId !== "string" || etabId.trim() === "") {
    logger.warn({ url: req.url, method: req.method }, "Tentative d'accès sans dossier établissement (x-etab-id manquant)");
    res.status(401).json({ 
      error: "Accès refusé : Identifiant d'établissement manquant.",
      code: "TENANT_MISSING"
    });
    return;
  }

  // On injecte l'etabId validé dans l'objet request pour les routes suivantes
  (req as any).etabId = etabId;
  next();
};
