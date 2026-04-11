import { DatabaseService } from "../services/database.service";

async function run() {
  const mode = process.argv.includes("--core") ? "CORE" : "FULL";
  console.log(`🚀 Starting ${mode} database snapshot...`);

  try {
    const result = await DatabaseService.createSnapshot(mode);
    console.log(`\n✅ Snapshot complete!`);
    console.log(`📍 Saved to: ${result.path}`);
  } catch (error) {
    console.error("❌ Snapshot failed:", error);
    process.exit(1);
  }
}

run();
