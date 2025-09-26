-- Make InvoiceItem.productId nullable and update FK to SET NULL on delete
ALTER TABLE "InvoiceItem" ALTER COLUMN "productId" DROP NOT NULL;
-- Recreate FK to set null on delete
ALTER TABLE "InvoiceItem" DROP CONSTRAINT IF EXISTS "InvoiceItem_productId_fkey";
ALTER TABLE "InvoiceItem"
  ADD CONSTRAINT "InvoiceItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL;
