import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../utils/validate";
import { authenticate } from "../../middleware/auth.middleware";
import {
  login, logout, refreshTokens,
  getProfile, updateProfile, forgotPassword
} from "./auth.controller";
import {
  loginSchema, forgotPasswordSchema, updateProfileSchema
} from "./auth.schema";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: "Too many login attempts. Try again in 15 minutes.", data: null, error: null },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/logout", authenticate, logout);
router.post("/refresh", refreshTokens);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, validate(updateProfileSchema), updateProfile);

export default router;
