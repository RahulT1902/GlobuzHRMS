/*
  Warnings:

  - The values [IN,OUT,ADJUSTMENT] on the enum `InventoryTransactionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InventoryTransactionType_new" AS ENUM ('INITIAL_STOCK', 'PROCUREMENT_IN', 'SALES_OUT', 'MANUAL_IN', 'MANUAL_OUT', 'RECONCILIATION', 'TRANSFER');
ALTER TABLE "InventoryTransaction" ALTER COLUMN "type" TYPE "InventoryTransactionType_new" USING (
  CASE 
    WHEN "type"::text = 'IN' AND "referenceType" = 'PROCUREMENT' THEN 'PROCUREMENT_IN'::"InventoryTransactionType_new"
    WHEN "type"::text = 'IN' THEN 'MANUAL_IN'::"InventoryTransactionType_new"
    WHEN "type"::text = 'OUT' THEN 'MANUAL_OUT'::"InventoryTransactionType_new"
    WHEN "type"::text = 'ADJUSTMENT' THEN 'RECONCILIATION'::"InventoryTransactionType_new"
    ELSE 'MANUAL_OUT'::"InventoryTransactionType_new"
  END
);
ALTER TYPE "InventoryTransactionType" RENAME TO "InventoryTransactionType_old";
ALTER TYPE "InventoryTransactionType_new" RENAME TO "InventoryTransactionType";
DROP TYPE "public"."InventoryTransactionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "InventoryTransaction" ADD COLUMN     "referenceName" TEXT,
ADD COLUMN     "totalCost" DOUBLE PRECISION,
ADD COLUMN     "unitCost" DOUBLE PRECISION;
