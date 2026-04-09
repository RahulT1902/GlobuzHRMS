import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { apiResponse } from "../utils/apiResponse";
import { prisma } from "../config/database";

export interface AuthRequest extends Request {
  user?: { id: string; email: string | null; permissions: string[] };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) return apiResponse.error(res, "Unauthorized - no token provided", 401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;
    
    // FETCH USER TO VERIFY VERSION (IAM HARDENING)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { tokenVersion: true, status: true }
    });

    if (!user || user.status === "INACTIVE") {
      return apiResponse.error(res, "Unauthorized - user inactive or not found", 401);
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      return apiResponse.error(res, "Session expired - security profile changed. Please log in again.", 401);
    }

    req.user = {
      id: decoded.id,
      email: decoded.email || null,
      permissions: decoded.permissions || []
    };
    next();
  } catch (err) {
    return apiResponse.error(res, "Unauthorized - invalid session", 401);
  }
};

export const authorize = (...legacyRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Dynamic Role mapping: Since roles are now dynamic, we map legacy role checks
    // to their corresponding foundational permissions.
    if (!req.user) return apiResponse.error(res, "Unauthorized", 401);
    
    let hasAccess = false;
    if (legacyRoles.includes("ADMIN") && req.user.permissions.includes("ADMIN_CONFIG")) hasAccess = true;
    if (legacyRoles.includes("PROCUREMENT") && req.user.permissions.includes("PROCUREMENT_VIEW")) hasAccess = true;
    if (legacyRoles.includes("INVENTORY") && req.user.permissions.includes("INVENTORY_VIEW")) hasAccess = true;
    if (legacyRoles.includes("HR") && req.user.permissions.includes("USER_MANAGE")) hasAccess = true;

    if (!hasAccess) {
      return apiResponse.error(res, "Forbidden - insufficient privileges for this endpoint", 403);
    }
    next();
  };
};

export const checkPermission = (...permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return apiResponse.error(res, "Unauthorized", 401);

    // Global Admin Override
    if (req.user.permissions.includes("ADMIN_CONFIG")) return next();

    // Check if user has ANY of the required permissions
    const hasAccess = permissions.some(p => req.user!.permissions.includes(p));

    if (!hasAccess) {
      return apiResponse.error(res, `Forbidden - requires one of: ${permissions.join(", ")}`, 403);
    }
    next();
  };
};
