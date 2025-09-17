ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sentAt" timestamptz;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidAt" timestamptz;
