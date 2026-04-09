import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import { getUsers, createUser, updateUser, deleteUser } from "./user.controller";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN")); // Strictly Admin only for user management

router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
