-- Migration: add buyingPrice to Product and InvoiceItem
-- Adds a new float column `buyingPrice` with default 0 to the Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "buyingPrice" double precision DEFAULT 0 NOT NULL;
-- Adds a new float column `buyingPrice` (nullable) to InvoiceItem so historical invoices can store cost
ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "buyingPrice" double precision;
