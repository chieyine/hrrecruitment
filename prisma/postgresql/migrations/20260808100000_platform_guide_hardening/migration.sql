-- Platform-guide hardening and explicit legacy backfills.

ALTER TABLE "ConsentRecord" ADD COLUMN "expiresAt" TIMESTAMP(3);
CREATE INDEX "ConsentRecord_candidateId_consentType_expiresAt_idx"
  ON "ConsentRecord"("candidateId", "consentType", "expiresAt");

-- Existing active talent-pool consent is given a visible two-year renewal date.
UPDATE "ConsentRecord"
SET "expiresAt" = "decidedAt" + INTERVAL '2 years'
WHERE "consentType" = 'TALENT_POOL'
  AND "decision" = true
  AND "withdrawnAt" IS NULL
  AND "expiresAt" IS NULL;

ALTER TABLE "CandidateDocument"
  ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "verificationNotes" TEXT,
  ADD COLUMN "verificationSource" TEXT,
  ADD COLUMN "restricted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "supersededAt" TIMESTAMP(3);

WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "candidateId", "documentType"
           ORDER BY "createdAt", "id"
         ) AS version_number,
         COUNT(*) OVER (PARTITION BY "candidateId", "documentType") AS version_count
  FROM "CandidateDocument"
)
UPDATE "CandidateDocument" AS document
SET "versionNumber" = ranked.version_number,
    "status" = CASE WHEN ranked.version_number < ranked.version_count THEN 'SUPERSEDED' ELSE document."status" END,
    "supersededAt" = CASE WHEN ranked.version_number < ranked.version_count THEN document."createdAt" ELSE NULL END
FROM ranked
WHERE document."id" = ranked."id";

CREATE INDEX "CandidateDocument_candidateId_documentType_versionNumber_idx"
  ON "CandidateDocument"("candidateId", "documentType", "versionNumber");
CREATE INDEX "CandidateDocument_status_verifiedAt_idx"
  ON "CandidateDocument"("status", "verifiedAt");

ALTER TABLE "Application" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'DIRECT';
UPDATE "Application"
SET "source" = 'LEGACY_UNKNOWN'
WHERE "internalStatus" <> 'DRAFT';
CREATE INDEX "Application_source_submittedAt_idx" ON "Application"("source", "submittedAt");

ALTER TABLE "Assessment"
  ADD COLUMN "lateSubmissionPolicy" TEXT NOT NULL DEFAULT 'REJECT',
  ADD COLUMN "lateGraceMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "accommodationExtraMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "accommodationInstructions" TEXT;

CREATE TABLE "AssessmentBankQuestion" (
  "id" TEXT NOT NULL,
  "stableKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
  "jobFamily" TEXT,
  "questionType" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "optionsJson" TEXT,
  "correctAnswerJson" TEXT,
  "maximumScore" DOUBLE PRECISION NOT NULL,
  "accessLevel" TEXT NOT NULL DEFAULT 'RESTRICTED',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "reviewDueAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "supersededById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentBankQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssessmentBankQuestion_stableKey_version_key"
  ON "AssessmentBankQuestion"("stableKey", "version");
CREATE INDEX "AssessmentBankQuestion_status_category_jobFamily_idx"
  ON "AssessmentBankQuestion"("status", "category", "jobFamily");
CREATE INDEX "AssessmentBankQuestion_status_reviewDueAt_idx"
  ON "AssessmentBankQuestion"("status", "reviewDueAt");
CREATE INDEX "AssessmentBankQuestion_status_expiresAt_idx"
  ON "AssessmentBankQuestion"("status", "expiresAt");

ALTER TABLE "CandidateAssessment"
  ADD COLUMN "submittedLate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "assignedReviewerUserId" TEXT,
  ADD COLUMN "resultApprovedBy" TEXT,
  ADD COLUMN "resultApprovedAt" TIMESTAMP(3),
  ADD COLUMN "resultApprovalComment" TEXT,
  ADD COLUMN "resultApprovalSource" TEXT;

UPDATE "CandidateAssessment"
SET "status" = 'AWAITING_APPROVAL'
WHERE "status" = 'MARKED';

-- Preserve historic outcomes without inventing a second approver.
UPDATE "CandidateAssessment"
SET "resultApprovalSource" = 'LEGACY_PRE_CONTROL',
    "resultApprovedAt" = COALESCE("submittedAt", "startedAt", "invitedAt"),
    "resultApprovalComment" = 'Outcome recorded before independent approval control was introduced'
WHERE "status" IN ('PASSED', 'FAILED')
  AND "resultApprovalSource" IS NULL;

CREATE INDEX "CandidateAssessment_status_assignedReviewerUserId_idx"
  ON "CandidateAssessment"("status", "assignedReviewerUserId");
CREATE INDEX "CandidateAssessment_status_resultApprovedAt_idx"
  ON "CandidateAssessment"("status", "resultApprovedAt");

ALTER TABLE "Interview"
  ADD COLUMN "interviewType" TEXT NOT NULL DEFAULT 'PANEL',
  ADD COLUMN "panelApprovedAt" TIMESTAMP(3),
  ADD COLUMN "panelApprovedBy" TEXT,
  ADD COLUMN "panelApprovalComment" TEXT;

-- Existing panels remain usable and are explicitly labelled as legacy acceptance.
UPDATE "Interview"
SET "panelApprovedAt" = "scheduledStart",
    "panelApprovedBy" = "createdBy",
    "panelApprovalComment" = 'Panel accepted before the current approval control was introduced'
WHERE "panelApprovedAt" IS NULL;

CREATE INDEX "Interview_panelApprovedAt_scheduledStart_idx"
  ON "Interview"("panelApprovedAt", "scheduledStart");
ALTER TABLE "InterviewQuestion" ADD COLUMN "isSafeguarding" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CandidateCourse"
  ADD COLUMN "certificateSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "certificateReviewedAt" TIMESTAMP(3),
  ADD COLUMN "certificateReviewedBy" TEXT,
  ADD COLUMN "certificateReviewComment" TEXT;

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "immediateEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "digestEnabled" BOOLEAN NOT NULL DEFAULT true,
  "digestHourLocal" INTEGER NOT NULL DEFAULT 8,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TalentPoolMember"
  ADD COLUMN "technicalCategory" TEXT,
  ADD COLUMN "preferredLocationsJson" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN "availabilityStatus" TEXT,
  ADD COLUMN "availableFrom" TIMESTAMP(3),
  ADD COLUMN "expectedRate" DOUBLE PRECISION,
  ADD COLUMN "expectedRateCurrency" TEXT DEFAULT 'NGN',
  ADD COLUMN "expectedRatePeriod" TEXT,
  ADD COLUMN "expectedGrade" TEXT,
  ADD COLUMN "rosterExpiresAt" TIMESTAMP(3),
  ADD COLUMN "lastVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "deploymentHistoryJson" TEXT NOT NULL DEFAULT '[]';

UPDATE "TalentPoolMember" AS member
SET "consentExpiresAt" = (
  SELECT record."expiresAt"
  FROM "ConsentRecord" AS record
  WHERE record."candidateId" = member."candidateId"
    AND record."consentType" = 'TALENT_POOL'
    AND record."decision" = true
    AND record."withdrawnAt" IS NULL
  ORDER BY record."decidedAt" DESC
  LIMIT 1
)
WHERE member."consentExpiresAt" IS NULL
  AND EXISTS (
    SELECT 1 FROM "ConsentRecord" AS record
    WHERE record."candidateId" = member."candidateId"
      AND record."consentType" = 'TALENT_POOL'
      AND record."decision" = true
      AND record."withdrawnAt" IS NULL
  );

UPDATE "TalentPoolMember"
SET "rosterExpiresAt" = "addedAt" + INTERVAL '1 year',
    "lastVerifiedAt" = "addedAt"
WHERE "status" = 'ACTIVE' AND "rosterExpiresAt" IS NULL;

CREATE INDEX "TalentPoolMember_status_consentExpiresAt_idx"
  ON "TalentPoolMember"("status", "consentExpiresAt");
CREATE INDEX "TalentPoolMember_status_rosterExpiresAt_idx"
  ON "TalentPoolMember"("status", "rosterExpiresAt");

CREATE TABLE "TalentPoolDeployment" (
  "id" TEXT NOT NULL,
  "talentPoolMemberId" TEXT NOT NULL,
  "applicationId" TEXT,
  "vacancyReference" TEXT NOT NULL,
  "roleTitle" TEXT NOT NULL,
  "deploymentStatus" TEXT NOT NULL,
  "deployedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "notes" TEXT,
  "recordedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TalentPoolDeployment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TalentPoolDeployment_talentPoolMemberId_deployedAt_idx"
  ON "TalentPoolDeployment"("talentPoolMemberId", "deployedAt");
CREATE INDEX "TalentPoolDeployment_applicationId_idx" ON "TalentPoolDeployment"("applicationId");
ALTER TABLE "TalentPoolDeployment"
  ADD CONSTRAINT "TalentPoolDeployment_talentPoolMemberId_fkey"
  FOREIGN KEY ("talentPoolMemberId") REFERENCES "TalentPoolMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Referees are external token holders, not authenticated platform users.
UPDATE "User"
SET "accountStatus" = 'SUSPENDED', "sessionVersion" = "sessionVersion" + 1
WHERE "id" IN (
  SELECT assignment."userId"
  FROM "UserRole" AS assignment
  JOIN "Role" AS role ON role."id" = assignment."roleId"
  WHERE role."name" = 'REFEREE'
)
AND NOT EXISTS (
  SELECT 1
  FROM "UserRole" AS other_assignment
  JOIN "Role" AS other_role ON other_role."id" = other_assignment."roleId"
  WHERE other_assignment."userId" = "User"."id"
    AND other_role."name" <> 'REFEREE'
);

DELETE FROM "UserRole"
WHERE "roleId" IN (SELECT "id" FROM "Role" WHERE "name" = 'REFEREE');
DELETE FROM "RolePermission"
WHERE "roleId" IN (SELECT "id" FROM "Role" WHERE "name" = 'REFEREE');
DELETE FROM "Role" WHERE "name" = 'REFEREE';
