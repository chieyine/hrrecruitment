ALTER TABLE "Offer" ADD COLUMN "candidateProposedStartDate" TIMESTAMP(3);

CREATE TABLE "ScheduledReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reportType" TEXT NOT NULL,
  "format" TEXT NOT NULL DEFAULT 'xlsx',
  "frequency" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "nextRunAt" TIMESTAMP(3) NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduledReport_active_nextRunAt_idx" ON "ScheduledReport"("active", "nextRunAt");
CREATE INDEX "ScheduledReport_userId_idx" ON "ScheduledReport"("userId");
