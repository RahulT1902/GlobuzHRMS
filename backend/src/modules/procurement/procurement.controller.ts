import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { ProcurementStatus } from "@prisma/client";
import { apiResponse } from "../../utils/apiResponse";
import { sendEmail, generatePOHtml } from "../../services/email.service";

// Status State Machine
const validTransitions: Record<ProcurementStatus, ProcurementStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["ORDERED", "CANCELLED"],
  ORDERED: ["PARTIALLY_RECEIVED", "COMPLETED", "CANCELLED"],
  PARTIALLY_RECEIVED: ["PARTIALLY_RECEIVED", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: []
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { vendorId, items, totalAmount } = req.body;
    const userId = (req as any).user.id;

    // Financial Validation
    const calculatedTotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return apiResponse.error(res, "Total amount mismatch. Recalculate your order.", 400);
    }

    const order = await prisma.procurementOrder.create({
      data: {
        vendorId,
        totalAmount,
        status: "DRAFT",
        createdById: userId,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        }
      },
      include: { 
        items: true,
        vendor: { select: { name: true } }
      }
    });

    return apiResponse.success(res, "Procurement order created", order, 201);
  } catch (error) {
    console.error("Order Creation Error:", error);
    return apiResponse.error(res, "Failed to create procurement order", 500);
  }
};

export const submitOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const order = await prisma.procurementOrder.findUnique({ where: { id: String(id) } });
    if (!order) return apiResponse.error(res, "Order not found", 404);

    if (!validTransitions[order.status].includes("SUBMITTED")) {
      return apiResponse.error(res, `Cannot transition from ${order.status} to SUBMITTED`, 400);
    }

    const updatedOrder = await prisma.procurementOrder.update({
      where: { id: String(id) },
      data: { 
        status: "SUBMITTED",
        submittedById: userId
      }
    });

    return apiResponse.success(res, "Order submitted", updatedOrder);
  } catch (error) {
    return apiResponse.error(res, "Failed to submit order", 500);
  }
};

export const approveOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = (req as any).user.id;

    const order = await prisma.procurementOrder.findUnique({ where: { id: String(id) } });
    if (!order) return apiResponse.error(res, "Order not found", 404);

    if (!validTransitions[order.status].includes("APPROVED")) {
      return apiResponse.error(res, `Cannot transition from ${order.status} to APPROVED`, 400);
    }

    const updatedOrder = await prisma.procurementOrder.update({
      where: { id: String(id) },
      data: { 
        status: "APPROVED", 
        approvedById: userId,
        approvalNotes: notes?.trim() || null 
      }
    });

    return apiResponse.success(res, "Order approved", updatedOrder);
  } catch (error) {
    return apiResponse.error(res, "Failed to approve order", 500);
  }
};

export const rejectOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = (req as any).user.id;

    const order = await prisma.procurementOrder.findUnique({ where: { id: String(id) } });
    if (!order) return apiResponse.error(res, "Order not found", 404);

    if (!validTransitions[order.status].includes("REJECTED")) {
      return apiResponse.error(res, `Cannot transition from ${order.status} to REJECTED`, 400);
    }

    if (!notes || notes.trim().length === 0) {
      return apiResponse.error(res, "Rejection reason is required.", 400);
    }

    const updatedOrder = await prisma.procurementOrder.update({
      where: { id: String(id) },
      data: { 
        status: "REJECTED", 
        rejectedById: userId,
        rejectionNotes: notes.trim()
      }
    });

    return apiResponse.success(res, "Order rejected", updatedOrder);
  } catch (error) {
    return apiResponse.error(res, "Failed to reject order", 500);
  }
};

export const markAsOrdered = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const order = await prisma.procurementOrder.findUnique({ where: { id: String(id) } });

    if (!order) return apiResponse.error(res, "Order not found", 404);

    if (!validTransitions[order.status].includes("ORDERED")) {
      return apiResponse.error(res, `Cannot transition from ${order.status} to ORDERED`, 400);
    }

    const updatedOrder = await prisma.procurementOrder.update({
      where: { id: String(id) },
      data: { status: "ORDERED" },
      include: {
        vendor: true,
        items: { include: { product: true } },
        createdBy: { select: { email: true, name: true } }
      }
    });

    // Trigger Email Dispatch (Async)
    if (updatedOrder.vendor?.email) {
      const creatorName = updatedOrder.createdBy.name;
      const creatorEmail = updatedOrder.createdBy.email;
      const html = generatePOHtml(updatedOrder, creatorName);
      
      sendEmail({
        to: updatedOrder.vendor.email,
        from: process.env.SYSTEM_EMAIL_FROM || "onboarding@resend.dev",
        replyTo: creatorEmail || "noreply@globuz.com",
        subject: `Purchase Order Issued: PO-${updatedOrder.id.slice(0, 8).toUpperCase()}`,
        html
      }).catch(err => console.error("Email automation failure:", err));
    }

    return apiResponse.success(res, "Order marked as dispatched/ordered to vendor", updatedOrder);
  } catch (error) {
    return apiResponse.error(res, "Failed to mark order as ordered", 500);
  }
};

export const receiveShipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { challanNumber, invoiceNumber, receivedItems, receivedAt, challanDate, invoiceDate } = req.body;

    const order = await prisma.procurementOrder.findUnique({ 
      where: { id: String(id) },
      include: { 
        vendor: { select: { name: true } },
        items: { include: { product: true } } 
      }
    });

    if (!order) return apiResponse.error(res, "Order not found", 404);
    
    if (order.status === "COMPLETED" || order.status === "CANCELLED" || order.status === "DRAFT" || order.status === "SUBMITTED" || order.status === "APPROVED") {
      return apiResponse.error(res, `Cannot receive shipments in status: ${order.status}`, 400);
    }

    if (challanNumber) {
      const existingChallan = await prisma.procurementShipment.findUnique({
        where: { challanNumber_orderId: { challanNumber, orderId: order.id } }
      });
      if (existingChallan) {
        return apiResponse.error(res, `Challan ${challanNumber} already exists for this order`, 400);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const globalShipmentDate = receivedAt ? new Date(receivedAt) : new Date();
      const updatedOrderItems: any[] = [];
      
      // GROUP ITEMS BY DATE to create separate shipments if needed
      const itemsByDate: Record<string, any[]> = {};
      
      for (const r of receivedItems) {
        const itemDateStr = r.receivedAt || receivedAt || new Date().toISOString().split('T')[0];
        if (!itemsByDate[itemDateStr]) itemsByDate[itemDateStr] = [];
        itemsByDate[itemDateStr].push(r);
      }

      for (const [dateStr, itemsInDateGroup] of Object.entries(itemsByDate)) {
        const now = new Date();
        let currentShipmentDate = new Date(dateStr);
        
        // Fix 05:30 AM Bug: If dateStr is just YYYY-MM-DD, it parses as UTC midnight.
        // We should use current time if it's for today, or end-of-day to keep it logically sequenced.
        if (dateStr.length <= 10) {
          const todayStr = now.toISOString().split('T')[0];
          if (dateStr === todayStr) {
            currentShipmentDate = now;
          } else {
            currentShipmentDate.setUTCHours(23, 59, 59, 999);
          }
        }
        
        const shipment = await tx.procurementShipment.create({
          data: {
            orderId: order.id,
            challanNumber: challanNumber || null,
            challanDate: challanDate ? new Date(challanDate) : null,
            invoiceNumber: invoiceNumber || null,
            invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
            createdById: userId,
            receivedAt: currentShipmentDate
          }
        });

        for (const receivedItemData of itemsInDateGroup) {
          const item = order.items.find((i: any) => i.id === receivedItemData.itemId);
          if (!item) continue;

          const incomingQty = Number(receivedItemData.quantity);
          if (incomingQty <= 0) continue;

          const nextReceivedQty = item.receivedQuantity + incomingQty;

          await tx.procurementShipmentItem.create({
            data: {
              shipmentId: shipment.id,
              itemId: item.id,
              productId: item.productId,
              quantity: incomingQty,
              unitPrice: item.unitPrice
            }
          });

          await tx.procurementItem.update({
            where: { id: item.id },
            data: { receivedQuantity: nextReceivedQty }
          });

          // Accurate Stock Logic: Always use the latest product snapshot as the baseline
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { closingStock: true }
          });
          
          const currentStock = product?.closingStock || 0;
          const newStock = currentStock + incomingQty;

          const refParts = [];
          if (challanNumber) refParts.push(`CH: ${challanNumber}`);
          if (invoiceNumber) refParts.push(`INV: ${invoiceNumber}`);
          const referenceName = refParts.length > 0 
            ? refParts.join(' / ') 
            : (order.vendor?.name || "Vendor Delivery");

          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: "PROCUREMENT_IN",
              quantity: incomingQty,
              closingStock: newStock,
              referenceType: "PROCUREMENT_SHIPMENT",
              referenceId: shipment.id,
              referenceName,
              unitCost: item.unitPrice,
              totalCost: incomingQty * item.unitPrice,
              metadata: {
                challanNumber,
                challanDate,
                invoiceNumber,
                invoiceDate
              },
              notes: `Received via PO ${order.id.slice(0,8)}`,
              createdById: userId,
              createdAt: currentShipmentDate
            }
          });

          await tx.product.update({
            where: { id: item.productId },
            data: { closingStock: newStock }
          });
        }
      }

      // Re-fetch items to check if order is complete
      const finalItems = await tx.procurementItem.findMany({ where: { orderId: order.id } });
      const allItemsFullyReceived = finalItems.every(i => i.receivedQuantity >= i.quantity);
      const nextStatus = allItemsFullyReceived ? "COMPLETED" : "PARTIALLY_RECEIVED";
      
      const updatedOrder = await tx.procurementOrder.update({
        where: { id: order.id },
        data: { status: nextStatus as ProcurementStatus },
        include: { 
          vendor: { select: { name: true } },
          createdBy: { select: { name: true } }
        }
      });

      return { updatedOrder };
    }, {
      maxWait: 10000,
      timeout: 30000
    });

    return apiResponse.success(res, `Shipment logged. Order status: ${result.updatedOrder.status}`, result);
  } catch (error: any) {
    return apiResponse.error(res, error.message || "Failed to receive shipment", 500);
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.procurementOrder.findMany({
      include: { 
        vendor: { select: { name: true } },
        createdBy: { select: { name: true } },
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return apiResponse.success(res, "Orders fetched", orders);
  } catch (error) {
    return apiResponse.error(res, "Failed to fetch orders", 500);
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.procurementOrder.findUnique({
      where: { id: String(id) },
      include: { 
        items: { include: { product: true } },
        vendor: true,
        createdBy: { select: { name: true, email: true } }
      }
    });
    if (!order) return apiResponse.error(res, "Order not found", 404);
    return apiResponse.success(res, "Order fetched", order);
  } catch (error) {
    return apiResponse.error(res, "Failed to fetch order", 500);
  }
};

export const getNotificationCounts = async (req: Request, res: Response) => {
  try {
    const permissions = (req as any).user.permissions || [];

    const result = {
      approvals: 0,
      fulfillment: 0,
      total: 0,
      breakdown: {
        submitted: 0,
        approved: 0,
        ordered: 0,
        partial: 0
      }
    };

    // 1. APPROVALS (Needs Action from Admin/Approver)
    if (permissions.includes("PROCUREMENT_APPROVE") || permissions.includes("ADMIN_CONFIG")) {
      result.approvals = await prisma.procurementOrder.count({ 
        where: { status: "SUBMITTED" } 
      });
      result.breakdown.submitted = result.approvals;
    }

    // 2. FULFILLMENT (Needs Action from Staff/Procurement)
    // - APPROVED needs to be ORDERED
    // - ORDERED/PARTIAL needs to be RECEIVED
    if (permissions.includes("PROCUREMENT_RECEIVE") || permissions.includes("PROCUREMENT_CREATE") || permissions.includes("ADMIN_CONFIG")) {
      const fulfillmentStats = await prisma.procurementOrder.groupBy({
        by: ['status'],
        where: { status: { in: ["APPROVED", "ORDERED", "PARTIALLY_RECEIVED"] } },
        _count: true
      });

      fulfillmentStats.forEach(stat => {
        if (stat.status === "APPROVED") result.breakdown.approved = stat._count;
        if (stat.status === "ORDERED") result.breakdown.ordered = stat._count;
        if (stat.status === "PARTIALLY_RECEIVED") result.breakdown.partial = stat._count;
        result.fulfillment += stat._count;
      });
    }

    // Total actionable items for THIS specific user
    result.total = result.approvals + result.fulfillment;

    return apiResponse.success(res, "Actionable counts fetched", result);
  } catch (error) {
    console.error("Notification Count Error:", error);
    return apiResponse.error(res, "Failed to calculate notification counts", 500);
  }
};
