import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import * as auditController from "./audit.controller";

const router = Router();

// Audit logs are highly sensitive - restricted to ADMIN only
router.use(authenticate, authorize("ADMIN"));

router.get("/logs", auditController.getLogs);
router.get("/stats", auditController.getLogStatistics);

export default router;
