const { Client } = require('pg');

const DATABASE_URL = "postgresql://neondb_owner:npg_Eo8kGJWBj0Yh@ep-shiny-band-an81rmi8-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('--- Prisma Schema Alignment Script ---');

  try {
    // 1. Rename junction tables to match Prisma implicit M2M naming convention
    // Permission <-> Role => _PermissionToRole (alphabetical: P < R)
    // Role <-> User => _RoleToUser (alphabetical: R < U)
    console.log('Renaming junction tables to match Prisma conventions...');

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE tablename = '_RolePermissions') AND
           NOT EXISTS (SELECT FROM pg_tables WHERE tablename = '_PermissionToRole') THEN
          ALTER TABLE "_RolePermissions" RENAME TO "_PermissionToRole";
          RAISE NOTICE 'Renamed _RolePermissions to _PermissionToRole';
        ELSE
          RAISE NOTICE '_RolePermissions already renamed or _PermissionToRole already exists';
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE tablename = '_UserRoles') AND
           NOT EXISTS (SELECT FROM pg_tables WHERE tablename = '_RoleToUser') THEN
          ALTER TABLE "_UserRoles" RENAME TO "_RoleToUser";
          RAISE NOTICE 'Renamed _UserRoles to _RoleToUser';
        ELSE
          RAISE NOTICE '_UserRoles already renamed or _RoleToUser already exists';
        END IF;
      END $$;
    `);

    // 2. Rename indexes too
    console.log('Aligning indexes...');
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_indexes WHERE indexname = '_RolePermissions_AB_unique') THEN
          ALTER INDEX "_RolePermissions_AB_unique" RENAME TO "_PermissionToRole_AB_unique";
        END IF;
        IF EXISTS (SELECT FROM pg_indexes WHERE indexname = '_RolePermissions_B_index') THEN
          ALTER INDEX "_RolePermissions_B_index" RENAME TO "_PermissionToRole_B_index";
        END IF;
        IF EXISTS (SELECT FROM pg_indexes WHERE indexname = '_UserRoles_AB_unique') THEN
          ALTER INDEX "_UserRoles_AB_unique" RENAME TO "_RoleToUser_AB_unique";
        END IF;
        IF EXISTS (SELECT FROM pg_indexes WHERE indexname = '_UserRoles_B_index') THEN
          ALTER INDEX "_UserRoles_B_index" RENAME TO "_RoleToUser_B_index";
        END IF;
      END $$;
    `);

    // 3. Add userPermissions column to User if it doesn't exist
    console.log('Adding userPermissions column to User...');
    await client.query(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "userPermissions" TEXT[] NOT NULL DEFAULT '{}';
    `);

    // 4. Verify state
    const tables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('Role', 'Permission', '_PermissionToRole', '_RoleToUser')
      ORDER BY tablename;
    `);
    console.log('✅ DB tables verified:', tables.rows.map(r => r.tablename).join(', '));

    const permCount = await client.query('SELECT COUNT(*) FROM "Permission"');
    const roleCount = await client.query('SELECT COUNT(*) FROM "Role"');
    const userCols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name IN ('role', 'permissions', 'userPermissions', 'tokenVersion')
    `);
    
    console.log(`✅ Permissions: ${permCount.rows[0].count}, Roles: ${roleCount.rows[0].count}`);
    console.log(`✅ User columns: ${userCols.rows.map(r => r.column_name).join(', ')}`);
    console.log('✅ PRISMA ALIGNMENT COMPLETE');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
