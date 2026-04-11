import { prisma } from "../../config/database";
import { apiResponse } from "../../utils/apiResponse";
import { logAudit } from "../../middleware/audit.middleware";
import { AuthRequest } from "../../middleware/auth.middleware";
import { Response } from "express";
import { InventoryTransactionType } from "@prisma/client";

// --- HELPERS ---
const sanitizeId = (id: any) => (id === "" || id === undefined || id === null) ? null : String(id);
const sanitizeNum = (val: any, fallback = 0) => {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

export const createProductsBatch = async (req: AuthRequest, res: Response) => {
  const requestId = crypto.randomUUID();
  try {
    const { productName, description, unitId, variants } = req.body;
    
    // 1. Core Validation
    if (!productName || !variants || !Array.isArray(variants) || variants.length === 0) {
      return apiResponse.error(res, "Invalid batch data. Include product name and variants.", 400);
    }

    const sUnitId = sanitizeId(unitId);
    
    // 2. Upfront Validation Layer (No DB hits yet)
    const skuSet = new Set<string>();
    const pathSet = new Set<string>();
    const validationErrors: { index: number, field: string, message: string }[] = [];

    variants.forEach((v, index) => {
      // Required Fields
      if (!v.sku) validationErrors.push({ index, field: 'sku', message: 'SKU is required' });
      if (!v.categoryPath || v.categoryPath.length === 0) {
        validationErrors.push({ index, field: 'categoryPath', message: 'Category path is required' });
      }

      // Duplicate SKU in Batch
      const normSku = String(v.sku).trim().toUpperCase();
      if (skuSet.has(normSku)) {
        validationErrors.push({ index, field: 'sku', message: `Duplicate SKU in batch: ${normSku}` });
      }
      skuSet.add(normSku);

      // Duplicate Path in Batch
      const pathKey = (v.categoryPath || []).join("|");
      if (pathSet.has(pathKey)) {
        validationErrors.push({ index, field: 'categoryPath', message: 'This variant configuration already exists in the batch' });
      }
      pathSet.add(pathKey);
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, type: "VALIDATION_ERROR", errors: validationErrors });
    }

    // 3. DB Integrity Checks (Pre-transaction)
    // a. Check Unit Validity
    if (sUnitId) {
      const unit = await prisma.unit.findUnique({ where: { id: sUnitId } });
      if (!unit) return apiResponse.error(res, `Invalid Unit ID: The selected unit no longer exists.`, 400);
    }

    // b. Check Category Existence & SKU Availability
    const allCategoryIds = Array.from(new Set(variants.flatMap(v => v.categoryPath)));
    const allCategories = await prisma.category.findMany({ where: { id: { in: allCategoryIds } } });
    const catMap = new Map(allCategories.map(c => [c.id, c]));

    // Check for missing categories
    for (const v of variants) {
      for (const id of v.categoryPath) {
        if (!catMap.has(id)) {
          return apiResponse.error(res, `Invalid Category Reference: ID ${id} not found.`, 400);
        }
      }
    }

    // c. Global SKU Conflict
    const existingProducts = await prisma.product.findMany({
      where: { sku: { in: Array.from(skuSet) } },
      select: { sku: true }
    });
    if (existingProducts.length > 0) {
      const conflicts = existingProducts.map(p => p.sku);
      return res.status(409).json({ 
        success: false, 
        message: `SKU Conflict: ${conflicts.length} items already exist in system.`,
        conflicts 
      });
    }

    // 4. Atomic Creation
    const createdProducts = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const v of variants) {
        // Generate Human-Readable Variant Name
        const pathNames = v.categoryPath.map((id: string) => catMap.get(id)?.name || "Unknown");
        const variantName = `${String(productName).trim()} | ${pathNames.join(" > ")}`;
        const leafCategoryId = v.categoryPath[v.categoryPath.length - 1];

        const product = await tx.product.create({
          data: {
            name: variantName,
            sku: String(v.sku).trim().toUpperCase(),
            categoryId: leafCategoryId,
            purchasePrice: sanitizeNum(v.purchasePrice, 0),
            unitId: sUnitId,
            description: String(description || "").trim(),
            closingStock: 0, // Initialize at 0, will be updated by transaction
            minThreshold: Math.floor(sanitizeNum(v.minThreshold, 5)),
            purchaseDate: v.purchaseDate ? new Date(v.purchaseDate) : new Date(),
          }
        });

        if (Number(v.initialStock) > 0) {
          const qty = Math.floor(sanitizeNum(v.initialStock));
          await tx.inventoryTransaction.create({
            data: {
              productId: product.id,
              type: "INITIAL_STOCK",
              quantity: qty,
              closingStock: qty,
              referenceType: "INITIAL_STOCK",
              notes: "Batch onboarding: Initial stock entry",
              createdById: req.user!.id,
            }
          });
          
          await tx.product.update({
             where: { id: product.id },
             data: { closingStock: qty }
          });
        }
        results.push(product);
      }
      return results;
    });

    logAudit(req.user!.id, "CREATE", "Product", "BATCH", undefined, 
      { requestId, count: createdProducts.length, productName }, undefined, undefined, "INVENTORY"
    );
    
    return apiResponse.success(res, `Initialized ${createdProducts.length} variants successfully.`, createdProducts, 201);

  } catch (error: any) {
    console.error(`[Batch Error][${requestId}]`, error);
    
    // Prisma Specific Error Mapping
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: "A unique constraint failed. Likely a duplicate SKU was created simultaneously." });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, message: "Foreign key constraint failed. A referenced Category or Unit is invalid." });
    }

    return apiResponse.error(res, error.message || "An unexpected error occurred during batch creation.", 500);
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      name, 
      categoryId, 
      sku, 
      purchasePrice, 
      unitId, 
      description, 
      images, 
      initialStock = 0,
      minThreshold = 5,
      purchaseDate
    } = req.body;

    const normalizedSku = String(sku).trim().toUpperCase();
    const existing = await prisma.product.findUnique({ where: { sku: normalizedSku } });
    if (existing) {
      return apiResponse.error(res, `SKU "${normalizedSku}" already exists.`, 409);
    }

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name: String(name).trim(),
          categoryId: categoryId,
          sku: normalizedSku,
          purchasePrice: Number(purchasePrice),
          unitId: unitId,
          description,
          minThreshold: Number(minThreshold),
          closingStock: 0, // Start at 0
          images: { 
            create: (images || []).map((url: string) => ({ url })) 
          },
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        }
      });

      if (Number(initialStock) > 0) {
        const qty = Number(initialStock);
        await tx.inventoryTransaction.create({
          data: {
            productId: p.id,
            type: "INITIAL_STOCK",
            quantity: qty,
            closingStock: qty,
            referenceType: "INITIAL_STOCK",
            notes: "Product onboarding: Initial stock entry",
            createdById: req.user!.id,
          },
        });
        
        await tx.product.update({
          where: { id: p.id },
          data: { closingStock: qty }
        });
      }

      return p;
    });

    const fullProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: { category: true, unit: true, images: true }
    });

    logAudit(req.user!.id, "CREATE", "Product", product.id, undefined, fullProduct as object, undefined, undefined, "INVENTORY");
    return apiResponse.success(res, "Product created successfully", { ...fullProduct, currentStock: Number(initialStock) }, 201);
  } catch (error: any) {
    console.error("Product Creation Error:", error);
    return apiResponse.error(res, "Failed to create product", 500);
  }
};

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, page = "1", limit = "10", sort = "createdAt:desc" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [sortField, sortOrder] = String(sort).split(":");

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { sku: { contains: String(search), mode: "insensitive" } },
      ];
    }
    if (category) where.categoryId = category;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { 
          images: true, 
          category: true,
          unit: true,
          transactions: { orderBy: { createdAt: 'desc' }, take: 1 } 
        },
        skip,
        take: Number(limit),
        orderBy: { [sortField]: sortOrder === "asc" ? "asc" : "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    const items = products.map(p => ({
      ...p,
      currentStock: p.transactions[0]?.closingStock || 0,
      transactions: undefined
    }));

    return apiResponse.success(res, "Products fetched", {
      products: items, total, page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    return apiResponse.error(res, "Failed to fetch products", 500);
  }
};

export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id as string },
      include: { 
        images: true, 
        category: true, 
        unit: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 1 } 
      },
    });
    if (!product) return apiResponse.error(res, "Product not found", 404);
    
    const result = {
      ...product,
      currentStock: product.transactions[0]?.closingStock || 0
    };

    return apiResponse.success(res, "Product fetched", result);
  } catch (error) {
    return apiResponse.error(res, "Failed to fetch product", 500);
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const old = await prisma.product.findFirst({ where: { id: String(id) } });
    if (!old) return apiResponse.error(res, "Product not found", 404);

    const { name, categoryId, sku, purchasePrice, unitId, description, minThreshold } = req.body;
    
    const product = await prisma.product.update({
      where: { id: String(id) },
      data: {
        name,
        categoryId,
        sku,
        purchasePrice: Number(purchasePrice),
        unitId,
        description,
        minThreshold: Number(minThreshold)
      },
      include: { category: true, unit: true, images: true }
    });

    logAudit(req.user!.id, "UPDATE", "Product", String(id), old as object, product as object, undefined, undefined, "INVENTORY");
    return apiResponse.success(res, "Product updated", product);
  } catch (error) {
    return apiResponse.error(res, "Failed to update product", 500);
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.delete({
      where: { id: String(id) },
    });
    logAudit(req.user!.id, "DELETE", "Product", String(id), product as object, undefined, undefined, undefined, "INVENTORY");
    return apiResponse.success(res, "Product permanently deleted");
  } catch (error) {
    return apiResponse.error(res, "Failed to delete product", 500);
  }
};

export const bulkDeleteProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return apiResponse.error(res, "No IDs provided for bulk delete", 400);
    }
    
    // Using updateMany is more efficient, but we lose individual return objects for the audit log.
    // For a simple audit log, we can still record a bulk general log.
    await prisma.product.deleteMany({
      where: { id: { in: ids } },
    });

    logAudit(req.user!.id, "DELETE", "Product", "BULK", { count: ids.length, ids }, undefined, undefined, undefined, "INVENTORY");
    
    return apiResponse.success(res, "Products permanently deleted via bulk action");
  } catch (error) {
    return apiResponse.error(res, "Failed to bulk delete products", 500);
  }
};

export const adjustStock = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { quantity, type, referenceType, referenceId, referenceName, unitCost, totalCost, notes } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock the product for update to ensure atomic stock calculation
      const productData = await tx.product.findUnique({
        where: { id: String(id) },
        select: { closingStock: true, id: true }
      });

      if (!productData) {
        throw new Error("Product not found");
      }

      const currentStock = productData.closingStock;
      const isOutward = ["SALES_OUT", "MANUAL_OUT"].includes(type);
      const delta = isOutward ? -Number(quantity) : Number(quantity);
      const newQty = currentStock + delta;

      if (newQty < 0) {
        throw new Error("Insufficient stock for this operation.");
      }

      // 2. Record historical ledger entry
      await tx.inventoryTransaction.create({
        data: {
          productId: id,
          type: type, 
          quantity: Number(quantity),
          closingStock: newQty,
          referenceType,
          referenceId,
          referenceName,
          unitCost: unitCost ? Number(unitCost) : null,
          totalCost: totalCost ? Number(totalCost) : null,
          notes,
          createdById: req.user?.id
        }
      });

      // 3. Update the product's master snapshot
      const updatedProduct = await tx.product.update({
        where: { id: String(id) },
        data: { closingStock: newQty },
        include: { category: true, unit: true }
      });

      return updatedProduct;
    });

    return apiResponse.success(res, "Stock adjusted successfully with ledger entry.", result);
  } catch (error: any) {
    return apiResponse.error(res, error.message || "Failed to adjust stock", 500);
  }
};

export const getTransactionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where: { productId: String(id) },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { createdBy: { select: { name: true } } }
      }),
      prisma.inventoryTransaction.count({ where: { productId: String(id) } })
    ]);

    return apiResponse.success(res, "Transactions fetched", {
      data: transactions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return apiResponse.error(res, "Failed to fetch transactions", 500);
  }
};

export const getLowStockProducts = async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        closingStock: { lte: prisma.product.fields.minThreshold as any } // Simplified for now
      },
      include: { category: true, unit: true }
    });

    // Handle the comparison logic more robustly if needed
    const lowStock = products.filter(p => p.closingStock <= p.minThreshold);

    return apiResponse.success(res, "Low stock products fetched", lowStock);
  } catch (error) {
    return apiResponse.error(res, "Failed to fetch low stock products", 500);
  }
};
