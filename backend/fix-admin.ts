import { prisma } from "./src/config/database";
import bcrypt from "bcryptjs";

async function fix() {
  console.log("Forcing Admin User and Role creation...");
  const hashedPassword = await bcrypt.hash("Admin@12345", 12);

  try {
    // 1. Create ADMIN role first to avoid foreign key issues
    const adminRole = await (prisma as any).role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: {
        name: "ADMIN",
        description: "Super Administrator"
      }
    });

    // 2. Create/Update Admin User
    const adminUser = await (prisma as any).user.upsert({
      where: { email: "admin@globuzinc.com" },
      update: {
        passwordHash: hashedPassword,
        status: "ACTIVE",
        role: "ADMIN",
        phone: "+919876543210",
        roles: { connect: { id: adminRole.id } }
      },
      create: {
        name: "Admin",
        email: "admin@globuzinc.com",
        phone: "+919876543210",
        passwordHash: hashedPassword,
        status: "ACTIVE",
        role: "ADMIN",
        roles: { connect: { id: adminRole.id } }
      }
    });

    console.log("SUCCESS: Admin User created/restored with ID:", adminUser.id);
  } catch (err) {
    console.error("FATAL ERROR during restoration:", err);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
