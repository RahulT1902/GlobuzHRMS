import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const vendors = await prisma.vendor.findMany();
  console.log(JSON.stringify(vendors, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
