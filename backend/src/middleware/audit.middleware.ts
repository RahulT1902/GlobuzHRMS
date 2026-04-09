import { prisma } from "../config/database";

export const logAudit = (
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  oldValue?: object,
  newValue?: object,
  ipAddress?: string,
  userAgent?: string,
  module?: string
) => {
  // Async - non-blocking so API response is not delayed
  process.nextTick(async () => {
    try {
      await prisma.auditLog.create({
        data: { 
          userId, 
          action, 
          entity, 
          entityId, 
          oldValue: oldValue as any, 
          newValue: newValue as any, 
          ipAddress, 
          userAgent, 
          module 
        },
      });
    } catch (err) {
      console.error("[AuditLog Error]", err);
    }
  });
};
