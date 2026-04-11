import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import * as systemController from "./system.controller";

const router = Router();

// Only ADMINS can manage the database persistence layer
router.use(authenticate, authorize("ADMIN"));

router.get("/snapshots", systemController.getSnapshots);
router.post("/snapshot", systemController.createSnapshot);
router.post("/restore", systemController.restoreSnapshot);

export default router;
