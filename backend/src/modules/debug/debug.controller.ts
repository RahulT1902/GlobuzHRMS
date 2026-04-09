import { Request, Response } from "express";
import { prisma } from "../../config/database";

export const validateStockDrift = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany();
    const driftReport = [];

    for (const product of products) {
      // Calculate real stock from transactions
      const transactions = await prisma.inventoryTransaction.findMany({
        where: { productId: product.id }
      });

      const calculatedStock = transactions.reduce((sum, tx) => {
        return tx.type === 'IN' || tx.type === 'ADJUSTMENT' ? sum + tx.quantity : sum - tx.quantity;
      }, 0);

      const isMatching = calculatedStock === product.closingStock;

      if (!isMatching) {
        driftReport.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          snapshotStock: product.closingStock,
          ledgerStock: calculatedStock,
          drift: product.closingStock - calculatedStock
        });
      }
    }

    res.json({
      timestamp: new Date(),
      status: driftReport.length === 0 ? "HEALTHY" : "DRIFT_DETECTED",
      totalProductsChecked: products.length,
      driftCount: driftReport.length,
      drifts: driftReport
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to validate stock drift", error });
  }
};

export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const [userCount, vendorCount, poCount, productCount] = await Promise.all([
      prisma.user.count(),
      prisma.vendor.count(),
      prisma.procurementOrder.count(),
      prisma.product.count()
    ]);

    res.json({
      users: userCount,
      vendors: vendorCount,
      procurementOrders: poCount,
      products: productCount,
      database: "CONNECTED"
    });
  } catch (error) {
    res.status(500).json({ message: "Health check failed", error });
  }
};
