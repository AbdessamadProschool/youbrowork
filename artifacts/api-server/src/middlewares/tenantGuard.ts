import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export const tenantGuard = (req: Request, res: Response, next: NextFunction) => {
  // On récupère l'URL complète pour être certain de ne pas se tromper
  const url = req.originalUrl || req.url;

  // Si c'est une route de découverte, on laisse passer sans condition
  if (url.includes("/etablissements") || url.includes("/health")) {
     return next();
  }

  const etabId = req.headers["x-etab-id"];

  if (!etabId || typeof etabId !== "string" || etabId.trim() === "") {
    logger.warn({ url, method: req.method }, "Accès refusé : x-etab-id manquant");
    return res.status(401).json({ error: "Identifiant d'établissement manquant." });
  }

  (req as any).etabId = etabId;
  next();
};
