import { DatabaseService } from "../services/database.service";
import readline from "readline";

async function askConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes");
    });
  });
}

async function run() {
  const snapshotFile = process.argv[2];

  if (!snapshotFile) {
    console.error("❌ Please provide a snapshot filename.");
    process.exit(1);
  }

  try {
    const confirmed = await askConfirmation("\n⚠️  WARNING: This will WIPE your current database. Continue?");
    if (!confirmed) {
      console.log("❌ Restore cancelled.");
      return;
    }

    console.log("\n🔄 Restoring database state...");
    await DatabaseService.restoreSnapshot(snapshotFile);
    console.log("\n✅ Database restoration successful!");

  } catch (error: any) {
    console.error("\n❌ Restore failed:", error.message);
    process.exit(1);
  }
}

run();
