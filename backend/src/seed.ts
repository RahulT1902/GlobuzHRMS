import bcrypt from "bcryptjs";
import { prisma } from "./config/database";
import { ALL_PERMISSIONS, PERMISSION_LABELS } from "./constants/permissions";

async function main() {
  console.log("🚀 Starting Professional Seeding...");
  const hashedPassword = await bcrypt.hash("Admin@12345", 12);

  // 1. Foundation: Permissions
  console.log("🔑 Seeding Permissions...");
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: { label: PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS] },
      create: { key, label: PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS] }
    });
  }

  // 2. Foundation: Roles
  console.log("🛡️ Seeding Admin Role...");
  await (prisma as any).role.upsert({
    where: { name: "ADMIN" },
    update: {
      permissions: {
        set: [], 
        connect: ALL_PERMISSIONS.map(p => ({ key: p }))
      }
    },
    create: {
      name: "ADMIN",
      description: "Super Administrator",
      permissions: { connect: ALL_PERMISSIONS.map(p => ({ key: p })) }
    }
  });

  // 3. User: The most important record
  console.log("👤 Seeding Admin User...");
  await (prisma as any).user.upsert({
    where: { email: "admin@globuzinc.com" },
    update: { 
      passwordHash: hashedPassword, 
      status: "ACTIVE", 
      role: "ADMIN",
      roles: { connect: { name: "ADMIN" } }
    },
    create: {
      name: "Globuzinc Admin",
      email: "admin@globuzinc.com",
      phone: "+919876543210",
      passwordHash: hashedPassword,
      status: "ACTIVE",
      role: "ADMIN",
      isFirstLogin: false,
      roles: { connect: { name: "ADMIN" } }
    },
  });

  // 4. Master Data: Units
  console.log("📏 Seeding Units...");
  const units = [
    { name: "Pieces", code: "PCS" },
    { name: "Kilograms", code: "KG" },
    { name: "Boxes", code: "BOX" }
  ];
  for (const u of units) {
    await prisma.unit.upsert({
      where: { code: u.code },
      update: { name: u.name },
      create: u
    });
  }

  // 5. Master Data: Payment Terms
  console.log("💳 Seeding Payment Terms...");
  const terms = [
    { name: "Immediate", days: 0 },
    { name: "Net 30 Days", days: 30 }
  ];
  for (const t of terms) {
    await prisma.paymentTerm.upsert({
      where: { name: t.name },
      update: { days: t.days },
      create: t
    });
  }

  console.log("\n✅ SEEDING COMPLETE!");
  console.log("Access Site: https://globuzhrms.com");
  console.log("User: admin@globuzinc.com");
  console.log("Pass: Admin@12345");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());