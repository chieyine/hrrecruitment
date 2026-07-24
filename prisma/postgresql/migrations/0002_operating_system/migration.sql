-- Integrity constraints introduced after the production baseline. Deploy only
-- after the preflight duplicate query in docs/PRODUCTION_RUNBOOK.md returns no rows.
CREATE UNIQUE INDEX "CandidateScorecard_applicationId_scorecardTemplateId_reviewerUserId_key" ON "CandidateScorecard"("applicationId", "scorecardTemplateId", "reviewerUserId");
CREATE UNIQUE INDEX "CandidateCriterionScore_candidateScorecardId_criterionId_key" ON "CandidateCriterionScore"("candidateScorecardId", "criterionId");
CREATE UNIQUE INDEX "CandidateAssessment_applicationId_assessmentId_key" ON "CandidateAssessment"("applicationId", "assessmentId");
CREATE UNIQUE INDEX "InterviewPanelMember_interviewId_userId_key" ON "InterviewPanelMember"("interviewId", "userId");
CREATE UNIQUE INDEX "InterviewScore_panelMemberId_interviewQuestionId_key" ON "InterviewScore"("panelMemberId", "interviewQuestionId");
CREATE UNIQUE INDEX "CandidatePreboardingPackage_candidatePreboardingId_preboardingPackageId_key" ON "CandidatePreboardingPackage"("candidatePreboardingId", "preboardingPackageId");
CREATE UNIQUE INDEX "CandidatePreboardingForm_candidatePreboardingId_formTemplateId_key" ON "CandidatePreboardingForm"("candidatePreboardingId", "formTemplateId");
CREATE UNIQUE INDEX "CandidateRequiredDocument_candidatePreboardingId_documentRequirementId_key" ON "CandidateRequiredDocument"("candidatePreboardingId", "documentRequirementId");
CREATE UNIQUE INDEX "CandidateRequiredDocumentVersion_candidateRequiredDocumentId_versionNumber_key" ON "CandidateRequiredDocumentVersion"("candidateRequiredDocumentId", "versionNumber");
CREATE UNIQUE INDEX "CandidatePolicyAcknowledgement_candidatePreboardingId_policyDocumentId_key" ON "CandidatePolicyAcknowledgement"("candidatePreboardingId", "policyDocumentId");
CREATE UNIQUE INDEX "CandidateCourse_candidatePreboardingId_courseId_key" ON "CandidateCourse"("candidatePreboardingId", "courseId");
CREATE UNIQUE INDEX "CandidateCourseAttempt_candidateCourseId_attemptNumber_key" ON "CandidateCourseAttempt"("candidateCourseId", "attemptNumber");
CREATE UNIQUE INDEX "CandidatePreboardingTask_candidatePreboardingId_taskTemplateId_key" ON "CandidatePreboardingTask"("candidatePreboardingId", "taskTemplateId");
CREATE UNIQUE INDEX "ReadinessCheck_candidatePreboardingId_checkType_key" ON "ReadinessCheck"("candidatePreboardingId", "checkType");

ALTER TABLE "PreboardingFormTemplate" ADD COLUMN "sensitivityClass" TEXT NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "OutboxMessage" ADD COLUMN "leaseOwner" TEXT;
ALTER TABLE "Approval" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Approval" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Approval" ADD COLUMN "lockVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Approval" ADD COLUMN "requestedBy" TEXT;

CREATE TABLE "JobLease" (
  "jobName" TEXT NOT NULL,
  "leaseOwner" TEXT NOT NULL,
  "lockedUntil" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobLease_pkey" PRIMARY KEY ("jobName")
);

CREATE TABLE "AuditChainHead" (
  "id" TEXT NOT NULL,
  "headHash" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditChainHead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowDefinition" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkflowDefinition_code_key" ON "WorkflowDefinition"("code");

CREATE TABLE "WorkflowVersion" (
  "id" TEXT NOT NULL,
  "workflowDefinitionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishedBy" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkflowVersion_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkflowVersion_workflowDefinitionId_version_key" ON "WorkflowVersion"("workflowDefinitionId", "version");

CREATE TABLE "WorkflowTransitionRule" (
  "id" TEXT NOT NULL,
  "workflowVersionId" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "requiredPermission" TEXT NOT NULL,
  "gateConfigurationJson" TEXT NOT NULL DEFAULT '{}',
  "makerChecker" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "WorkflowTransitionRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkflowTransitionRule_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkflowTransitionRule_workflowVersionId_fromStatus_toStatus_key" ON "WorkflowTransitionRule"("workflowVersionId", "fromStatus", "toStatus");

CREATE TABLE "SlaPolicy" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "workType" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "targetMinutes" INTEGER NOT NULL,
  "warningMinutes" INTEGER NOT NULL,
  "escalationRole" TEXT,
  "escalationAfterMinutes" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SlaPolicy_code_key" ON "SlaPolicy"("code");

CREATE TABLE "WorkItem" (
  "id" TEXT NOT NULL,
  "deduplicationKey" TEXT NOT NULL,
  "workType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "assignedUserId" TEXT,
  "assignedRole" TEXT,
  "createdBy" TEXT,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "vacancyId" TEXT,
  "applicationId" TEXT,
  "candidatePreboardingId" TEXT,
  "dueAt" TIMESTAMP(3),
  "warningAt" TIMESTAMP(3),
  "escalatedAt" TIMESTAMP(3),
  "escalationLevel" INTEGER NOT NULL DEFAULT 0,
  "blockedReason" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lockVersion" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "WorkItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkItem_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "WorkItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkItem_deduplicationKey_key" ON "WorkItem"("deduplicationKey");
CREATE UNIQUE INDEX "WorkItem_workType_resourceType_resourceId_assignedUserId_key" ON "WorkItem"("workType", "resourceType", "resourceId", "assignedUserId");
CREATE INDEX "WorkItem_assignedUserId_status_dueAt_idx" ON "WorkItem"("assignedUserId", "status", "dueAt");
CREATE INDEX "WorkItem_assignedRole_status_dueAt_idx" ON "WorkItem"("assignedRole", "status", "dueAt");
CREATE INDEX "WorkItem_vacancyId_status_idx" ON "WorkItem"("vacancyId", "status");
CREATE INDEX "WorkItem_applicationId_status_idx" ON "WorkItem"("applicationId", "status");

CREATE TABLE "TalentPool" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "poolType" TEXT NOT NULL DEFAULT 'GENERAL',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TalentPool_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TalentPoolMember" (
  "id" TEXT NOT NULL,
  "talentPoolId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "addedBy" TEXT NOT NULL,
  "sourceApplicationId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "consentExpiresAt" TIMESTAMP(3),
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TalentPoolMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TalentPoolMember_talentPoolId_fkey" FOREIGN KEY ("talentPoolId") REFERENCES "TalentPool"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TalentPoolMember_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TalentPoolMember_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TalentPoolMember_talentPoolId_candidateId_key" ON "TalentPoolMember"("talentPoolId", "candidateId");
CREATE INDEX "TalentPoolMember_candidateId_status_idx" ON "TalentPoolMember"("candidateId", "status");

CREATE TABLE "AccommodationRequest" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "requestType" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "confidential" BOOLEAN NOT NULL DEFAULT true,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "decision" TEXT,
  "fulfilledAt" TIMESTAMP(3),
  CONSTRAINT "AccommodationRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccommodationRequest_applicationId_status_idx" ON "AccommodationRequest"("applicationId", "status");

CREATE TABLE "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "connectionType" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
  "configurationJson" TEXT NOT NULL DEFAULT '{}',
  "secretReference" TEXT,
  "lastHealthCheckAt" TIMESTAMP(3),
  "lastHealthStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IntegrationConnection_provider_connectionType_key" ON "IntegrationConnection"("provider", "connectionType");

CREATE TABLE "ConfigurationChangeRequest" (
  "id" TEXT NOT NULL,
  "changeType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "proposedJson" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedBy" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedBy" TEXT,
  "decidedAt" TIMESTAMP(3),
  "decisionComment" TEXT,
  "appliedAt" TIMESTAMP(3),
  "lockVersion" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ConfigurationChangeRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ConfigurationChangeRequest_status_requestedAt_idx" ON "ConfigurationChangeRequest"("status", "requestedAt");

CREATE UNIQUE INDEX "ERPTransferRecord_erpPersonnelNumber_key" ON "ERPTransferRecord"("erpPersonnelNumber");
