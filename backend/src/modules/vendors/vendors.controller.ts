import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { apiResponse } from "../../utils/apiResponse";

export const getAllVendors = async (req: Request, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
      include: {
        category: true,
        paymentTerm: true,
        _count: {
          select: { procurementOrders: true }
        }
      }
    });
    return apiResponse.success(res, "Vendors fetched", vendors);
  } catch (error) {
    return apiResponse.error(res, "Failed to fetch vendors", 500);
  }
};

export const getVendorById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        category: true,
        paymentTerm: true,
        procurementOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    if (!vendor) return apiResponse.error(res, "Vendor not found", 404);
    return apiResponse.success(res, "Vendor fetched", vendor);
  } catch (error) {
    return apiResponse.error(res, "Failed to fetch vendor", 500);
  }
};

export const createVendor = async (req: Request, res: Response) => {
  try {
    const { name, contactPerson, email, phone, categoryId, address, taxId, paymentTermId } = req.body;

    // 1. Unique Email Check
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.vendor.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ message: "Vendor with this email already exists." });
    }

    const vendor = await prisma.vendor.create({
      data: { 
        name: String(name).trim(), 
        contactPerson: String(contactPerson || "").trim(), 
        email: normalizedEmail, 
        phone, 
        categoryId: categoryId, 
        address,
        taxId,
        paymentTermId: paymentTermId
      },
      include: { category: true, paymentTerm: true }
    });
    return apiResponse.success(res, "Vendor created", vendor, 201);
  } catch (error) {
    console.error("Vendor Creation Error:", error);
    return apiResponse.error(res, "Failed to create vendor", 500);
  }
};

export const updateVendor = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;
    const vendor = await prisma.vendor.update({
      where: { id },
      data,
      include: { category: true, paymentTerm: true }
    });
    return apiResponse.success(res, "Vendor updated", vendor);
  } catch (error) {
    return apiResponse.error(res, "Failed to update vendor", 500);
  }
};

export const deleteVendor = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    // Check for existing orders
    const ordersCount = await prisma.procurementOrder.count({ where: { vendorId: id } });
    if (ordersCount > 0) {
      return apiResponse.error(res, "Cannot delete vendor with existing procurement orders", 400);
    }
    await prisma.vendor.delete({ where: { id } });
    return apiResponse.success(res, "Vendor deleted successfully");
  } catch (error) {
    return apiResponse.error(res, "Failed to delete vendor", 500);
  }
};
