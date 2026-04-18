import { Router } from "express";
import { 
  createOrder, 
  submitOrder, 
  approveOrder, 
  rejectOrder,
  markAsOrdered, 
  receiveShipment, 
  getOrders, 
  getOrderById,
  getNotificationCounts
} from "./procurement.controller";
import { authenticate, authorize } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", authenticate, getOrders);
router.get("/notifications/count", authenticate, getNotificationCounts);
router.get("/:id", authenticate, getOrderById);

// Lifecycle transitions
router.post("/", authenticate, createOrder);

// Submitting: PROCUREMENT or ADMIN
router.put("/:id/submit", authenticate, authorize("PROCUREMENT", "ADMIN"), submitOrder);

// Approving/Rejecting: ADMIN only
router.put("/:id/approve", authenticate, authorize("ADMIN"), approveOrder);
router.put("/:id/reject", authenticate, authorize("ADMIN"), rejectOrder);

// Moving to Ordered Phase
router.put("/:id/order", authenticate, authorize("ADMIN", "PROCUREMENT"), markAsOrdered);

// Receiving Shipments (Challans): INVENTORY or ADMIN
router.post("/:id/receive", authenticate, authorize("INVENTORY", "ADMIN"), receiveShipment);

export default router;
