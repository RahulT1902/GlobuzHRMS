const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function check() {
  const email = "admin@globuzinc.com";
  const pass = "Admin@12345";
  
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log("❌ User not found in database.");
    return;
  }
  
  console.log("✅ User found:", user.email);
  console.log("User Role:", user.role);
  console.log("User Status:", user.status);
  
  const isMatch = await bcrypt.compare(pass, user.passwordHash);
  if (isMatch) {
    console.log("✅ Password matches hashed version in DB.");
  } else {
    console.log("❌ Password DOES NOT match.");
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
