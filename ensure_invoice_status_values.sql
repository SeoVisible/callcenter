-- Ensure missing InvoiceStatus enum values exist (safe: will only add values that are absent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'invoicestatus' AND e.enumlabel = 'maker'
  ) THEN
    ALTER TYPE "InvoiceStatus" ADD VALUE 'maker';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'invoicestatus' AND e.enumlabel = 'not_paid'
  ) THEN
    ALTER TYPE "InvoiceStatus" ADD VALUE 'not_paid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'invoicestatus' AND e.enumlabel = 'completed'
  ) THEN
    ALTER TYPE "InvoiceStatus" ADD VALUE 'completed';
  END IF;
END
$$;
