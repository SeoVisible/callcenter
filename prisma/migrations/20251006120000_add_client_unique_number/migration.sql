-- AddClientUniqueNumber
-- Add clientUniqueNumber field to Client table

-- Add the new column (nullable initially)
ALTER TABLE "Client" ADD COLUMN "clientUniqueNumber" TEXT;

-- Add unique constraint on the new column
ALTER TABLE "Client" ADD CONSTRAINT "Client_clientUniqueNumber_key" UNIQUE ("clientUniqueNumber");