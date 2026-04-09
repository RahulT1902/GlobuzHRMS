import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../config/database";
import { apiResponse } from "../../utils/apiResponse";
import { logAudit } from "../../middleware/audit.middleware";
import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { normalizePhone } from "../../utils/normalize";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY_DAYS = 7;

function generateTokens(user: { id: string; email: string | null; permissions: string[]; tokenVersion: number }) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, permissions: user.permissions, tokenVersion: user.tokenVersion },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: ACCESS_EXPIRY }
  );
  const refreshToken = crypto.randomBytes(64).toString("hex");
  return { accessToken, refreshToken };
}

export const login = async (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  const ip = req.ip;

  if (!identifier || !password) {
    return apiResponse.error(res, "Please provide phone/email and password", 400);
  }

  // Identity Normalization (IAM Hardening)
  let normalizedIdentifier = identifier.trim();
  if (!identifier.includes("@")) {
    normalizedIdentifier = normalizePhone(identifier);
  }

  const user = await (prisma as any).user.findFirst({
    where: {
      OR: [
        { email: normalizedIdentifier },
        { phone: normalizedIdentifier }
      ]
    },
    include: {
      roles: {
        include: { permissions: true }
      }
    }
  });

  if (!user || user.status === "INACTIVE") {
    return apiResponse.error(res, "Invalid credentials or inactive account", 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return apiResponse.error(res, "Invalid credentials", 401);
  }

  // AGGREGATE PERMISSIONS
  const rolePermissions = (user as any).roles.flatMap((r: any) => r.permissions.map((p: any) => p.key));
  const effectivePermissions = Array.from(new Set([...rolePermissions, ...(user as any).userPermissions]));

  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    permissions: effectivePermissions,
    tokenVersion: user.tokenVersion
  });

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId: user.id, token: hashedRefreshToken, expiresAt },
  });

  logAudit(user.id, "LOGIN", "User", user.id, undefined, undefined, ip);

  return apiResponse.success(res, "Login successful", {
    accessToken,
    refreshToken,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone,
        roles: (user as any).roles.map((r: any) => r.name), 
        permissions: effectivePermissions,
        isFirstLogin: user.isFirstLogin 
      },
  });
};

export const refreshTokens = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return apiResponse.error(res, "Refresh token required", 400);

  const userTokens = await (prisma as any).refreshToken.findMany({ 
    where: { isRevoked: false, expiresAt: { gt: new Date() } },
    include: { 
      user: {
        include: { 
          roles: { include: { permissions: true } }
        }
      } 
    }
  });

  let validToken = null;
  for (const t of userTokens) {
    if (await bcrypt.compare(refreshToken, t.token)) {
      validToken = t;
      break;
    }
  }

  if (!validToken) return apiResponse.error(res, "Invalid or expired refresh token", 401);

  const user = (validToken as any).user;
  const rolePermissions = user.roles.flatMap((r: any) => r.permissions.map((p: any) => p.key));
  const effectivePermissions = Array.from(new Set([...rolePermissions, ...user.userPermissions]));

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({ where: { id: validToken.id }, data: { isRevoked: true } });

  const { accessToken, refreshToken: newRefreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    permissions: effectivePermissions,
    tokenVersion: user.tokenVersion
  });

  const hashedNew = await bcrypt.hash(newRefreshToken, 10);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { userId: validToken.userId, token: hashedNew, expiresAt } });

  return apiResponse.success(res, "Tokens refreshed", { accessToken, refreshToken: newRefreshToken });
};

export const logout = async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.updateMany({ where: { token: refreshToken }, data: { isRevoked: true } });
  }
  logAudit(req.user!.id, "LOGOUT", "User", req.user!.id);
  return apiResponse.success(res, "Logged out successfully");
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  const user = await (prisma as any).user.findUnique({
    where: { id: req.user!.id },
    include: { 
      roles: { include: { permissions: true } }
    }
  });

  if (!user) return apiResponse.error(res, "User not found", 404);

  // AGGREGATE PERMISSIONS (PBAC Overrides + RBAC inheritance)
  const rolePermissions = (user as any).roles.flatMap((r: any) => r.permissions.map((p: any) => p.key));
  const effectivePermissions = Array.from(new Set([...rolePermissions, ...(user as any).userPermissions]));

  return apiResponse.success(res, "Profile fetched", {
    ...user,
    roles: (user as any).roles.map((r: any) => r.name),
    permissions: effectivePermissions
  });
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { name, profileImage } = req.body;
  const old = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const updated = await (prisma as any).user.update({
    where: { id: req.user!.id },
    data: { name, profileImage },
    include: { roles: true }
  });
  logAudit(req.user!.id, "UPDATE_PROFILE", "User", req.user!.id, old as object, updated as object);
  return apiResponse.success(res, "Profile updated", {
    ...updated,
    roles: (updated as any).roles.map((r: any) => r.name)
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return same response to prevent email enumeration
  if (!user) return apiResponse.success(res, "If the email exists, you will receive a temporary password.");

  const tempPassword = crypto.randomBytes(4).toString("hex").toUpperCase();
  const hashed = await bcrypt.hash(tempPassword, 12);
  const expiryTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // IAM HARDENING: Increment tokenVersion to invalidate existing sessions
  await prisma.$transaction([
    prisma.passwordReset.create({ data: { userId: user.id, tempPassword: hashed, expiryTime } }),
    prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } })
  ]);

  console.log(`[DEV] Temp password for ${email}: ${tempPassword}`); // Replace with email service in prod

  return apiResponse.success(res, "If the email exists, you will receive a temporary password.");
};

