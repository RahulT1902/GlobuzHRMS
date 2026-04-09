/*
  Warnings:

  - The values [RECEIVED] on the enum `ProcurementStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isStockUpdated` on the `ProcurementOrder` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProcurementStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."ProcurementOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ProcurementOrder" ALTER COLUMN "status" TYPE "ProcurementStatus_new" USING (
  CASE 
    WHEN "status"::text = 'RECEIVED' THEN 'COMPLETED'::"ProcurementStatus_new"
    ELSE "status"::text::"ProcurementStatus_new"
  END
);
ALTER TYPE "ProcurementStatus" RENAME TO "ProcurementStatus_old";
ALTER TYPE "ProcurementStatus_new" RENAME TO "ProcurementStatus";
DROP TYPE "public"."ProcurementStatus_old";
ALTER TABLE "ProcurementOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "ProcurementOrder" DROP COLUMN "isStockUpdated";

-- CreateTable
CREATE TABLE "ProcurementShipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "challanNumber" TEXT,
    "invoiceNumber" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ProcurementShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementShipmentItem" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProcurementShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementShipment_challanNumber_orderId_key" ON "ProcurementShipment"("challanNumber", "orderId");

-- AddForeignKey
ALTER TABLE "ProcurementShipment" ADD CONSTRAINT "ProcurementShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProcurementOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementShipment" ADD CONSTRAINT "ProcurementShipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementShipmentItem" ADD CONSTRAINT "ProcurementShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "ProcurementShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementShipmentItem" ADD CONSTRAINT "ProcurementShipmentItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ProcurementItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementShipmentItem" ADD CONSTRAINT "ProcurementShipmentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill data for legacy RECEIVED orders
INSERT INTO "ProcurementShipment" ("id", "orderId", "challanNumber", "receivedAt", "createdById")
SELECT gen_random_uuid(), id, 'AUTO-MIGRATION', "updatedAt", "createdById"
FROM "ProcurementOrder" 
WHERE "status" = 'COMPLETED';

INSERT INTO "ProcurementShipmentItem" ("id", "shipmentId", "itemId", "productId", "quantity", "unitPrice")
SELECT gen_random_uuid(), ps.id, pi.id, pi."productId", pi.quantity, pi."unitPrice"
FROM "ProcurementShipment" ps
JOIN "ProcurementItem" pi ON ps."orderId" = pi."orderId"
WHERE ps."challanNumber" = 'AUTO-MIGRATION';

UPDATE "ProcurementItem"
SET "receivedQuantity" = "quantity"
FROM "ProcurementOrder"
WHERE "ProcurementItem"."orderId" = "ProcurementOrder".id 
  AND "ProcurementOrder"."status" = 'COMPLETED';
