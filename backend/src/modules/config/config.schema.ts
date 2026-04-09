import { z } from 'zod';

export const unitSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).toUpperCase(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['INVENTORY', 'VENDOR']),
  parentId: z.string().uuid().nullable().optional(),
  parentName: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const paymentTermSchema = z.object({
  name: z.string().min(1),
  days: z.number().int().nonnegative(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const systemSettingSchema = z.object({
  group: z.string().min(1),
  key: z.string().min(1),
  value: z.any(),
});
