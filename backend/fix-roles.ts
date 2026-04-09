import { prisma } from "./src/config/database";

async function main() {
  const admin = await prisma.user.findFirst({
    where: { email: "admin@globuzinc.com" },
    include: { roles: { include: { permissions: true } } }
  });
  console.log("Admin Roles in DB:");
  console.log(JSON.stringify(admin?.roles, null, 2));

  if (admin && admin.roles.length === 0) {
    const role = await prisma.role.findUnique({ where: { name: "ADMIN" } });
    if (role) {
      await prisma.user.update({
         where: { id: admin.id },
         data: { roles: { connect: { id: role.id } } }
      });
      console.log("Successfully connected ADMIN role manually.");
    } else {
      console.log("No ADMIN role found in the database. Seed didn't create it!");
    }
  }
}

main().finally(() => prisma.$disconnect());
