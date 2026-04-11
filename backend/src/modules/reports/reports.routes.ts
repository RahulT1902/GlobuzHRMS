import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import * as reportsController from "./reports.controller";

const router = Router();

router.get(
  "/explorer", 
  authenticate, 
  authorize("ADMIN", "INVENTORY", "PROCUREMENT"), 
  reportsController.getInventoryExplorer
);

router.get(
  "/valuation", 
  authenticate, 
  authorize("ADMIN", "INVENTORY", "PROCUREMENT"), 
  reportsController.getValuationDashboard
);

export default router;
