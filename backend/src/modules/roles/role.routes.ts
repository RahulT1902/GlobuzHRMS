import { Router } from "express";
import * as roleController from "./role.controller";
import { authenticate, checkPermission } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

// Local constant to avoid ESM import issues from frontend
const ADMIN_CONFIG_PERM = "ADMIN_CONFIG";

router.get("/", checkPermission(ADMIN_CONFIG_PERM), roleController.getRoles);
router.get("/permissions", checkPermission(ADMIN_CONFIG_PERM), roleController.getPermissions);
router.post("/", checkPermission(ADMIN_CONFIG_PERM), roleController.createRole);
router.put("/:id", checkPermission(ADMIN_CONFIG_PERM), roleController.updateRole);
router.delete("/:id", checkPermission(ADMIN_CONFIG_PERM), roleController.deleteRole);

export default router;
