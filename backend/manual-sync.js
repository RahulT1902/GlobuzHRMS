const { Client } = require('pg');

const DATABASE_URL = "postgresql://neondb_owner:npg_Eo8kGJWBj0Yh@ep-shiny-band-an81rmi8-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('--- IAM Phase 3: Manual SQL Sync ---');

  try {
    // 1. Create Tables
    console.log('Creating Role and Permission tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Permission" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "label" TEXT,
        CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Permission_key_key" ON "Permission"("key");

      CREATE TABLE IF NOT EXISTS "Role" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_key" ON "Role"("name");

      CREATE TABLE IF NOT EXISTS "_RolePermissions" (
        "A" TEXT NOT NULL,
        "B" TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "_RolePermissions_AB_unique" ON "_RolePermissions"("A", "B");
      CREATE INDEX IF NOT EXISTS "_RolePermissions_B_index" ON "_RolePermissions"("B");

      CREATE TABLE IF NOT EXISTS "_UserRoles" (
        "A" TEXT NOT NULL,
        "B" TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "_UserRoles_AB_unique" ON "_UserRoles"("A", "B");
      CREATE INDEX IF NOT EXISTS "_UserRoles_B_index" ON "_UserRoles"("B");
    `);

    // 2. Seed Permissions
    console.log('Seeding permissions...');
    const keys = ['INVENTORY_VIEW', 'INVENTORY_ADD', 'INVENTORY_EDIT', 'INVENTORY_DELETE', 'INVENTORY_ADJUST', 'PROCUREMENT_VIEW', 'PROCUREMENT_CREATE', 'PROCUREMENT_APPROVE', 'PROCUREMENT_RECEIVE', 'VENDOR_VIEW', 'VENDOR_MANAGE', 'ADMIN_CONFIG', 'USER_MANAGE', 'RULES_VIEW', 'RULES_MANAGE'];
    for (const k of keys) {
      await client.query(`INSERT INTO "Permission" (id, key, label) VALUES (gen_random_uuid(), $1, $1) ON CONFLICT (key) DO NOTHING`, [k]);
    }

    // 3. Seed Roles
    console.log('Seeding roles...');
    const roles = ['ADMIN', 'PROCUREMENT', 'INVENTORY', 'HR', 'STAFF'];
    for (const r of roles) {
      await client.query(`INSERT INTO "Role" (id, name, description, "updatedAt") VALUES (gen_random_uuid(), $1, $1, now()) ON CONFLICT (name) DO NOTHING`, [r]);
    }

    // 4. Map Admin Role to ALL permissions
    console.log('Linking Admin role to all permissions...');
    const adminRole = await client.query(`SELECT id FROM "Role" WHERE name = 'ADMIN'`);
    const allPerms = await client.query(`SELECT id FROM "Permission"`);
    if (adminRole.rows[0]) {
      for (const p of allPerms.rows) {
        await client.query(`INSERT INTO "_RolePermissions" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [adminRole.rows[0].id, p.id]);
      }
    }
    
    // 5. Migrate Users
    console.log('Mapping existing users to dynamic roles...');
    const users = await client.query(`SELECT id, role FROM "User"`);
    for (const u of users.rows) {
        const roleRecord = await client.query(`SELECT id FROM "Role" WHERE name = $1`, [u.role || 'STAFF']);
        if (roleRecord.rows[0]) {
            await client.query(`INSERT INTO "_UserRoles" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [u.id, roleRecord.rows[0].id]);
        }
    }

    console.log('✅ DATABASE SYNCED SUCCESSFULLY VIA MANUAL SQL.');
  } catch (err) {
    console.error('Fatal sync error:', err.message);
  } finally {
    await client.end();
  }
}

main();
