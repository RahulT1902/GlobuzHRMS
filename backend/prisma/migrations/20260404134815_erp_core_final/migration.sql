-- AlterTable
ALTER TABLE "InventoryTransaction" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "closingStock" INTEGER NOT NULL DEFAULT 0;
