import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { apiResponse } from "../../utils/apiResponse";
import { logAudit } from "../../middleware/audit.middleware";
import { AuthRequest } from "../../middleware/auth.middleware";

export const getRoles = async (req: Request, res: Response) => {
  const roles = await (prisma as any).role.findMany({
    where: { isActive: true },
    include: { permissions: true, _count: { select: { users: true } } }
  });
  return apiResponse.success(res, "Roles fetched successfully", roles);
};

export const createRole = async (req: AuthRequest, res: Response) => {
  const { name, description, permissions } = req.body;
  
  if (!name) return apiResponse.error(res, "Role name is required", 400);

  const existing = await (prisma as any).role.findUnique({ where: { name: name.toUpperCase() } });
  if (existing) return apiResponse.error(res, "Role name already exists", 400);

  const role = await (prisma as any).role.create({
    data: {
      name: name.toUpperCase(),
      description,
      permissions: {
        connect: permissions.map((p: string) => ({ key: p }))
      }
    },
    include: { permissions: true }
  });

  logAudit(req.user!.id, "CREATE_ROLE", "Role", role.id, undefined, role);
  return apiResponse.success(res, "Role created successfully", role);
};

export const updateRole = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;

  const oldRole = await (prisma as any).role.findUnique({ 
    where: { id },
    include: { permissions: true, users: { select: { id: true } } }
  });

  if (!oldRole) return apiResponse.error(res, "Role not found", 404);
  if (oldRole.name === "ADMIN") return apiResponse.error(res, "System role 'ADMIN' cannot be modified", 403);

  const updatedRole = await (prisma as any).role.update({
    where: { id },
    data: {
      name: name?.toUpperCase(),
      description,
      permissions: {
        set: [], // Clear all existing
        connect: permissions.map((p: string) => ({ key: p }))
      }
    },
    include: { permissions: true }
  });

  // IAM HARDENING: Increment tokenVersion for all users assigned to this role
  if (oldRole.users.length > 0) {
    await (prisma as any).user.updateMany({
      where: { roles: { some: { id } } },
      data: { tokenVersion: { increment: 1 } }
    });
  }

  logAudit(req.user!.id, "UPDATE_ROLE", "Role", id as string, oldRole, updatedRole);
  return apiResponse.success(res, "Role updated successfully. Affected users sessions refreshed.", updatedRole);
};

export const deleteRole = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const role = await (prisma as any).role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } }
  });

  if (!role) return apiResponse.error(res, "Role not found", 404);
  if (role.name === "ADMIN") return apiResponse.error(res, "System role 'ADMIN' cannot be deleted", 403);
  if ((role as any)._count.users > 0) return apiResponse.error(res, "Cannot delete role while assigned to active users", 400);

  await (prisma as any).role.update({ where: { id }, data: { isActive: false } });

  logAudit(req.user!.id, "DELETE_ROLE", "Role", id as string, role);
  return apiResponse.success(res, "Role deactivated successfully");
};

export const getPermissions = async (req: Request, res: Response) => {
  const permissions = await (prisma as any).permission.findMany({
    orderBy: { key: 'asc' }
  });
  return apiResponse.success(res, "Permissions fetched", permissions);
};
