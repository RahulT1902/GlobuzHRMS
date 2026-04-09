import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { apiResponse } from "../../utils/apiResponse";
import bcrypt from "bcryptjs";
import { logAudit } from "../../middleware/audit.middleware";
import { AuthRequest } from "../../middleware/auth.middleware";
import { normalizePhone } from "../../utils/normalize";

export const getUsers = async (req: Request, res: Response) => {
  const users = await (prisma as any).user.findMany({
    include: { roles: true },
    orderBy: { createdAt: "desc" },
  });
  return apiResponse.success(res, "Users fetched successfully", users);
};

export const createUser = async (req: AuthRequest, res: Response) => {
  const { name, email, phone, password, roleNames, userPermissions } = req.body;

  if (!phone || !password || !name || !roleNames || !Array.isArray(roleNames) || roleNames.length === 0) {
    return apiResponse.error(res, "Required fields: name, phone, password, and at least one role", 400);
  }

  // Identity Normalization (IAM Hardening)
  const normalizedPhone = normalizePhone(phone);
  const existing = await prisma.user.findFirst({
    where: { OR: [{ phone: normalizedPhone }, { email: email?.trim() }] }
  });

  if (existing) {
    return apiResponse.error(res, "Phone or Email already registered", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await (prisma as any).user.create({
    data: {
      name,
      email: email?.trim(),
      phone: normalizedPhone,
      passwordHash: hashedPassword,
      role: 'STAFF', // LEGACY OVERRIDE: Satisfy Prisma schema enforcer until legacy column is dropped
      roles: {
        connect: roleNames.map((n: string) => ({ name: n.toUpperCase() }))
      },
      userPermissions: userPermissions || [],
      status: "ACTIVE",
    },
    include: { roles: true }
  });

  logAudit(req.user!.id, "CREATE_USER", "User", user.id, undefined, user);
  return apiResponse.success(res, "User onboarded successfully", user);
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, roleNames, userPermissions, status } = req.body;

  const oldUser = await (prisma as any).user.findUnique({ 
    where: { id },
    include: { roles: true }
  });

  if (!oldUser) return apiResponse.error(res, "User not found", 404);

  // Hardening: Prevent self-lockout or last admin removal
  // A role removal is only dangerous if "ADMIN" is in the old set and not in the new set
  const oldRoleNames = (oldUser as any).roles.map((r: any) => r.name);
  const isAdminBeingRemoved = oldRoleNames.includes("ADMIN") && 
                              (roleNames && !roleNames.map((n: string) => n.toUpperCase()).includes("ADMIN"));

  if (isAdminBeingRemoved) {
    const adminCount = await (prisma as any).user.count({ 
      where: { roles: { some: { name: "ADMIN" } } } 
    });
    if (adminCount <= 1) {
      return apiResponse.error(res, "Security Constraint: Cannot remove the last remaining ADMIN role", 403);
    }
  }

  // Self-protection: Cannot deactivate self
  if (id === req.user!.id && status === "INACTIVE") {
      return apiResponse.error(res, "Security Constraint: Cannot deactivate your own administrative account", 403);
  }

  const updateData: any = { name, email: email?.trim(), status };
  if (phone) updateData.phone = normalizePhone(phone);
  
  let structuralChange = false;

  if (roleNames && Array.isArray(roleNames)) {
    updateData.roles = {
      set: [], // Clear
      connect: roleNames.map((n: string) => ({ name: n.toUpperCase() }))
    };
    structuralChange = true;
  }

  if (userPermissions && Array.isArray(userPermissions)) {
    updateData.userPermissions = userPermissions;
    structuralChange = true;
  }

  if (structuralChange) {
    updateData.tokenVersion = { increment: 1 };
  }

  const updated = await (prisma as any).user.update({
    where: { id },
    data: updateData,
    include: { roles: true }
  });

  logAudit(req.user!.id, "UPDATE_USER", "User", id as string, oldUser, updated);
  return apiResponse.success(res, "User security profile updated", updated);
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  if (id === req.user!.id) {
    return apiResponse.error(res, "Security Violation: Administrative self-deletion is restricted", 403);
  }

  const user = await (prisma as any).user.findUnique({
    where: { id },
    include: { roles: true }
  });

  if (!user) return apiResponse.error(res, "User not found", 404);
  
  // Protect ADMIN users from deletion
  if ((user as any).roles.some((r: any) => r.name === "ADMIN")) {
    return apiResponse.error(res, "Identity Hardening: ADMIN users cannot be deleted. Deactivate them instead.", 403);
  }

  // Attempt absolute Hard-Delete for clean infrastructure (destroys test accounts)
  try {
    // Delete any orphaned refresh tokens first
    await (prisma as any).refreshToken.deleteMany({ where: { userId: id } });
    await (prisma as any).user.delete({ where: { id } });
    
    logAudit(req.user!.id, "DELETE_USER", "User", id as string, user, { action: "HARD_DELETE" });
    return apiResponse.success(res, "User completely purged from the system");
  } catch (err) {
    // Graceful Soft-Delete Fallback if cryptographic foreign keys (Audits, Orders) exist
    await (prisma as any).user.update({
      where: { id },
      data: { status: "INACTIVE" }
    });
    
    logAudit(req.user!.id, "DELETE_USER", "User", id as string, user, { action: "SOFT_DELETE" });
    return apiResponse.success(res, "User deactivated (Historical operational data retained)");
  }
};
