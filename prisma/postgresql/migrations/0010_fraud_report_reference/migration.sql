ALTER TABLE "FraudReport" ADD COLUMN "referenceNumber" TEXT;

CREATE UNIQUE INDEX "FraudReport_referenceNumber_key" ON "FraudReport"("referenceNumber");
