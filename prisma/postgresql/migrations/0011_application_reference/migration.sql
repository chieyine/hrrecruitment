ALTER TABLE "Application" ADD COLUMN "referenceNumber" TEXT;

UPDATE "Application"
SET "referenceNumber" =
  'FRAD-APP-' ||
  EXTRACT(YEAR FROM "submittedAt")::INTEGER ||
  '-' ||
  UPPER(SUBSTRING(REPLACE("id", '-', '') FROM 1 FOR 12))
WHERE "submittedAt" IS NOT NULL;

CREATE UNIQUE INDEX "Application_referenceNumber_key" ON "Application"("referenceNumber");
