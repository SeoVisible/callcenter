/*
  Warnings:

  - The `status` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('pending', 'maker', 'sent', 'paid', 'not_paid', 'completed');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "invoiceNumber" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'pending';
