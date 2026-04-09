const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Attempting to connect to DB...');
  try {
    const count = await prisma.user.count();
    console.log('Success! User count:', count);
  } catch (e) {
    console.error('Failed to connect:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
