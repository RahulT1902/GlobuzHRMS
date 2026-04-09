import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.category.count();
  console.log(`Current Category Count: ${count}`);
  const sample = await prisma.category.findMany({ take: 5 });
  console.log(JSON.stringify(sample, null, 2));
}
main().finally(() => prisma.$disconnect());
