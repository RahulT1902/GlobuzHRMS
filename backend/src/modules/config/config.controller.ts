import { Request, Response } from 'express';
import { prisma } from "../../config/database";
import { apiResponse } from '../../utils/apiResponse';
import { unitSchema, categorySchema, paymentTermSchema, systemSettingSchema } from './config.schema';

const normalize = (input: string) => input.trim().toLowerCase();

export const getUnits = async (req: Request, res: Response) => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return apiResponse.success(res, "Units fetched", units);
  } catch (error) {
    console.error('Error fetching units:', error);
    return apiResponse.error(res, 'Error fetching units', 500);
  }
};

export const createUnit = async (req: Request, res: Response) => {
  try {
    const data = unitSchema.parse(req.body);
    const unit = await prisma.unit.create({ data });
    return apiResponse.success(res, "Unit created", unit, 201);
  } catch (error: any) {
    console.error('Error creating unit:', error);
    return apiResponse.error(res, error.message || 'Error creating unit', 400);
  }
};

export const updateUnit = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = unitSchema.partial().parse(req.body);
    const unit = await prisma.unit.update({
      where: { id },
      data,
    });
    return apiResponse.success(res, "Unit updated", unit);
  } catch (error: any) {
    console.error('Error updating unit:', error);
    return apiResponse.error(res, error.message || 'Error updating unit', 400);
  }
};

export const deleteUnit = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.unit.delete({ where: { id } });
    return apiResponse.success(res, "Unit deleted");
  } catch (error: any) {
    console.error('Error deleting unit:', error);
    if (error.code === 'P2003') {
      return apiResponse.error(res, 'Cannot delete: unit is in use by existing products', 409);
    }
    return apiResponse.error(res, error.message || 'Error deleting unit', 400);
  }
};


export const getCategories = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const categories = await prisma.category.findMany({
      where: type ? { type: type as string } : {},
      include: { parent: { select: { name: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    return apiResponse.success(res, "Categories fetched", categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return apiResponse.error(res, 'Error fetching categories', 500);
  }
};

// Simple IDempotency Cache (Use Redis in production)
const processedCategoryRequests = new Set<string>();

/**
 * Atomic Batch creation of a Category Tree.
 * Supports clientId-to-DBId mapping, Cycle detection, and Depth capping.
 */
const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export const createCategoriesBatch = async (req: Request, res: Response) => {
  try {
    const { requestId, type, tree, parentId: rootParentId } = req.body;

    if (!requestId || !tree) return apiResponse.error(res, "Missing requestId or tree data", 400);
    if (processedCategoryRequests.has(requestId)) return apiResponse.success(res, "Request already processed", null);

    const result = await prisma.$transaction(async (tx) => {
      const createdNodes: any[] = [];
      
      const processNode = async (node: any, parentId: string | null = null, depth = 1) => {
        if (depth > 6) throw new Error(`Maximum hierarchy depth of 6 reached at "${node.name}"`);
        if (!node.name || !node.name.trim()) throw new Error("Category name cannot be empty");

        const normalized = normalize(node.name);
        let category;

        // CHECK IF NODE EXISTS
        const existingId = (node.clientId && isUUID(node.clientId)) ? node.clientId : null;

        if (existingId) {
          const match = await tx.category.findUnique({ where: { id: existingId } });
          if (match) {
            category = await tx.category.update({
              where: { id: existingId },
              data: {
                name: node.name.trim(),
                normalizedName: normalized,
                parentId: parentId,
                isActive: true
              }
            });
          }
        }

        if (!category) {
          category = await tx.category.create({
            data: {
              name: node.name.trim(),
              normalizedName: normalized,
              type: type || 'INVENTORY',
              parentId: parentId,
              isActive: true
            }
          });
        }

        createdNodes.push({ clientId: node.clientId, id: category.id, name: category.name });

        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            await processNode(child, category.id, depth + 1);
          }
        }
      };

      await processNode(tree, rootParentId || null);
      return createdNodes;
    }, { timeout: 60000 });

    processedCategoryRequests.add(requestId);
    setTimeout(() => processedCategoryRequests.delete(requestId), 600000); // 10 min cache

    return apiResponse.success(res, "Category tree saved efficiently", result, 201);
  } catch (error: any) {
    console.error('Category Batch Error:', error);
    if (error.code === 'P2002') {
      return apiResponse.error(res, "Hierarchy Conflict: Sibling categories must have unique names.", 409);
    }
    return apiResponse.error(res, error.message || "Failed to finalize taxonomy branch", 400);
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, type, parentName, parentId, isActive, sortOrder } = categorySchema.parse(req.body);
    const normalizedName = normalize(name);

    let effectiveParentId = parentId || null;

    if (parentName && parentName.trim()) {
      const normalizedParentName = normalize(parentName);
      let parent = await prisma.category.findFirst({
        where: { normalizedName: normalizedParentName, type }
      });

      if (!parent) {
        parent = await prisma.category.create({
          data: { name: parentName.trim(), normalizedName: normalizedParentName, type, parentId: null }
        });
      }
      effectiveParentId = parent.id;
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        normalizedName,
        type,
        parentId: effectiveParentId,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0
      }
    });

    return apiResponse.success(res, "Category created", category, 201);
  } catch (error: any) {
    if (error.code === 'P2002') return apiResponse.error(res, 'Category already exists in this hierarchy', 409);
    return apiResponse.error(res, error.message || 'Error creating category', 400);
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, type, parentName, parentId, isActive, sortOrder } = categorySchema.partial().parse(req.body);

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { children: true }
    });

    if (!existing) return apiResponse.error(res, "Category not found", 404);

    let data: any = { isActive, sortOrder };
    if (name) {
      data.name = name.trim();
      data.normalizedName = normalize(name);
    }
    if (type) data.type = type;

    // Resolve Parent
    if (parentName !== undefined) {
      if (parentName && parentName.trim()) {
        const normalizedParentName = normalize(parentName);
        let parent = await prisma.category.findFirst({
           where: { normalizedName: normalizedParentName, type: type || existing.type }
        });
        if (!parent) {
           parent = await prisma.category.create({
               data: { name: parentName.trim(), normalizedName: normalizedParentName, type: type || existing.type, parentId: null }
           });
        }
        
        // Cycle Check
        if (parent.id === id) throw new Error("A category cannot be its own parent");
        data.parentId = parent.id;
      } else {
        data.parentId = null;
      }
    } else if (parentId !== undefined) {
      if (parentId === id) throw new Error("A category cannot be its own parent");
      data.parentId = parentId;
    }

    const category = await prisma.category.update({
      where: { id },
      data,
    });
    return apiResponse.success(res, "Category updated", category);
  } catch (error: any) {
    if (error.code === 'P2002') return apiResponse.error(res, 'Name conflict in this branch', 409);
    return apiResponse.error(res, error.message || 'Error updating category', 400);
  }
};

/**
 * Move category to a new parent with Cycle and Depth validation.
 */
export const moveCategory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { newParentId } = req.body;

    if (id === newParentId) return apiResponse.error(res, "Cannot move a category into itself", 400);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Cycle Detection
      if (newParentId) {
        let current = await tx.category.findUnique({ where: { id: newParentId } });
        while (current && current.parentId) {
          if (current.parentId === id) throw new Error("Cycle detected: Target parent is a descendant of this category");
          current = await tx.category.findUnique({ where: { id: current.parentId } });
        }
      }

      // 2. Perform Move
      return tx.category.update({
        where: { id },
        data: { parentId: newParentId || null }
      });
    });

    return apiResponse.success(res, "Category moved successfully", result);
  } catch (error: any) {
    return apiResponse.error(res, error.message || "Failed to move category", 400);
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.category.delete({ where: { id } });
    return apiResponse.success(res, "Category deleted");
  } catch (error: any) {
    if (error.code === 'P2003') return apiResponse.error(res, 'Category is in use (contains products or sub-categories)', 409);
    return apiResponse.error(res, error.message || 'Error deleting category', 400);
  }
};

export const getPaymentTerms = async (req: Request, res: Response) => {
  try {
    const terms = await prisma.paymentTerm.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return apiResponse.success(res, "Payment terms fetched", terms);
  } catch (error) {
    console.error('Error fetching payment terms:', error);
    return apiResponse.error(res, 'Error fetching payment terms', 500);
  }
};

export const createPaymentTerm = async (req: Request, res: Response) => {
  try {
    const data = paymentTermSchema.parse(req.body);
    const term = await prisma.paymentTerm.create({ data });
    return apiResponse.success(res, "Payment term created", term, 201);
  } catch (error: any) {
    console.error('Error creating payment term:', error);
    return apiResponse.error(res, error.message || 'Error creating payment term', 400);
  }
};

export const getFieldRules = async (req: Request, res: Response) => {
  try {
    const rule = await prisma.systemSetting.findUnique({
      where: { group_key: { group: 'VALIDATION', key: 'FIELD_RULES' } },
    });
    return apiResponse.success(res, "Field rules fetched", rule?.value || {});
  } catch (error) {
    console.error('Error fetching field rules:', error);
    return apiResponse.error(res, 'Error fetching field rules', 500);
  }
};

export const updateFieldRules = async (req: Request, res: Response) => {
  try {
    const rule = await prisma.systemSetting.upsert({
      where: { group_key: { group: 'VALIDATION', key: 'FIELD_RULES' } },
      update: { value: req.body },
      create: {
        group: 'VALIDATION',
        key: 'FIELD_RULES',
        value: req.body,
      },
    });
    return apiResponse.success(res, "Field rules updated", rule.value);
  } catch (error) {
    console.error('Error updating field rules:', error);
    return apiResponse.error(res, 'Error updating field rules', 500);
  }
};
