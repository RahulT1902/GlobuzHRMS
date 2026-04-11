import { Request, Response } from "express";
import { prisma } from "../../config/database";

/**
 * Redacts sensitive fields from a JSON object.
 */
const maskSensitiveData = (data: any) => {
  if (!data) return data;
  const sensitiveKeys = ["password", "passwordHash", "token", "refreshToken", "tempPassword"];
  
  const masked = JSON.parse(JSON.stringify(data));
  const process = (obj: any) => {
    for (const key in obj) {
      if (sensitiveKeys.includes(key)) {
        obj[key] = "****";
      } else if (typeof obj[key] === "object") {
        process(obj[key]);
      }
    }
  };
  
  process(masked);
  return masked;
};

export const getLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const skip = (page - 1) * limit;

    const { userId, module, action, entity, search } = req.query;
    const where: any = {};
    
    // 1. Strict Filters
    if (userId) where.userId = userId;
    if (module) where.module = module;
    if (action) where.action = action;
    if (entity) where.entity = entity;

    // 2. Global Search (Case-insensitive)
    if (search) {
      const s = String(search);
      where.OR = [
        { entity: { contains: s, mode: 'insensitive' } },
        { entityId: { contains: s, mode: 'insensitive' } },
        { user: { name: { contains: s, mode: 'insensitive' } } },
        { module: { contains: s, mode: 'insensitive' } }
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    // Process logs for security
    const processedLogs = logs.map(log => {
      const maskedNew = maskSensitiveData(log.newValue);
      const maskedOld = maskSensitiveData(log.oldValue);
      
      return {
        ...log,
        newValue: maskedNew,
        oldValue: maskedOld,
        // Provide a safe, truncated preview for the UI
        preview: JSON.stringify(maskedNew || maskedOld || {}).slice(0, 500)
      };
    });

    res.json({
      success: true,
      data: processedLogs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLogStatistics = async (req: Request, res: Response) => {
  try {
    const stats = await prisma.auditLog.groupBy({
      by: ["module"],
      _count: { _all: true }
    });
    
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
