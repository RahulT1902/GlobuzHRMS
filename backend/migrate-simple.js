const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- IAM Phase 3: Role Migration (Ultra-Safe) ---');

  // 1. Sync Permissions
  const keys = ['INVENTORY_VIEW', 'INVENTORY_ADD', 'INVENTORY_EDIT', 'INVENTORY_DELETE', 'INVENTORY_ADJUST', 'PROCUREMENT_VIEW', 'PROCUREMENT_CREATE', 'PROCUREMENT_APPROVE', 'PROCUREMENT_RECEIVE', 'VENDOR_VIEW', 'VENDOR_MANAGE', 'ADMIN_CONFIG', 'USER_MANAGE'];
  for (const k of keys) {
    await prisma.permission.upsert({
      where: { key: k },
      update: {},
      create: { key: k, label: k.replace(/_/g, ' ').toLowerCase() }
    });
  }
  console.log('✔ Permissions synced.');

  // 2. Create Roles
  const roles = ['ADMIN', 'PROCUREMENT', 'INVENTORY', 'HR', 'STAFF'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, description: `${name} default role`, isActive: true }
    });
  }
  console.log('✔ Roles created.');

  // 3. Map Permissions to Roles
  // ADMIN gets all
  await prisma.role.update({
    where: { name: 'ADMIN' },
    data: { permissions: { set: keys.map(k => ({ key: k })) } }
  });
  
  // STAFF gets basics
  await prisma.role.update({
    where: { name: 'STAFF' },
    data: { permissions: { set: [{ key: 'INVENTORY_VIEW' }, { key: 'PROCUREMENT_VIEW' }] } }
  });
  console.log('✔ Permissions mapped to roles.');

  // 4. Map Users
  const users = await prisma.user.findMany();
  for (const u of users) {
    if (u.role) {
       await prisma.user.update({
         where: { id: u.id },
         data: { roles: { connect: { name: u.role } } }
       });
    }
  }
  console.log('✔ Users migrated.');
}

main().catch(err => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
