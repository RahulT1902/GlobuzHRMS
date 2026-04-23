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
  getNotificationCounts,
  deleteOrder,
  resendOrderEmail
} from "./procurement.controller";
import { authenticate, authorize } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", authenticate, getOrders);
router.get("/notifications/count", authenticate, getNotificationCounts);
router.get("/:id", authenticate, getOrderById);

// Lifecycle transitions
router.post("/", authenticate, createOrder);

// Approving/Rejecting: ADMIN only
router.put("/:id/submit", authenticate, authorize("PROCUREMENT", "ADMIN"), submitOrder);
router.put("/:id/approve", authenticate, authorize("ADMIN"), approveOrder);
router.put("/:id/reject", authenticate, authorize("ADMIN"), rejectOrder);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteOrder);

// Moving to Ordered Phase
router.put("/:id/order", authenticate, authorize("ADMIN", "PROCUREMENT"), markAsOrdered);
router.post("/:id/resend-email", authenticate, authorize("ADMIN", "PROCUREMENT"), resendOrderEmail);

// Receiving Shipments (Challans): INVENTORY or ADMIN
router.post("/:id/receive", authenticate, authorize("INVENTORY", "ADMIN"), receiveShipment);

export default router;
