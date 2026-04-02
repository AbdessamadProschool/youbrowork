import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import groupesRouter from "./groupes";
import stagiairesRouter from "./stagiaires";
import alertesRouter from "./alertes";
import modulesRouter from "./modules";
import calendrierRouter from "./calendrier";
import importRouter from "./import";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(groupesRouter);
router.use(stagiairesRouter);
router.use(alertesRouter);
router.use(modulesRouter);
router.use(calendrierRouter);
router.use(importRouter);

export default router;
