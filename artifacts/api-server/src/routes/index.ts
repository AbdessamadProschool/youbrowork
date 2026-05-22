import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import groupesRouter from "./groupes";
import stagiairesRouter from "./stagiaires";
import alertesRouter from "./alertes";
import modulesRouter from "./modules";
import modulesValidesRouter from "./modules-valides";
import calendrierRouter from "./calendrier";
import importRouter from "./import";
import formateursRouter from "./formateurs";
import sallesRouter from "./salles";
import iaRouter from "./ia";
import etablissementsRouter from "./etablissements";
import { tenantGuard } from "../middlewares/tenantGuard";

const router: IRouter = Router();

// 🔓 Public Discovery Routes (No x-etab-id required)
router.use(healthRouter);
router.use(etablissementsRouter);

// 🛡️ Protected Operational Routes (x-etab-id REQUIRED)
router.use(tenantGuard);

router.use(dashboardRouter);
router.use(groupesRouter);
router.use(stagiairesRouter);
router.use(alertesRouter);
router.use(modulesRouter);
router.use(modulesValidesRouter);
router.use(calendrierRouter);
router.use(importRouter);
router.use(formateursRouter);
router.use(sallesRouter);
router.use(iaRouter);

export default router;
