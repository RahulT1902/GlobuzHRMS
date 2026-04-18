import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2, "Name required"),
  categoryId: z.preprocess((val) => (val === "" ? undefined : val), z.string().min(1).optional()),
  sku: z.string().min(1, "SKU required"),
  purchasePrice: z.number().positive("Price must be positive"),
  unitId: z.preprocess((val) => (val === "" ? undefined : val), z.string().min(1).optional()),
  description: z.string().optional(),
  images: z.array(z.string().url()).optional().default([]),
  initialStock: z.number().min(0).default(0),
  minThreshold: z.number().min(0).default(5),
});

export const updateProductSchema = createProductSchema.partial().extend({
  currentStock: z.number().min(0).optional(),
});


export const adjustStockSchema = z.object({
  type: z.enum(["INITIAL_STOCK", "PROCUREMENT_IN", "SALES_OUT", "MANUAL_IN", "MANUAL_OUT", "RECONCILIATION", "TRANSFER"]),
  quantity: z.number().positive("Quantity must be positive"),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  referenceName: z.string().optional(),
  unitCost: z.number().nullable().optional(),
  totalCost: z.number().nullable().optional(),
  notes: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
