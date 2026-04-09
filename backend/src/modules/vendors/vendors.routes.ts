import { Router } from "express";
import { 
  getAllVendors, 
  getVendorById, 
  createVendor, 
  updateVendor, 
  deleteVendor 
} from "./vendors.controller";
import { authenticate, checkPermission } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", authenticate, checkPermission("VENDOR_VIEW"), getAllVendors);
router.get("/:id", authenticate, checkPermission("VENDOR_VIEW"), getVendorById);

// Admin-only write operations
router.post("/", authenticate, checkPermission("VENDOR_MANAGE"), createVendor);
router.put("/:id", authenticate, checkPermission("VENDOR_MANAGE"), updateVendor);
router.delete("/:id", authenticate, checkPermission("VENDOR_MANAGE"), deleteVendor);

export default router;
