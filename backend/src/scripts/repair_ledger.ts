import { prisma } from "../config/database";

async function fixLedger() {
  const SKU = "SUN-SUN-3-M-500";
  console.log(`Phase 1: Locating SKU ${SKU}...`);

  const product = await prisma.product.findUnique({
    where: { sku: SKU },
    include: { transactions: { orderBy: { createdAt: 'asc' } } }
  });

  if (!product) {
    console.error("Product not found!");
    process.exit(1);
  }

  console.log(`Found product: ${product.name} (Current Stock: ${product.closingStock})`);
  console.log(`Found ${product.transactions.length} transactions.`);

  // PHASE 2: Chronological Re-alignment
  // User says: Initial Stock was first, then Purchases, then Usage.
  // We identify the Initial Stock entry (9:20 PM)
  const initialStockTx = product.transactions.find(t => t.type === 'INITIAL_STOCK');
  if (!initialStockTx) {
    console.error("Initial stock transaction not found!");
    process.exit(1);
  }

  const baseTime = initialStockTx.createdAt;
  console.log(`Initial Stock found at: ${baseTime.toISOString()}`);

  // We identify the Purchases that are stuck at 05:30 AM (UTC midnight + offset)
  const misplacedPurchases = product.transactions.filter(t => 
    t.type === 'PROCUREMENT_IN' && t.createdAt < baseTime
  );

  console.log(`Re-aligning ${misplacedPurchases.length} misplaced purchases to follow Initial Stock...`);

  // Update timestamps to be slightly after Initial Stock
  for (let i = 0; i < misplacedPurchases.length; i++) {
    const newTime = new Date(baseTime.getTime() + (i + 1) * 60000); // 1 minute intervals
    await prisma.inventoryTransaction.update({
      where: { id: misplacedPurchases[i].id },
      data: { createdAt: newTime }
    });
  }

  // PHASE 3: Running Balance Recalculation
  // Now fetch the re-aligned chain
  const updatedTransactions = await prisma.inventoryTransaction.findMany({
    where: { productId: product.id },
    orderBy: { createdAt: 'asc' }
  });

  let runningBalance = 0;
  console.log("\n--- RECalculating Ledger Chain ---");

  for (const tx of updatedTransactions) {
    const isOutward = ["SALES_OUT", "MANUAL_OUT"].includes(tx.type);
    const qty = Number(tx.quantity);
    
    if (isOutward) {
      runningBalance -= qty;
    } else {
      runningBalance += qty;
    }

    console.log(`[${tx.type}] Qty: ${tx.quantity} | New Running Bal: ${runningBalance} (Old was: ${tx.closingStock})`);

    // Update the transaction's closingStock record
    await prisma.inventoryTransaction.update({
      where: { id: tx.id },
      data: { closingStock: runningBalance }
    });
  }

  // PHASE 4: Final Product Sync
  console.log(`\nPhase 4: Updating Master Product closingStock to ${runningBalance}`);
  await prisma.product.update({
    where: { id: product.id },
    data: { closingStock: runningBalance }
  });

  console.log("\n=== REPAIR COMPLETE ===");
}

fixLedger()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
