ALTER TABLE "ConfigurationChangeRequest" ADD COLUMN "scheduledFor" TIMESTAMP(3);
ALTER TABLE "ConfigurationChangeRequest" ADD COLUMN "effectiveFrom" TIMESTAMP(3);
ALTER TABLE "ConfigurationChangeRequest" ADD COLUMN "effectiveTo" TIMESTAMP(3);
ALTER TABLE "ConfigurationChangeRequest" ADD COLUMN "previousJson" TEXT;

CREATE TABLE "AutomationControl" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'ACTIVE',
  "settingsJson" TEXT NOT NULL DEFAULT '{}',
  "updatedBy" TEXT NOT NULL,
  "lastPreviewAt" TIMESTAMP(3),
  "lastOverriddenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationControl_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AutomationControl_code_key" ON "AutomationControl"("code");

CREATE TABLE "AutomationActionLog" (
  "id" TEXT NOT NULL,
  "automationCode" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "detailsJson" TEXT NOT NULL DEFAULT '{}',
  "actorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationActionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AutomationActionLog_automationCode_createdAt_idx" ON "AutomationActionLog"("automationCode", "createdAt");
CREATE INDEX "AutomationActionLog_targetType_targetId_idx" ON "AutomationActionLog"("targetType", "targetId");

CREATE TABLE "BulkActionRun" (
  "id" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "requestedCount" INTEGER NOT NULL,
  "eligibleCount" INTEGER NOT NULL,
  "failedCount" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "requestJson" TEXT NOT NULL,
  "resultJson" TEXT NOT NULL,
  "reversibleUntil" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "reversedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BulkActionRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BulkActionRun_requestedBy_createdAt_idx" ON "BulkActionRun"("requestedBy", "createdAt");
CREATE INDEX "BulkActionRun_actionType_createdAt_idx" ON "BulkActionRun"("actionType", "createdAt");

CREATE TABLE "CandidateMergeReview" (
  "id" TEXT NOT NULL,
  "primaryCandidateId" TEXT NOT NULL,
  "duplicateCandidateId" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "previewJson" TEXT NOT NULL,
  "survivorChoicesJson" TEXT NOT NULL DEFAULT '{}',
  "reason" TEXT NOT NULL,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "mergedAt" TIMESTAMP(3),
  "lockVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandidateMergeReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CandidateMergeReview_primaryCandidateId_duplicateCandidateId_key" ON "CandidateMergeReview"("primaryCandidateId", "duplicateCandidateId");
CREATE INDEX "CandidateMergeReview_status_createdAt_idx" ON "CandidateMergeReview"("status", "createdAt");
