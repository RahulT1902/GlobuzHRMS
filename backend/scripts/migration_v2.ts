import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Surgical Migration: Enterprise Config Engine...');

  // 1. Seed Master Data (Standard Defaults)
  console.log('📦 Seeding Standard Units...');
  const units = [
    { name: 'Pieces', code: 'PCS', sortOrder: 1 },
    { name: 'Kilograms', code: 'KG', sortOrder: 2 },
    { name: 'Liters', code: 'LTR', sortOrder: 3 },
    { name: 'Meters', code: 'MTR', sortOrder: 4 },
  ];

  for (const u of units) {
    await prisma.unit.upsert({
      where: { code: u.code },
      update: {},
      create: u,
    });
  }

  console.log('📦 Seeding Categories...');
  const categories = [
    { name: 'Raw Material', type: 'INVENTORY', sortOrder: 1 },
    { name: 'Finished Goods', type: 'INVENTORY', sortOrder: 2 },
    { name: 'Packaging Material', type: 'INVENTORY', sortOrder: 3 },
    { name: 'Manufacturer', type: 'VENDOR', sortOrder: 1 },
    { name: 'Distributor', type: 'VENDOR', sortOrder: 2 },
    { name: 'Service Provider', type: 'VENDOR', sortOrder: 3 },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { name_type: { name: c.name, type: c.type } },
      update: {},
      create: c,
    });
  }

  console.log('📦 Seeding Payment Terms...');
  const terms = [
    { name: 'NET_15', days: 15, sortOrder: 1 },
    { name: 'NET_30', days: 30, sortOrder: 2 },
    { name: 'NET_45', days: 45, sortOrder: 3 },
    { name: 'ADVANCE', days: 0, sortOrder: 4 },
  ];

  for (const t of terms) {
    await prisma.paymentTerm.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }

  // 2. Extract & Sync Legacy Product Data
  console.log('🧹 Extracting & Mapping Legacy Product Data...');
  const products = await prisma.product.findMany();
  
  for (const product of products) {
    // Find or Create Unit
    let unit = await prisma.unit.findFirst({
      where: { name: { equals: product.unit, mode: 'insensitive' } }
    });
    if (!unit) {
      unit = await prisma.unit.create({
        data: { name: product.unit, code: product.unit.toUpperCase().replace(/\s+/g, '_'), sortOrder: 99 }
      });
    }

    // Find or Create Category
    let category = await prisma.category.findFirst({
      where: { name: { equals: product.category, mode: 'insensitive' }, type: 'INVENTORY' }
    });
    if (!category) {
      category = await prisma.category.create({
        data: { name: product.category, type: 'INVENTORY', sortOrder: 99 }
      });
    }

    // Backfill Product
    await prisma.product.update({
      where: { id: product.id },
      data: {
        unitId: unit.id,
        categoryId: category.id
      }
    });
  }

  // 3. Extract & Sync Legacy Vendor Data
  console.log('🧹 Extracting & Mapping Legacy Vendor Data...');
  const vendors = await prisma.vendor.findMany();

  for (const vendor of vendors) {
    // Category mapping
    if (vendor.category) {
      let category = await prisma.category.findFirst({
        where: { name: { equals: vendor.category, mode: 'insensitive' }, type: 'VENDOR' }
      });
      if (!category) {
        category = await prisma.category.create({
          data: { name: vendor.category, type: 'VENDOR', sortOrder: 99 }
        });
      }
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { categoryId: category.id }
      });
    }

    // Payment Terms mapping
    if (vendor.paymentTerms) {
      let term = await prisma.paymentTerm.findFirst({
        where: { name: { equals: vendor.paymentTerms, mode: 'insensitive' } }
      });
      if (!term) {
        term = await prisma.paymentTerm.create({
          data: { name: vendor.paymentTerms, days: 30, sortOrder: 99 }
        });
      }
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { paymentTermId: term.id }
      });
    }
  }

  // 4. Seed Default Rules Engine
  console.log('🧠 Seeding Validation Rules Engine...');
  const defaultRules = {
    product: {
      category: { required: true },
      unit: { required: true },
      sku: { required: true }
    },
    vendor: {
      taxId: { required: true },
      phone: { required: false },
      email: { required: true }
    }
  };

  await prisma.systemSetting.upsert({
    where: { group_key: { group: 'VALIDATION', key: 'FIELD_RULES' } },
    update: {},
    create: {
      group: 'VALIDATION',
      key: 'FIELD_RULES',
      value: defaultRules
    }
  });

  console.log('✅ Surgical Migration Completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
