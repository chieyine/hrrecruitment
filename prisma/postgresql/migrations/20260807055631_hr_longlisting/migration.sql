/*
  Warnings:

  - You are about to drop the column `searchVector` on the `CandidateProfile` table. All the data in the column will be lost.
  - You are about to drop the column `searchVector` on the `Vacancy` table. All the data in the column will be lost.
  - Added the required column `originalOutcome` to the `EligibilityEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `EligibilityRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `EligibilityRule` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX IF EXISTS "CandidateProfile_lastName_trgm_idx";

-- DropIndex
DROP INDEX IF EXISTS "CandidateProfile_searchVector_idx";

-- DropIndex
DROP INDEX IF EXISTS "EligibilityRule_vacancyId_active_idx";

-- DropIndex
DROP INDEX IF EXISTS "User_lockedUntil_idx";

-- DropIndex
DROP INDEX IF EXISTS "Vacancy_searchVector_idx";

-- DropIndex
DROP INDEX IF EXISTS "Vacancy_title_trgm_idx";

-- AlterTable
ALTER TABLE "ApplicationFile" ADD COLUMN     "vacancyRequiredDocumentId" TEXT;

-- AlterTable
ALTER TABLE "Approval" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CandidateAssessment" ADD COLUMN     "offlineRecordJson" TEXT;

-- AlterTable
ALTER TABLE "CandidatePreboardingTask" ADD COLUMN     "evidenceFileId" TEXT;

-- AlterTable
ALTER TABLE "CandidateProfile" DROP COLUMN "searchVector",
ADD COLUMN     "preferredDutyLocationsJson" TEXT;

-- AlterTable
ALTER TABLE "DataDeletionRequest" ADD COLUMN     "legalOverrideApprovedBy" TEXT,
ADD COLUMN     "legalOverrideRequestedBy" TEXT;

-- AlterTable
ALTER TABLE "ERPTransferRecord" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "duplicateCheckNote" TEXT,
ADD COLUMN     "duplicateCheckStatus" TEXT NOT NULL DEFAULT 'NOT_RUN',
ADD COLUMN     "handoverPackFileId" TEXT,
ADD COLUMN     "handoverPackGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "transferStatus" TEXT NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "transferredDataJson" TEXT,
ALTER COLUMN "erpPersonnelNumber" DROP NOT NULL,
ALTER COLUMN "createdInErpAt" DROP NOT NULL,
ALTER COLUMN "createdInErpAt" DROP DEFAULT,
ALTER COLUMN "recordedBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EligibilityEvaluation" ADD COLUMN     "decidingRuleId" TEXT,
ADD COLUMN     "eligibilityScore" DECIMAL(6,2),
ADD COLUMN     "longlistRunId" TEXT,
ADD COLUMN     "maximumScore" DECIMAL(6,2),
ADD COLUMN     "originalOutcome" TEXT,
ADD COLUMN     "overrideApprovalId" TEXT,
ADD COLUMN     "overrideEvidenceFileId" TEXT,
ADD COLUMN     "overrideReasonCode" TEXT;

UPDATE "EligibilityEvaluation"
SET "originalOutcome" = COALESCE("suggestedOutcome", 'REQUIRES_REVIEW')
WHERE "originalOutcome" IS NULL;
ALTER TABLE "EligibilityEvaluation" ALTER COLUMN "originalOutcome" SET NOT NULL;

-- AlterTable
ALTER TABLE "EligibilityRule" ADD COLUMN     "classification" TEXT NOT NULL DEFAULT 'MANDATORY_KNOCKOUT',
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "weight" DECIMAL(6,2) NOT NULL DEFAULT 0,
ALTER COLUMN "operator" SET DEFAULT 'GTE';

UPDATE "EligibilityRule"
SET "label" = INITCAP(REPLACE("ruleType", '_', ' ')),
    "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "label" IS NULL OR "updatedAt" IS NULL;
ALTER TABLE "EligibilityRule"
  ALTER COLUMN "label" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "attachmentFileIdsJson" TEXT,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "panelConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "panelConfirmedBy" TEXT,
ADD COLUMN     "panelReadyAt" TIMESTAMP(3),
ADD COLUMN     "reminderMinutesBefore" INTEGER NOT NULL DEFAULT 1440,
ADD COLUMN     "varianceFlag" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "budgetLine" TEXT,
ADD COLUMN     "consultancyFee" DECIMAL(14,2),
ADD COLUMN     "donorRestriction" TEXT,
ADD COLUMN     "exceedsApprovedCeiling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fundingEndDate" TIMESTAMP(3),
ADD COLUMN     "fundingSource" TEXT,
ADD COLUMN     "proposedGrade" TEXT,
ADD COLUMN     "proposedStep" TEXT,
ADD COLUMN     "salaryAmount" DECIMAL(14,2),
ADD COLUMN     "salaryCurrency" TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN     "salaryPeriod" TEXT NOT NULL DEFAULT 'ANNUAL';

-- AlterTable
ALTER TABLE "OutboxMessage" ADD COLUMN     "applicationId" TEXT;

-- AlterTable
ALTER TABLE "PreboardingFormTemplate" ADD COLUMN     "handoverPurpose" TEXT NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Referee" ADD COLUMN     "contactStatus" TEXT NOT NULL DEFAULT 'READY',
ADD COLUMN     "preferredContactMethod" TEXT NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "waiverReason" TEXT;

-- AlterTable
ALTER TABLE "SavedSearch" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserMfaSecret" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Vacancy" DROP COLUMN "searchVector",
ADD COLUMN     "anonymisedFieldsJson" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "anonymisedReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "audience" TEXT NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "emergencyApprovedAt" TIMESTAMP(3),
ADD COLUMN     "emergencyApprovedBy" TEXT,
ADD COLUMN     "emergencyJustification" TEXT,
ADD COLUMN     "emergencyRecruitment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "longlistingRulesLockedAt" TIMESTAMP(3),
ADD COLUMN     "recruitmentContactEmail" TEXT,
ADD COLUMN     "recruitmentContactName" TEXT,
ADD COLUMN     "safeguardingClassification" TEXT NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "salaryCurrency" TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN     "salaryDisclosure" TEXT NOT NULL DEFAULT 'HIDDEN',
ADD COLUMN     "salaryRangeMaximum" DECIMAL(14,2),
ADD COLUMN     "salaryRangeMinimum" DECIMAL(14,2),
ADD COLUMN     "staffingRequestId" TEXT,
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'Africa/Lagos';

-- CreateTable
CREATE TABLE "StaffingRequest" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "projectId" TEXT,
    "dutyStationId" TEXT NOT NULL,
    "numberOfPositions" INTEGER NOT NULL DEFAULT 1,
    "isReplacement" BOOLEAN NOT NULL DEFAULT false,
    "previousHolder" TEXT,
    "recruitmentReason" TEXT NOT NULL,
    "reportingLine" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "contractDurationMonths" INTEGER,
    "expectedStartDate" TIMESTAMP(3) NOT NULL,
    "jobGrade" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'STANDARD',
    "budgetLine" TEXT NOT NULL,
    "fundingSource" TEXT NOT NULL,
    "fundingEndDate" TIMESTAMP(3),
    "proposedSalaryCeiling" TEXT,
    "donorRestrictions" TEXT,
    "jobDescriptionFileId" TEXT,
    "requiredQualifications" TEXT NOT NULL,
    "requiredExperience" TEXT NOT NULL,
    "requiredLanguages" TEXT,
    "safeguardingSensitivity" TEXT NOT NULL DEFAULT 'STANDARD',
    "proposedAssessmentMethod" TEXT,
    "proposedPanel" TEXT,
    "hiringManagerUserId" TEXT NOT NULL,
    "hiringManagerName" TEXT NOT NULL,
    "hiringManagerEmail" TEXT NOT NULL,
    "hiringManagerPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lockVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "StaffingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingConfirmation" (
    "id" TEXT NOT NULL,
    "staffingRequestId" TEXT NOT NULL,
    "budgetHolderUserId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "budgetLine" TEXT,
    "fundingSource" TEXT,
    "fundingStartDate" TIMESTAMP(3),
    "fundingEndDate" TIMESTAMP(3),
    "salaryCeilingAmount" DECIMAL(14,2),
    "salaryCeilingCurrency" TEXT DEFAULT 'NGN',
    "maximumRecruitmentCost" DECIMAL(14,2),
    "grantFunded" BOOLEAN NOT NULL DEFAULT false,
    "donorApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "donorApprovalReference" TEXT,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "FundingConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferFinancialApproval" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "budgetHolderUserId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "confirmedAmount" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "ceilingAtDecision" DECIMAL(14,2),
    "varianceReason" TEXT,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferFinancialApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalCondition" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "evidenceFileId" TEXT,
    "evidenceNote" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundCheck" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "providerName" TEXT,
    "providerReference" TEXT,
    "submittedFieldsJson" TEXT,
    "requestedBy" TEXT,
    "requestedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "findingSummary" TEXT,
    "restrictedNote" TEXT,
    "evidenceFileId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "waivedBy" TEXT,
    "waivedReason" TEXT,
    "lawfulBasis" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvParseResult" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "extractedJson" TEXT NOT NULL DEFAULT '{}',
    "acceptedJson" TEXT,
    "parserVersion" TEXT NOT NULL DEFAULT 'heuristic-1',
    "confidence" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "parsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CvParseResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicSignature" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "signatoryUserId" TEXT,
    "signatoryName" TEXT NOT NULL,
    "signatoryEmail" TEXT,
    "signatoryRole" TEXT,
    "documentVersion" INTEGER NOT NULL DEFAULT 1,
    "documentHash" TEXT NOT NULL,
    "signatureMethod" TEXT NOT NULL,
    "authenticationMethod" TEXT NOT NULL DEFAULT 'SESSION',
    "status" TEXT NOT NULL DEFAULT 'SIGNED',
    "drawnSignatureData" TEXT,
    "signedFileId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amendedBySignatureId" TEXT,
    "amendmentReason" TEXT,

    CONSTRAINT "ElectronicSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationIdentity" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerEmail" TEXT,
    "scopesJson" TEXT NOT NULL DEFAULT '[]',
    "accessTokenSealed" TEXT NOT NULL,
    "refreshTokenSealed" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationOAuthState" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL,
    "codeVerifierSealed" TEXT NOT NULL,
    "redirectPath" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityWindow" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "applicationId" TEXT,
    "vacancyId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "busy" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityRuleChange" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "previousJson" TEXT,
    "proposedJson" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "fairnessReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "fairnessReviewNote" TEXT,
    "applicationsAtChange" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EligibilityRuleChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LonglistRun" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "totalApplications" INTEGER NOT NULL DEFAULT 0,
    "completeApplications" INTEGER NOT NULL DEFAULT 0,
    "incompleteApplications" INTEGER NOT NULL DEFAULT 0,
    "automaticallyEligible" INTEGER NOT NULL DEFAULT 0,
    "automaticallyIneligible" INTEGER NOT NULL DEFAULT 0,
    "requiresReview" INTEGER NOT NULL DEFAULT 0,
    "duplicateApplications" INTEGER NOT NULL DEFAULT 0,
    "withdrawnApplications" INTEGER NOT NULL DEFAULT 0,
    "reasonDistributionJson" TEXT NOT NULL DEFAULT '{}',
    "ruleSnapshotJson" TEXT NOT NULL DEFAULT '[]',
    "startedBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmationNote" TEXT,

    CONSTRAINT "LonglistRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffingRequest_referenceNumber_key" ON "StaffingRequest"("referenceNumber");

-- CreateIndex
CREATE INDEX "StaffingRequest_status_createdAt_idx" ON "StaffingRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StaffingRequest_hiringManagerUserId_status_idx" ON "StaffingRequest"("hiringManagerUserId", "status");

-- CreateIndex
CREATE INDEX "StaffingRequest_departmentId_status_idx" ON "StaffingRequest"("departmentId", "status");

-- CreateIndex
CREATE INDEX "FundingConfirmation_staffingRequestId_decidedAt_idx" ON "FundingConfirmation"("staffingRequestId", "decidedAt");

-- CreateIndex
CREATE INDEX "FundingConfirmation_budgetHolderUserId_decidedAt_idx" ON "FundingConfirmation"("budgetHolderUserId", "decidedAt");

-- CreateIndex
CREATE INDEX "OfferFinancialApproval_offerId_decidedAt_idx" ON "OfferFinancialApproval"("offerId", "decidedAt");

-- CreateIndex
CREATE INDEX "OfferFinancialApproval_budgetHolderUserId_decidedAt_idx" ON "OfferFinancialApproval"("budgetHolderUserId", "decidedAt");

-- CreateIndex
CREATE INDEX "BackgroundCheck_status_checkType_idx" ON "BackgroundCheck"("status", "checkType");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundCheck_applicationId_checkType_key" ON "BackgroundCheck"("applicationId", "checkType");

-- CreateIndex
CREATE INDEX "CvParseResult_candidateId_parsedAt_idx" ON "CvParseResult"("candidateId", "parsedAt");

-- CreateIndex
CREATE INDEX "ElectronicSignature_resourceType_resourceId_signedAt_idx" ON "ElectronicSignature"("resourceType", "resourceId", "signedAt");

-- CreateIndex
CREATE INDEX "ElectronicSignature_signatoryUserId_signedAt_idx" ON "ElectronicSignature"("signatoryUserId", "signedAt");

-- CreateIndex
CREATE INDEX "IntegrationIdentity_userId_status_idx" ON "IntegrationIdentity"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationIdentity_connectionId_userId_key" ON "IntegrationIdentity"("connectionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationOAuthState_state_key" ON "IntegrationOAuthState"("state");

-- CreateIndex
CREATE INDEX "IntegrationOAuthState_expiresAt_idx" ON "IntegrationOAuthState"("expiresAt");

-- CreateIndex
CREATE INDEX "AvailabilityWindow_userId_startAt_idx" ON "AvailabilityWindow"("userId", "startAt");

-- CreateIndex
CREATE INDEX "AvailabilityWindow_applicationId_startAt_idx" ON "AvailabilityWindow"("applicationId", "startAt");

-- CreateIndex
CREATE INDEX "AvailabilityWindow_vacancyId_startAt_idx" ON "AvailabilityWindow"("vacancyId", "startAt");

-- CreateIndex
CREATE INDEX "EligibilityRuleChange_vacancyId_status_idx" ON "EligibilityRuleChange"("vacancyId", "status");

-- CreateIndex
CREATE INDEX "EligibilityRuleChange_ruleId_requestedAt_idx" ON "EligibilityRuleChange"("ruleId", "requestedAt");

-- CreateIndex
CREATE INDEX "LonglistRun_vacancyId_startedAt_idx" ON "LonglistRun"("vacancyId", "startedAt");

-- CreateIndex
CREATE INDEX "LonglistRun_status_startedAt_idx" ON "LonglistRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "EligibilityEvaluation_longlistRunId_suggestedOutcome_idx" ON "EligibilityEvaluation"("longlistRunId", "suggestedOutcome");

-- CreateIndex
CREATE INDEX "EligibilityRule_vacancyId_active_displayOrder_idx" ON "EligibilityRule"("vacancyId", "active", "displayOrder");

-- CreateIndex
CREATE INDEX "Vacancy_staffingRequestId_idx" ON "Vacancy"("staffingRequestId");

-- CreateIndex
CREATE INDEX "Vacancy_status_audience_idx" ON "Vacancy"("status", "audience");

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_dutyStationId_fkey" FOREIGN KEY ("dutyStationId") REFERENCES "DutyStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_jobDescriptionFileId_fkey" FOREIGN KEY ("jobDescriptionFileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingConfirmation" ADD CONSTRAINT "FundingConfirmation_staffingRequestId_fkey" FOREIGN KEY ("staffingRequestId") REFERENCES "StaffingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferFinancialApproval" ADD CONSTRAINT "OfferFinancialApproval_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_staffingRequestId_fkey" FOREIGN KEY ("staffingRequestId") REFERENCES "StaffingRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalCondition" ADD CONSTRAINT "ApprovalCondition_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ERPTransferRecord" ADD CONSTRAINT "ERPTransferRecord_handoverPackFileId_fkey" FOREIGN KEY ("handoverPackFileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundCheck" ADD CONSTRAINT "BackgroundCheck_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundCheck" ADD CONSTRAINT "BackgroundCheck_evidenceFileId_fkey" FOREIGN KEY ("evidenceFileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvParseResult" ADD CONSTRAINT "CvParseResult_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvParseResult" ADD CONSTRAINT "CvParseResult_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicSignature" ADD CONSTRAINT "ElectronicSignature_signedFileId_fkey" FOREIGN KEY ("signedFileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationIdentity" ADD CONSTRAINT "IntegrationIdentity_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationIdentity" ADD CONSTRAINT "IntegrationIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityWindow" ADD CONSTRAINT "AvailabilityWindow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityWindow" ADD CONSTRAINT "AvailabilityWindow_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityRule" ADD CONSTRAINT "EligibilityRule_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityRuleChange" ADD CONSTRAINT "EligibilityRuleChange_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "EligibilityRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LonglistRun" ADD CONSTRAINT "LonglistRun_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityEvaluation" ADD CONSTRAINT "EligibilityEvaluation_longlistRunId_fkey" FOREIGN KEY ("longlistRunId") REFERENCES "LonglistRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "CandidateCourseContentProgress_candidateCourseId_completedAt_id" RENAME TO "CandidateCourseContentProgress_candidateCourseId_completedA_idx";

-- RenameIndex
ALTER INDEX "CandidateCourseContentProgress_candidateCourseId_courseContentI" RENAME TO "CandidateCourseContentProgress_candidateCourseId_courseCont_key";

-- RenameIndex
ALTER INDEX "CandidateMergeReview_primaryCandidateId_duplicateCandidateId_ke" RENAME TO "CandidateMergeReview_primaryCandidateId_duplicateCandidateI_key";

-- RenameIndex
ALTER INDEX "CandidatePolicyAcknowledgement_candidatePreboardingId_policyDoc" RENAME TO "CandidatePolicyAcknowledgement_candidatePreboardingId_polic_key";

-- RenameIndex
ALTER INDEX "CandidatePreboardingForm_candidatePreboardingId_formTemplateId_" RENAME TO "CandidatePreboardingForm_candidatePreboardingId_formTemplat_key";

-- RenameIndex
ALTER INDEX "CandidatePreboardingPackage_candidatePreboardingId_preboardingP" RENAME TO "CandidatePreboardingPackage_candidatePreboardingId_preboard_key";

-- RenameIndex
ALTER INDEX "CandidatePreboardingTask_candidatePreboardingId_taskTemplateId_" RENAME TO "CandidatePreboardingTask_candidatePreboardingId_taskTemplat_key";

-- RenameIndex
ALTER INDEX "CandidateRequiredDocument_candidatePreboardingId_documentRequir" RENAME TO "CandidateRequiredDocument_candidatePreboardingId_documentRe_key";

-- RenameIndex
ALTER INDEX "CandidateRequiredDocumentVersion_candidateRequiredDocumentId_ve" RENAME TO "CandidateRequiredDocumentVersion_candidateRequiredDocumentI_key";

-- RenameIndex
ALTER INDEX "CandidateScorecard_applicationId_scorecardTemplateId_reviewerUs" RENAME TO "CandidateScorecard_applicationId_scorecardTemplateId_review_key";

-- RenameIndex
ALTER INDEX "WorkflowTransitionRule_workflowVersionId_fromStatus_toStatus_ke" RENAME TO "WorkflowTransitionRule_workflowVersionId_fromStatus_toStatu_key";
