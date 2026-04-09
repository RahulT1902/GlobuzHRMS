const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { isDeleted: true },
    select: { id: true }
  });

  const ids = products.map(p => p.id);
  if (ids.length === 0) {
    console.log('No soft-deleted products found.');
    return;
  }

  console.log(`Deleting relations for ${ids.length} products...`);
  
  await prisma.inventoryTransaction.deleteMany({ where: { productId: { in: ids } } });
  await prisma.stockReconciliation.deleteMany({ where: { productId: { in: ids } } });
  await prisma.procurementItem.deleteMany({ where: { productId: { in: ids } } });
  await prisma.procurementShipmentItem.deleteMany({ where: { productId: { in: ids } } });
  await prisma.productImage.deleteMany({ where: { productId: { in: ids } } });

  console.log('Deleting products...');
  const res = await prisma.product.deleteMany({ where: { id: { in: ids } } });
  console.log(`Successfully deleted ${res.count} products.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
