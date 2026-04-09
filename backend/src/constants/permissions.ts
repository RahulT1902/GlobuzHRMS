/**
 * MODULE_ACTION Naming Convention
 * Central Source of Truth for all operational rights in Globuzinc HRMS.
 */
export const PERMISSIONS = {
  // Inventory Module
  INVENTORY_VIEW: "INVENTORY_VIEW",
  INVENTORY_ADD: "INVENTORY_ADD",
  INVENTORY_EDIT: "INVENTORY_EDIT",
  INVENTORY_DELETE: "INVENTORY_DELETE",
  INVENTORY_ADJUST: "INVENTORY_ADJUST", // Restock/Utilize/Reconcile

  // Procurement Module
  PROCUREMENT_VIEW: "PROCUREMENT_VIEW",
  PROCUREMENT_CREATE: "PROCUREMENT_CREATE",
  PROCUREMENT_APPROVE: "PROCUREMENT_APPROVE",
  PROCUREMENT_RECEIVE: "PROCUREMENT_RECEIVE", // Shipment logging

  // Partner/Vendor Management
  VENDOR_VIEW: "VENDOR_VIEW",
  VENDOR_MANAGE: "VENDOR_MANAGE",

  // Administrative & Security
  ADMIN_CONFIG: "ADMIN_CONFIG",
  USER_MANAGE: "USER_MANAGE",
  AUDIT_VIEW: "AUDIT_VIEW",
  SYSTEM_HEALTH: "SYSTEM_HEALTH"
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  INVENTORY_VIEW: "See Stock & Item List",
  INVENTORY_ADD: "Add New Stock Item",
  INVENTORY_EDIT: "Update Item Details (Names/Units)",
  INVENTORY_DELETE: "Remove Items from Catalog",
  INVENTORY_ADJUST: "Update Stock Levels & Counts",

  PROCUREMENT_VIEW: "Track & View All Orders",
  PROCUREMENT_CREATE: "Create New Purchase Orders",
  PROCUREMENT_APPROVE: "Approve Orders for Payment",
  PROCUREMENT_RECEIVE: "Record Goods Received (Challan)",

  VENDOR_VIEW: "See Service Partners & Suppliers",
  VENDOR_MANAGE: "Register & Manage Suppliers",

  ADMIN_CONFIG: "System Settings & Master Data",
  USER_MANAGE: "Manage Staff & Access",
  AUDIT_VIEW: "Check System History & Logs",
  SYSTEM_HEALTH: "Check System Health Status"
};
