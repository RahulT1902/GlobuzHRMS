import { Router } from "express";
import { validate } from "../../utils/validate";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import {
  createProduct, getProducts, getProductById,
  updateProduct, deleteProduct, bulkDeleteProducts, adjustStock,
  getLowStockProducts, getTransactionHistory, createProductsBatch
} from "./inventory.controller";
import { createProductSchema, updateProductSchema, adjustStockSchema } from "./inventory.schema";

const router = Router();

router.use(authenticate);

router.post("/batch", authorize("ADMIN", "PROCUREMENT", "INVENTORY"), createProductsBatch);
router.get("/", getProducts);
router.get("/low-stock", getLowStockProducts);
router.get("/:id", getProductById);
router.get("/:id/transactions", getTransactionHistory);

router.post("/", authorize("ADMIN", "PROCUREMENT", "INVENTORY"), validate(createProductSchema), createProduct);
router.put("/:id", authorize("ADMIN", "PROCUREMENT", "INVENTORY"), validate(updateProductSchema), updateProduct);
router.delete("/bulk", authorize("ADMIN"), bulkDeleteProducts);
router.delete("/:id", authorize("ADMIN"), deleteProduct);
router.post("/:id/adjust-stock", authorize("ADMIN", "INVENTORY"), validate(adjustStockSchema), adjustStock);

export default router;
