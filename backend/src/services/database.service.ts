import { prisma } from "../config/database";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Removed redundant new PrismaClient()

const TABLE_ORDER = [
  "SystemSetting",
  "Permission",
  "Unit",
  "PaymentTerm",
  "Category",
  "Role",
  "User",
  "Vendor",
  "Product",
  "ProcurementOrder",
  "RefreshToken",
  "PasswordReset",
  "AuditLog",
  "ProductImage",
  "ProcurementItem",
  "InventoryTransaction",
  "ProcurementShipment",
  "ProcurementShipmentItem",
  "StockReconciliation"
];

const JUNCTION_TABLES = ["_PermissionToRole", "_RoleToUser"];
const VOLATILE_MODELS = ["AuditLog", "RefreshToken"];

export class DatabaseService {
  private static getBackupsDir() {
    const dir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  static async getSchemaHash(): Promise<string> {
    const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    return crypto.createHash("sha256").update(schemaContent).digest("hex");
  }

  static async listSnapshots() {
    const dir = this.getBackupsDir();
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith(".json"))
      .map(f => {
        const stats = fs.statSync(path.join(dir, f));
        return {
          filename: f,
          size: stats.size,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return files;
  }

  static async createSnapshot(mode: "CORE" | "FULL" = "FULL") {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const schemaHash = await this.getSchemaHash();
    const snapshotName = `snapshot_${timestamp}_${mode.toLowerCase()}.json`;

    const snapshot: any = {
      meta: {
        createdAt: new Date().toISOString(),
        version: "1.0.1",
        schemaHash,
        mode,
        environment: process.env.NODE_ENV || "development"
      },
      data: {},
      junctions: {}
    };

    for (const modelName of TABLE_ORDER) {
      if (mode === "CORE" && VOLATILE_MODELS.includes(modelName)) continue;
      
      // @ts-ignore
      const data = await prisma[modelName.charAt(0).toLowerCase() + modelName.slice(1)].findMany();
      snapshot.data[modelName] = data;
    }

    for (const table of JUNCTION_TABLES) {
      try {
        const data = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
        snapshot.junctions[table] = data;
      } catch (e) {
        snapshot.junctions[table] = [];
      }
    }

    const filePath = path.join(this.getBackupsDir(), snapshotName);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));

    // Retention Policy: Keep only last 10 snapshots
    try {
      const allFiles = await this.listSnapshots();
      if (allFiles.length > 10) {
        const directory = this.getBackupsDir();
        const filesToDelele = allFiles.slice(10); // Everything after the first 10 (sorted by newest)
        for (const file of filesToDelele) {
          console.log(`🗑️ Deleting old snapshot: ${file.filename}`);
          fs.unlinkSync(path.join(directory, file.filename));
        }
      }
    } catch (err) {
      console.warn("⚠️ Failed to prune old snapshots:", err);
    }

    return { filename: snapshotName, path: filePath };
  }

  static async restoreSnapshot(filename: string) {
    const filePath = path.join(this.getBackupsDir(), filename);
    if (!fs.existsSync(filePath)) throw new Error("Snapshot not found");

    const snapshot = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const currentHash = await this.getSchemaHash();

    if (snapshot.meta.schemaHash !== currentHash) {
      throw new Error("SCHEMA_MISMATCH: Snapshot structure does not match current database.");
    }

    await prisma.$transaction(async (tx) => {
      const reverseOrder = [...TABLE_ORDER].reverse();
      
      // Clear junctions
      for (const junction of JUNCTION_TABLES) {
        await tx.$executeRawUnsafe(`DELETE FROM "${junction}"`);
      }

      // Clear main tables
      for (const modelName of reverseOrder) {
        // @ts-ignore
        const model = tx[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
        if (model) await model.deleteMany();
      }

      // Restore data
      for (const modelName of TABLE_ORDER) {
        const records = snapshot.data[modelName];
        if (!records || records.length === 0) continue;

        // @ts-ignore
        const model = tx[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
        await model.createMany({ data: records });
      }

      // Restore junctions
      for (const table of JUNCTION_TABLES) {
        const records = (snapshot.junctions && snapshot.junctions[table]) || [];
        for (const record of records) {
          const keys = Object.keys(record);
          const values = Object.values(record);
          const columns = keys.map(k => `"${k}"`).join(", ");
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
          await tx.$executeRawUnsafe(`INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`, ...values);
        }
      }
    }, {
      timeout: 60000
    });

    return true;
  }
}
