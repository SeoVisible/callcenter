-- Migration: Remove unique constraint from invoiceNumber
-- This is safe and preserves all existing data

-- Drop the unique constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Invoice_invoiceNumber_key' 
        AND table_name = 'Invoice'
    ) THEN
        ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_invoiceNumber_key";
    END IF;
END $$;