/*
  Warnings:

  - You are about to drop the column `category` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `subCategory` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTerms` on the `Vendor` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,type,parentId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Category_name_type_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "InventoryTransaction" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "category",
DROP COLUMN "subCategory",
DROP COLUMN "unit";

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "category",
DROP COLUMN "paymentTerms";

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_type_parentId_key" ON "Category"("name", "type", "parentId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
