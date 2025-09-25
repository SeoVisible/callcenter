This project added new Invoice statuses to the Prisma schema:

- pending (default)
- maker
- sent
- paid
- not_paid
- completed

Before the app can use these values in production, your PostgreSQL database needs the matching enum type and the column must be cast to it. There are two safe approaches:

1. Apply SQL directly (non-destructive, recommended when you don't want to run a destructive prisma migrate reset):

- Backup your database before running any DDL.
- Run the following SQL (psql or your DB client):

```sql
BEGIN;
ALTER TABLE "Invoice" ALTER COLUMN "status" DROP DEFAULT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoicestatus') THEN
    CREATE TYPE "InvoiceStatus" AS ENUM ('pending','maker','sent','paid','not_paid','completed');
  END IF;
END
$$;
-- ensure any existing rows have a valid value (replace invalid with 'pending')
UPDATE "Invoice" SET "status" = 'pending' WHERE "status" IS NULL OR length("status"::text) = 0;
ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE "InvoiceStatus" USING status::text::"InvoiceStatus";
ALTER TABLE "Invoice" ALTER COLUMN "status" SET DEFAULT 'pending'::"InvoiceStatus";
COMMIT;
```

This will create the enum if missing, set invalid existing rows to 'pending', cast the column and set default.

2. Use Prisma migrations (recommended if you have a deploy pipeline and your migrations history is clean):

- Update `prisma/schema.prisma` (already done in this repo).
- Run locally: `npx prisma migrate dev --name add-invoice-statuses` to create the migration. If this command prompts to reset the DB because of drift, DO NOT run it on production without backup. If it suggests a reset and you cannot accept it, use option (1) instead.
- Commit the generated migration files and run `npx prisma migrate deploy` in production.

Notes about Windows EPERM when running `prisma generate`:

- If you see an EPERM error renaming `query_engine-windows.dll.node.tmp...`, ensure no process is holding files in `node_modules/.prisma/client` (close dev server, editors or other Node processes). Running the command as Administrator can help. If the issue persists, delete `node_modules/.prisma/client` and retry `npm install` then `npx prisma generate`.

After applying the DB changes, regenerate Prisma Client locally (or in your build pipeline):

```bash
npx prisma generate
```

That will update TypeScript types and eliminate the need for temporary `as any` casts in server code.

If you want, I can:

- Provide the SQL again and help craft a small migration script.
- Attempt a `prisma generate` here, but note Windows permission errors may block it (I retried and got EPERM). If you prefer, run the generate command on your development machine after closing any processes using the repo.
