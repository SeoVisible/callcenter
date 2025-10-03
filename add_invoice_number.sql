-- Add invoice number column to Invoice table
ALTER TABLE "Invoice" ADD COLUMN "invoiceNumber" TEXT;

-- Create unique index on invoiceNumber
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_invoiceNumber_key" UNIQUE ("invoiceNumber");

-- Update existing invoices with sequential numbers
WITH numbered_invoices AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") as row_num
  FROM "Invoice"
  WHERE "invoiceNumber" IS NULL
)
UPDATE "Invoice" 
SET "invoiceNumber" = '#' || LPAD(numbered_invoices.row_num::text, 3, '0')
FROM numbered_invoices 
WHERE "Invoice".id = numbered_invoices.id;

-- Make the column NOT NULL after updating existing records
ALTER TABLE "Invoice" ALTER COLUMN "invoiceNumber" SET NOT NULL;