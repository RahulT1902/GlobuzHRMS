import { Router } from "express";
import { validateStockDrift, getSystemHealth } from "./debug.controller";
import { authenticate, authorize } from "../../middleware/auth.middleware";

const router = Router();

// Only ADMIN can access debug tools
router.get("/validate-stock", authenticate, authorize("ADMIN"), validateStockDrift);
router.get("/health-check", authenticate, authorize("ADMIN"), getSystemHealth);

export default router;
