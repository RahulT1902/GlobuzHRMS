import bcrypt from "bcryptjs";
import { prisma } from "./config/database";
import { PERMISSIONS, PERMISSION_LABELS, ALL_PERMISSIONS } from "./constants/permissions";

async function main() {
  console.log("Seeding database for Globuzinc Enterprise Config Engine...");

  const hashedPassword = await bcrypt.hash("Admin@12345", 12);

  // 0. Clean up existing data to ensure fresh seed
  console.log("Cleaning up existing data...");
  try {
    // Delete in reverse order of dependencies
    await prisma.inventoryTransaction.deleteMany();
    await prisma.procurementShipmentItem.deleteMany();
    await prisma.procurementShipment.deleteMany();
    await prisma.procurementItem.deleteMany();
    await prisma.procurementOrder.deleteMany();
    await prisma.product.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.category.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.paymentTerm.deleteMany();
    // Permissions are foundation, we upsert them instead of deleting
  } catch (e) {
    console.log("Cleanup partial: Some records might be protected by foreign keys.");
  }

  // 1. Master Data: Permissions (IAM Foundation)
  console.log("Seeding Permissions...");
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: { label: PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS] },
      create: {
        key,
        label: PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS]
      }
    });
  }

  console.log("Seeding Administrative Role...");
  await (prisma as any).role.upsert({
    where: { name: "ADMIN" },
    update: {
      permissions: {
        set: [], // reset
        connect: ALL_PERMISSIONS.map(p => ({ key: p }))
      }
    },
    create: {
      name: "ADMIN",
      description: "Super Administrator Role configured via Codebase",
      permissions: { connect: ALL_PERMISSIONS.map(p => ({ key: p })) }
    }
  });
  
  // 2. Master Data: Units
  console.log("Seeding Units...");
  const unitData = [
    { name: "Pieces", code: "PCS", sortOrder: 1 },
    { name: "Kilograms", code: "KG", sortOrder: 2 },
    { name: "Grams", code: "G", sortOrder: 3 },
    { name: "Liters", code: "LTR", sortOrder: 4 },
    { name: "Meters", code: "M", sortOrder: 5 },
    { name: "Boxes", code: "BOX", sortOrder: 6 },
    { name: "Sets", code: "SET", sortOrder: 7 },
    { name: "Packets", code: "PKT", sortOrder: 8 },
    { name: "Rolls", code: "ROLL", sortOrder: 9 },
  ];

  for (const u of unitData) {
    await prisma.unit.upsert({
      where: { code: u.code },
      update: u,
      create: u
    });
  }

  const norm = (s: string) => s.trim().toLowerCase();

  // 3. Master Data: Categories
  console.log("Seeding Categories...");
  const inventoryCats = ["IT Assets", "Office Supplies", "Furniture", "Raw Materials"];
  for (const [i, name] of inventoryCats.entries()) {
    const normalizedName = norm(name);
    const existing = await prisma.category.findFirst({
      where: { normalizedName, parentId: null, type: "INVENTORY" }
    });

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { name, sortOrder: i + 1 }
      });
    } else {
      await prisma.category.create({
        data: { name, normalizedName, type: "INVENTORY", sortOrder: i + 1 }
      });
    }
  }

  // 4. Master Data: Payment Terms
  console.log("Seeding Payment Terms...");
  const termsData = [
    { name: "Cash on Delivery", days: 0, sortOrder: 1 },
    { name: "Immediate", days: 0, sortOrder: 2 },
    { name: "Net 15 Days", days: 15, sortOrder: 3 },
    { name: "Net 30 Days", days: 30, sortOrder: 4 },
    { name: "Net 60 Days", days: 60, sortOrder: 5 },
    { name: "Net 90 Days", days: 90, sortOrder: 6 },
    { name: "Advance Payment", days: 0, sortOrder: 7 },
  ];

  for (const t of termsData) {
    await prisma.paymentTerm.upsert({
      where: { name: t.name },
      update: t,
      create: t
    });
  }

  // 5. Users
  console.log("Seeding Admin User...");
  await (prisma as any).user.upsert({
    where: { email: "admin@globuzinc.com" },
    update: { 
      passwordHash: hashedPassword, 
      status: "ACTIVE", 
      phone: "+919876543210",
      roles: { connect: { name: "ADMIN" } }
    },
    create: {
      name: "Globuzinc Admin",
      email: "admin@globuzinc.com",
      phone: "+919876543210",
      passwordHash: hashedPassword,
      status: "ACTIVE",
      isFirstLogin: false,
      roles: { connect: { name: "ADMIN" } }
    },
  });

  console.log("\n=== SEED COMPLETE ===");
  console.log("Admin: admin@globuzinc.com / Admin@12345");
  console.log("Phone Auth: +919876543210");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());