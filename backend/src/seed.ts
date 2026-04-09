import bcrypt from "bcryptjs";
import { prisma } from "./config/database";
import { PERMISSIONS, PERMISSION_LABELS, ALL_PERMISSIONS } from "./constants/permissions";

async function main() {
  console.log("Seeding database for Globuzinc Enterprise Config Engine...");

  const hashedPassword = await bcrypt.hash("Admin@12345", 12);

  // 0. Clean up existing data to ensure fresh seed
  console.log("Cleaning up existing data...");
  try {
    await prisma.inventoryTransaction.deleteMany();
    await prisma.procurementItem.deleteMany();
    await prisma.procurementOrder.deleteMany();
    await prisma.product.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.category.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.paymentTerm.deleteMany();
    await prisma.permission.deleteMany();
    // Keep users to avoid locking out, but update admin
  } catch (e) {
    console.log("Cleanup skipped or failed (likely first run)");
  }

  // 1. Master Data: Permissions (IAM Foundation)
  console.log("Seeding Permissions...");
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.create({
      data: {
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
  const units = await Promise.all([
    prisma.unit.create({ data: { name: "Pieces", code: "PCS", sortOrder: 1 } }),
    prisma.unit.create({ data: { name: "Kilograms", code: "KG", sortOrder: 2 } }),
    prisma.unit.create({ data: { name: "Grams", code: "G", sortOrder: 3 } }),
    prisma.unit.create({ data: { name: "Liters", code: "LTR", sortOrder: 4 } }),
    prisma.unit.create({ data: { name: "Meters", code: "M", sortOrder: 5 } }),
    prisma.unit.create({ data: { name: "Boxes", code: "BOX", sortOrder: 6 } }),
    prisma.unit.create({ data: { name: "Sets", code: "SET", sortOrder: 7 } }),
    prisma.unit.create({ data: { name: "Packets", code: "PKT", sortOrder: 8 } }),
    prisma.unit.create({ data: { name: "Rolls", code: "ROLL", sortOrder: 9 } }),
  ]);

  const norm = (s: string) => s.trim().toLowerCase();

  // 3. Master Data: Categories
  console.log("Seeding Categories...");
  // Inventory Categories
  const catIT = await prisma.category.create({ data: { name: "IT Assets", normalizedName: norm("IT Assets"), type: "INVENTORY", sortOrder: 1 } });
  const catOffice = await prisma.category.create({ data: { name: "Office Supplies", normalizedName: norm("Office Supplies"), type: "INVENTORY", sortOrder: 2 } });
  const catFurniture = await prisma.category.create({ data: { name: "Furniture", normalizedName: norm("Furniture"), type: "INVENTORY", sortOrder: 3 } });
  const catRaw = await prisma.category.create({ data: { name: "Raw Materials", normalizedName: norm("Raw Materials"), type: "INVENTORY", sortOrder: 4 } });

  // Sub-categories
  await prisma.category.create({ data: { name: "Hardware", normalizedName: norm("Hardware"), type: "INVENTORY", parentId: catIT.id, sortOrder: 1 } });
  await prisma.category.create({ data: { name: "Software", normalizedName: norm("Software"), type: "INVENTORY", parentId: catIT.id, sortOrder: 2 } });
  await prisma.category.create({ data: { name: "Stationery", normalizedName: norm("Stationery"), type: "INVENTORY", parentId: catOffice.id, sortOrder: 1 } });

  // Vendor Categories
  const vCatPartners = await prisma.category.create({ data: { name: "Strategic Partners", normalizedName: norm("Strategic Partners"), type: "VENDOR", sortOrder: 1 } });
  const vCatServices = await prisma.category.create({ data: { name: "Service Providers", normalizedName: norm("Service Providers"), type: "VENDOR", sortOrder: 2 } });
  const vCatLogistics = await prisma.category.create({ data: { name: "Logistics Agents", normalizedName: norm("Logistics Agents"), type: "VENDOR", sortOrder: 3 } });

  // 4. Master Data: Payment Terms
  console.log("Seeding Payment Terms...");
  const terms = await Promise.all([
    prisma.paymentTerm.create({ data: { name: "Cash on Delivery", days: 0, sortOrder: 1 } }),
    prisma.paymentTerm.create({ data: { name: "Immediate", days: 0, sortOrder: 2 } }),
    prisma.paymentTerm.create({ data: { name: "Net 15 Days", days: 15, sortOrder: 3 } }),
    prisma.paymentTerm.create({ data: { name: "Net 30 Days", days: 30, sortOrder: 4 } }),
    prisma.paymentTerm.create({ data: { name: "Net 60 Days", days: 60, sortOrder: 5 } }),
    prisma.paymentTerm.create({ data: { name: "Net 90 Days", days: 90, sortOrder: 6 } }),
    prisma.paymentTerm.create({ data: { name: "Advance Payment", days: 0, sortOrder: 7 } }),
  ]);

  // 5. Users
  console.log("Seeding Users...");
  const admin = await (prisma as any).user.upsert({
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

  // 6. Vendors
  console.log("Seeding Vendors...");
  const vendor = await prisma.vendor.create({
    data: {
      name: "Global Tech Solutions",
      contactPerson: "Jane Smith",
      email: "jane@globaltech.com",
      categoryId: vCatPartners.id,
      paymentTermId: terms[3].id, // Net 30
      status: "ACTIVE"
    }
  });

  // 7. Products
  console.log("Seeding Products...");
  const productData = [
    { name: 'MacBook Pro 14"', categoryId: catIT.id, sku: "IT-MBP-14", unitId: units[0].id, purchasePrice: 1999.00 },
    { name: 'Office Desk - Alpha', categoryId: catFurniture.id, sku: "FN-DSK-ALP", unitId: units[0].id, purchasePrice: 250.00 },
    { name: 'Printer Paper A4', categoryId: catOffice.id, sku: "OS-PAP-A4", unitId: units[8].id, purchasePrice: 15.00 }, // Rolls just for fun
  ];

  const seededProducts = [];
  for (const p of productData) {
    const sp = await prisma.product.create({ data: p });
    seededProducts.push(sp);
  }

  // 8. System Settings / Rules
  console.log("Seeding System Settings...");
  const defaultRules = {
    product: {
      sku: { required: true },
      minThreshold: { required: true },
    },
    vendor: {
      taxId: { required: true },
      paymentTermId: { required: true },
    }
  };

  await prisma.systemSetting.upsert({
    where: { group_key: { group: 'VALIDATION', key: 'FIELD_RULES' } },
    update: { value: defaultRules },
    create: {
      group: 'VALIDATION',
      key: 'FIELD_RULES',
      value: defaultRules,
    }
  });

  console.log("\n=== SEED COMPLETE ===");
  console.log("Admin: admin@globuzinc.com / Admin@12345");
  console.log("Phone Auth: +919876543210 (Normalized)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());