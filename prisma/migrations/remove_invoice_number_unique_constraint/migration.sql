-- This migration removes the unique constraint on invoiceNumber
-- It does NOT delete or modify any existing data
-- All existing invoices will remain exactly as they are

-- Drop the unique constraint (this is safe and preserves all data)
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_invoiceNumber_key";