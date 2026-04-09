import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Create Product
router.post('/', authenticate, authorize(['ADMIN', 'PROCUREMENT']), async (req, res) => {
  const { name, category, subcategory, sku, quality, purchasePrice, discount, unit, unitValue, description, images, initialStock, minThreshold } = req.body;

  try {
    const product = await prisma.product.create({
      data: {
        name,
        category,
        subcategory,
        sku,
        quality,
        purchasePrice,
        discount,
        unit,
        unitValue,
        description,
        images: {
          create: images?.map((url: string) => ({ url })) || []
        },
        stock: {
          create: {
            quantity: initialStock || 0,
            minThreshold: minThreshold || 0
          }
        }
      },
      include: {
        images: true,
        stock: true
      }
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// List Products
router.get('/', authenticate, async (req, res) => {
  const { search, category, page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { sku: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    if (category) {
      where.category = String(category);
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { images: true, stock: true },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Low Stock Report
router.get('/low-stock', authenticate, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        stock: {
          quantity: {
            lt: prisma.inventoryStock.fields.minThreshold
          }
        }
      },
      include: { stock: true }
    });
    // Prisma lt fields comparison is tricky, better to use queryRaw or manual filter for now
    // Actually, prisma 5+ supports field references, but let's do a simple filter if it's small or raw query
    const allLowStock = await prisma.inventoryStock.findMany({
      where: {
        AND: [
          { quantity: { lt: 0 } }, // placeholder
        ]
      },
      include: { product: true }
    });

    // Correct way for field comparison in Prisma:
    const lowStock = await prisma.$queryRaw`
      SELECT p.*, s.quantity, s."minThreshold" 
      FROM "Product" p
      JOIN "InventoryStock" s ON p.id = s."productId"
      WHERE s.quantity < s."minThreshold"
    `;

    res.json(lowStock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Product by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { images: true, stock: true }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Product
router.put('/:id', authenticate, authorize(['ADMIN', 'PROCUREMENT']), async (req, res) => {
  const { name, category, SKU, price, unit, description, quantity, minThreshold } = req.body;

  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        category,
        sku: SKU,
        purchasePrice: price,
        unit,
        description,
        stock: {
          update: {
            quantity,
            minThreshold
          }
        }
      },
      include: { stock: true }
    });

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Product
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
