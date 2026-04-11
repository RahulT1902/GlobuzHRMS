import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { apiResponse } from "../../utils/apiResponse";

/**
 * Inventory Intelligence Explorer
 * Provides advanced filtering and paginated inventory data
 */
export const getInventoryExplorer = async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      categoryId, 
      status, 
      vendorId, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 25 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build Where Clause
    const where: any = { isDeleted: false };

    // Global Search (Name, SKU)
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { sku: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    // Category Filter (Including Children)
    if (categoryId) {
      const children = await prisma.category.findMany({
        where: { parentId: String(categoryId) },
        select: { id: true }
      });
      const categoryIds = [String(categoryId), ...children.map(c => c.id)];
      where.categoryId = { in: categoryIds };
    }

    // Purchase Date Range
    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) where.purchaseDate.gte = new Date(String(startDate));
      if (endDate) where.purchaseDate.lte = new Date(String(endDate));
    }

    // Stock Status Filtering
    // Note: LOW_STOCK / IN_STOCK use post-query filter since Prisma
    // doesn't support field-to-field comparisons natively.
    // OUT_OF_STOCK is a simple value comparison and can go in where clause.
    if (status === 'OUT_OF_STOCK') {
      where.closingStock = { lte: 0 };
    }
    // LOW_STOCK and IN_STOCK are filtered in-memory after the query.

    // Vendor Filtering (via ProcurementShipmentItem)
    if (vendorId) {
       where.shipmentItems = {
         some: {
           shipment: {
             order: {
               vendorId: String(vendorId)
             }
           }
         }
       };
    }

    let [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true } },
          unit: { select: { name: true } },
        },
        orderBy: { purchaseDate: 'desc' },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    // Post-query filter for field-to-field comparison (Prisma limitation)
    if (status === 'LOW_STOCK') {
      products = products.filter(p => p.closingStock > 0 && p.closingStock <= p.minThreshold);
    } else if (status === 'IN_STOCK') {
      products = products.filter(p => p.closingStock > p.minThreshold);
    }

    return apiResponse.success(res, "Inventory report fetched", {
      products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error("Inventory Explorer Error:", error);
    return apiResponse.error(res, "Failed to generate inventory explorer report", 500);
  }
};

/**
 * Valuation & Summary Analytics
 * Provides financial aggregates and stock health metrics
 */
export const getValuationDashboard = async (req: Request, res: Response) => {
  try {
    // 1. Total Valuation and Item Counts
    const products = await prisma.product.findMany({
      where: { isDeleted: false },
      select: {
        purchasePrice: true,
        closingStock: true,
        minThreshold: true,
      }
    });

    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(p => {
      totalValuation += (p.purchasePrice * p.closingStock);
      if (p.closingStock <= 0) outOfStockCount++;
      else if (p.closingStock <= p.minThreshold) lowStockCount++;
    });

    // 2. Active Vendors in Inventory
    const vendorCount = await prisma.vendor.count({
      where: { status: 'ACTIVE' }
    });

    // 3. Category Distribution (Top 5)
    const categoryStats = await prisma.product.groupBy({
      by: ['categoryId'],
      _count: { id: true },
      where: { isDeleted: false },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });

    // Fetch category names for the top 5
    const categoryNames = await prisma.category.findMany({
      where: { id: { in: categoryStats.map(c => c.categoryId).filter(Boolean) as string[] } },
      select: { id: true, name: true }
    });

    const categoryDistribution = categoryStats.map(stat => ({
      name: categoryNames.find(c => c.id === stat.categoryId)?.name || 'Uncategorized',
      count: stat._count.id
    }));

    return apiResponse.success(res, "Valuation dashboard data fetched", {
      totalValuation,
      itemCount: products.length,
      lowStockCount,
      outOfStockCount,
      vendorCount,
      categoryDistribution
    });
  } catch (error) {
    console.error("Valuation Dashboard Error:", error);
    return apiResponse.error(res, "Failed to generate valuation summary", 500);
  }
};
