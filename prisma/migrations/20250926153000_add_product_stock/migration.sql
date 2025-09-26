-- Migration: add product stock
-- Adds a new integer column `stock` with default 0 to the Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stock" integer DEFAULT 0 NOT NULL;
