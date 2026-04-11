import { prisma } from "./src/config/database";

async function diag() {
  const user = await (prisma as any).user.findFirst({
    where: { OR: [{ email: "admin@globuzinc.com" }, { phone: "+919876543210" }] },
    include: { roles: true }
  });
  console.log("DIAG USER:", JSON.stringify(user, null, 2));
}

diag();
