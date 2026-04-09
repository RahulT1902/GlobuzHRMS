import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  console.log("--- Units ---");
  const units = await prisma.unit.findMany();
  console.log(JSON.stringify(units, null, 2));

  console.log("\n--- Categories ---");
  const categories = await prisma.category.findMany();
  console.log(JSON.stringify(categories, null, 2));

  console.log("\n--- Payment Terms ---");
  const terms = await prisma.paymentTerm.findMany();
  console.log(JSON.stringify(terms, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
