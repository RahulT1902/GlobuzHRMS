
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@globuzinc.com' }
    });
    console.log('USER_FOUND:', JSON.stringify(user, null, 2));
  } catch (err) {
    console.error('ERROR_CHECKING_USER:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
