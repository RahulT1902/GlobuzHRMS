import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import vendorRoutes from "./modules/vendors/vendors.routes";
import procurementRoutes from "./modules/procurement/procurement.routes";
import configRoutes from "./modules/config/config.routes";
import userRoutes from "./modules/users/user.routes";
import roleRoutes from "./modules/roles/role.routes";
import debugRoutes from "./modules/debug/debug.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import systemRoutes from "./modules/system/system.routes";
import auditRoutes from "./modules/audit/audit.routes";
import { MaintenanceService } from "./services/maintenance.service";
import { errorHandler } from "./middleware/error.middleware";
import { apiResponse } from "./utils/apiResponse";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/health", (_req, res) => {
  apiResponse.success(res, "Globuzinc HRMS API is healthy", { timestamp: new Date() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/config", configRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/debug", debugRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/audit", auditRoutes);

// 404 handler
app.use((_req, res) => {
  apiResponse.error(res, "Route not found", 404);
});

// Global error handler
app.use(errorHandler);

// Start background maintenance cycles
MaintenanceService.startMaintenanceCycle();

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║   Globuzinc HRMS API              ║
  ║   Running on port ${PORT}             ║
  ║   ENV: ${process.env.NODE_ENV}              ║
  ╚════════════════════════════════════╝
  `);
});

export default app;
