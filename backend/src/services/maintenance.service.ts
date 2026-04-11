import { prisma } from "../config/database";

export class MaintenanceService {
  /**
   * Prunes audit logs older than 90 days.
   * This ensures the database doesn't grow indefinitely.
   */
  static async pruneAuditLogs() {
    const NINETY_DAYS_AGO = new Date();
    NINETY_DAYS_AGO.setDate(NINETY_DAYS_AGO.getDate() - 90);

    console.log(`🧹 Maintenance: Pruning audit logs older than ${NINETY_DAYS_AGO.toISOString()}...`);

    try {
      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: NINETY_DAYS_AGO
          }
        }
      });

      console.log(`✅ Maintenance: Pruned ${result.count} old audit logs.`);
      return result.count;
    } catch (error) {
      console.error("❌ Maintenance: Failed to prune audit logs:", error);
      throw error;
    }
  }

  /**
   * Setup a simple interval to run maintenance tasks.
   * In production, this would ideally be a separate cron job.
   */
  static startMaintenanceCycle() {
    // Run every 24 hours
    const interval = 24 * 60 * 60 * 1000;
    
    setInterval(async () => {
      await this.pruneAuditLogs();
    }, interval);

    // Also run once on startup
    this.pruneAuditLogs().catch(() => {});
  }
}
