const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- IAM Phase 3: Dynamic Role Seeding & Mapping (Safe Mode) ---');

  // 1. CLEAR & SEED PERMISSIONS (SYNC REGISTRY)
  const PERMISSION_KEYS = [
    { key: 'INVENTORY_VIEW', label: 'See Stock & Item List' },
    { key: 'INVENTORY_ADD', label: 'Add New Stock Item' },
    { key: 'INVENTORY_EDIT', label: 'Update Item Details (Names/Units)' },
    { key: 'INVENTORY_DELETE', label: 'Remove Items from Catalog' },
    { key: 'INVENTORY_ADJUST', label: 'Update Stock Levels & Counts' },
    { key: 'PROCUREMENT_VIEW', label: 'Track All Orders' },
    { key: 'PROCUREMENT_CREATE', label: 'Create New Purchase Orders' },
    { key: 'PROCUREMENT_APPROVE', label: 'Approve Orders for Payment' },
    { key: 'PROCUREMENT_RECEIVE', label: 'Record Goods Received (Challan)' },
    { key: 'VENDOR_VIEW', label: 'See Service Partners & Suppliers' },
    { key: 'VENDOR_MANAGE', label: 'Register & Manage Suppliers' },
    { key: 'ADMIN_CONFIG', label: 'System Settings & Master Data' },
    { key: 'USER_MANAGE', label: 'Manage Staff & Access' },
    { key: 'AUDIT_VIEW', label: 'Check System History & Logs' },
    { key: 'SYSTEM_HEALTH', label: 'Check System Health Status' }
  ];

  for (const p of PERMISSION_KEYS) {
    console.log(`Syncing permission: ${p.key}`);
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { label: p.label },
      create: { key: p.key, label: p.label }
    });
  }
  console.log('✔ Permissions registry synchronized.');

  // 2. SEED DEFAULT ROLES
  const DEFAULT_ROLES = [
    { name: 'ADMIN', description: 'Full System Access', permissions: PERMISSION_KEYS.map(p => p.key) },
    { name: 'PROCUREMENT', description: 'Procurement & Logistics Cycle', permissions: ['PROCUREMENT_VIEW', 'PROCUREMENT_CREATE', 'PROCUREMENT_APPROVE', 'PROCUREMENT_RECEIVE', 'VENDOR_VIEW'] },
    { name: 'INVENTORY', description: 'Warehouse & Asset Management', permissions: ['INVENTORY_VIEW', 'INVENTORY_ADD', 'INVENTORY_EDIT', 'INVENTORY_ADJUST'] },
    { name: 'HR', description: 'Personnel & Identity Management', permissions: ['USER_MANAGE'] },
    { name: 'STAFF', description: 'Standard Operational Access', permissions: ['INVENTORY_VIEW', 'PROCUREMENT_VIEW'] }
  ];

  for (const r of DEFAULT_ROLES) {
    console.log(`Processing role: ${r.name}`);
    const existingRole = await prisma.role.findUnique({ where: { name: r.name } });
    
    if (existingRole) {
      console.log(`- Updating ${r.name}`);
      await prisma.role.update({
        where: { id: existingRole.id },
        data: {
          description: r.description,
          permissions: {
            set: r.permissions.map(k => ({ key: k }))
          }
        }
      });
    } else {
      console.log(`- Creating ${r.name}`);
      await prisma.role.create({
        data: {
          name: r.name,
          description: r.description,
          permissions: {
            connect: r.permissions.map(k => ({ key: k }))
          }
        }
      });
    }
  }
  console.log('✔ Default roles created and permissions mapped.');

  // 3. MAP EXISTING USERS (MIGRATION)
  console.log('Migrating existing users...');
  const users = await prisma.user.findMany({ include: { roles: true } });
  let migratedCount = 0;

  for (const user of users) {
    if (user.roles.length === 0) {
      console.log(`- Mapping user: ${user.name || user.id} (Legacy role: ${user.role})`);
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            roles: { 
              connect: { name: user.role || 'STAFF' } 
            }
          }
        });
        migratedCount++;
      } catch (err) {
        console.error(`  Failed to map user ${user.id}:`, err.message);
      }
    }
  }
  console.log(`✔ Migrated ${migratedCount} users to the current dynamic Role system.`);

  // 4. VERIFY
  const check = await prisma.user.count({ where: { roles: { none: {} } } });
  if (check === 0) {
    console.log('✅ ALL USERS SUCCESSFULLY MAPPED TO DYNAMIC ROLES.');
  } else {
    console.log('⚠️ WARNING: Some users are still without roles.');
  }
}

main()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
