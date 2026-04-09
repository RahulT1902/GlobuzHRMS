const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing Role model connectivity...');
  try {
    const roles = await prisma.role.findMany();
    console.log('Success! Role count:', roles.length);
  } catch (e) {
    console.error('Failed or Model not found:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
