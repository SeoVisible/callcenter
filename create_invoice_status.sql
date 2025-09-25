BEGIN;
ALTER TABLE "Invoice" ALTER COLUMN "status" DROP DEFAULT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoicestatus') THEN
    CREATE TYPE "InvoiceStatus" AS ENUM ('pending','maker','sent','paid','not_paid','completed');
  END IF;
END
$$;
ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE "InvoiceStatus" USING status::text::"InvoiceStatus";
ALTER TABLE "Invoice" ALTER COLUMN "status" SET DEFAULT 'pending'::"InvoiceStatus";
COMMIT;
