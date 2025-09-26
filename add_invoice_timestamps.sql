-- Add sentAt and paidAt columns if they don't exist (idempotent)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sentAt" timestamp;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidAt" timestamp;
