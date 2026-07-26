-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "emailAtLink" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "ExternalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "scopeType" TEXT,
    "scopeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalFirstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "preferredName" TEXT,
    "nationality" TEXT,
    "countryOfResidence" TEXT,
    "state" TEXT,
    "lga" TEXT,
    "city" TEXT,
    "address" TEXT,
    "primaryPhone" TEXT,
    "alternatePhone" TEXT,
    "preferredContactMethod" TEXT DEFAULT 'EMAIL',
    "willingnessToRelocate" BOOLEAN NOT NULL DEFAULT false,
    "earliestStartDate" TIMESTAMP(3),
    "profileCompletionPercentage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "noticeVersion" TEXT NOT NULL,
    "decision" BOOLEAN NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEducation" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "fieldOfStudy" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "completionYear" INTEGER NOT NULL,
    "grade" TEXT,
    "certificateFileId" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "CandidateEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEmployment" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "employer" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "responsibilities" TEXT,
    "reasonForLeaving" TEXT,
    "supervisorName" TEXT,
    "supervisorEmail" TEXT,
    "supervisorPhone" TEXT,
    "permissionToContact" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CandidateEmployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateLicence" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "professionalBody" TEXT NOT NULL,
    "licenceType" TEXT NOT NULL,
    "licenceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "evidenceFileId" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "CandidateLicence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateCertification" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuingBody" TEXT NOT NULL,
    "credentialNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "fileId" TEXT,

    CONSTRAINT "CandidateCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSkill" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "proficiency" TEXT,

    CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateLanguage" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "speakingLevel" TEXT NOT NULL,
    "readingLevel" TEXT NOT NULL,
    "writingLevel" TEXT NOT NULL,

    CONSTRAINT "CandidateLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "virusScanStatus" TEXT NOT NULL DEFAULT 'CLEAN',
    "encryptionStatus" TEXT NOT NULL DEFAULT 'ENCRYPTED',
    "sensitivityClass" TEXT NOT NULL DEFAULT 'STANDARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateDocument" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacancyCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VacancyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyStation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lga" TEXT,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DutyStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "projectId" TEXT,
    "categoryId" TEXT,
    "dutyStationId" TEXT NOT NULL,
    "numberOfPositions" INTEGER NOT NULL DEFAULT 1,
    "contractType" TEXT NOT NULL,
    "contractDuration" TEXT,
    "reportingLine" TEXT,
    "summary" TEXT NOT NULL,
    "responsibilities" TEXT NOT NULL,
    "essentialQualifications" TEXT NOT NULL,
    "desirableQualifications" TEXT,
    "minimumExperienceYears" INTEGER NOT NULL DEFAULT 0,
    "desiredExperience" TEXT,
    "languageRequirements" TEXT,
    "technicalSkills" TEXT,
    "behaviouralCompetencies" TEXT,
    "safeguardingResponsibilities" TEXT,
    "travelRequirement" TEXT,
    "openingAt" TIMESTAMP(3) NOT NULL,
    "closingAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "ownerUserId" TEXT NOT NULL,
    "screeningScorecardTemplateId" TEXT,
    "interviewScorecardTemplateId" TEXT,
    "preboardingPackageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lockVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacancyQuestion" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "configurationJson" TEXT,
    "conditionJson" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VacancyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacancyRequiredDocument" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "allowedFileTypes" TEXT NOT NULL DEFAULT 'pdf,jpg,png',
    "maximumFileSize" INTEGER NOT NULL DEFAULT 5242880,
    "expiryRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VacancyRequiredDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "internalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "candidateVisibleStatus" TEXT NOT NULL DEFAULT 'APPLICATION_DRAFT',
    "submittedAt" TIMESTAMP(3),
    "assignedReviewerId" TEXT,
    "eligibilityResult" TEXT,
    "screeningScore" DOUBLE PRECISION,
    "assessmentScore" DOUBLE PRECISION,
    "interviewScore" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "recommendation" TEXT,
    "referenceStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "offerStatus" TEXT,
    "preboardingStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lockVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationProfileSnapshot" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "profileJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationProfileSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationAnswer" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "vacancyQuestionId" TEXT NOT NULL,
    "answerJson" TEXT NOT NULL,

    CONSTRAINT "ApplicationAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationFile" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "vacancyQuestionId" TEXT,
    "fileAssetId" TEXT NOT NULL,

    CONSTRAINT "ApplicationFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationNote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "content" TEXT NOT NULL,
    "restricted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStageHistory" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScorecardTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scorecardType" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ScorecardTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScorecardCriterion" (
    "id" TEXT NOT NULL,
    "scorecardTemplateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maximumScore" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "minimumScore" DOUBLE PRECISION,
    "guidance" TEXT,
    "commentRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScorecardCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateScorecard" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "scorecardTemplateId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "reopenedBy" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "templateSnapshotJson" TEXT,

    CONSTRAINT "CandidateScorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateCriterionScore" (
    "id" TEXT NOT NULL,
    "candidateScorecardId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "evidence" TEXT,

    CONSTRAINT "CandidateCriterionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictDeclaration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "details" TEXT,
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConflictDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "passMark" DOUBLE PRECISION NOT NULL,
    "maximumAttempts" INTEGER NOT NULL DEFAULT 1,
    "randomizeQuestions" BOOLEAN NOT NULL DEFAULT false,
    "autoSubmit" BOOLEAN NOT NULL DEFAULT true,
    "configurationJson" TEXT,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "optionsJson" TEXT,
    "correctAnswerJson" TEXT,
    "maximumScore" DOUBLE PRECISION NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateAssessment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "autoSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "markerUserId" TEXT,
    "markerComment" TEXT,

    CONSTRAINT "CandidateAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateAssessmentAnswer" (
    "id" TEXT NOT NULL,
    "candidateAssessmentId" TEXT NOT NULL,
    "assessmentQuestionId" TEXT NOT NULL,
    "answerJson" TEXT,
    "score" DOUBLE PRECISION,
    "markerComment" TEXT,

    CONSTRAINT "CandidateAssessmentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "venue" TEXT,
    "meetingLink" TEXT,
    "format" TEXT NOT NULL DEFAULT 'VIRTUAL',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "candidateResponse" TEXT,
    "candidateComment" TEXT,
    "createdBy" TEXT NOT NULL,
    "lockVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewPanelMember" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "panelRole" TEXT NOT NULL DEFAULT 'MEMBER',
    "conflictStatus" TEXT NOT NULL DEFAULT 'NONE',
    "conflictComment" TEXT,

    CONSTRAINT "InterviewPanelMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "competency" TEXT,
    "guidance" TEXT,
    "expectedEvidence" TEXT,
    "redFlags" TEXT,
    "maximumScore" DOUBLE PRECISION NOT NULL,
    "commentRequired" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewScore" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "panelMemberId" TEXT NOT NULL,
    "interviewQuestionId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,

    CONSTRAINT "InterviewScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewPanelSubmission" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "panelMemberId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "recommendation" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionsJson" TEXT NOT NULL DEFAULT '[]',
    "reopenedAt" TIMESTAMP(3),
    "reopenedBy" TEXT,
    "reopenReason" TEXT,

    CONSTRAINT "InterviewPanelSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referee" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "periodKnown" TEXT,
    "permissionToContact" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Referee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceRequest" (
    "id" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "secureTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "responseReceivedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ReferenceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceResponse" (
    "id" TEXT NOT NULL,
    "referenceRequestId" TEXT NOT NULL,
    "answersJson" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "confidentialComment" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "ReferenceResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionDecision" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "rank" INTEGER,
    "justification" TEXT,
    "overrideFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "SelectionDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 1,
    "approverUserId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "candidateType" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OfferTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "offerTemplateId" TEXT,
    "position" TEXT NOT NULL,
    "dutyStation" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "contractDuration" TEXT,
    "salary" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "probationPeriod" TEXT,
    "reportingLine" TEXT,
    "conditions" TEXT,
    "acceptanceDeadline" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "offerFileId" TEXT,
    "signedFileId" TEXT,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "candidateComment" TEXT,
    "signatureName" TEXT,
    "signatureMethod" TEXT,
    "signatureIpAddress" TEXT,
    "signatureUserAgent" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedesOfferId" TEXT,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreboardingPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "candidateType" TEXT NOT NULL,
    "roleCategory" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PreboardingPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatePreboarding" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "overallCompletionPercentage" INTEGER NOT NULL DEFAULT 0,
    "readinessStatus" TEXT NOT NULL DEFAULT 'NOT_READY',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "confirmedStartDate" TIMESTAMP(3),
    "startDateConfirmedAt" TIMESTAMP(3),
    "lockVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CandidatePreboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatePreboardingPackage" (
    "id" TEXT NOT NULL,
    "candidatePreboardingId" TEXT NOT NULL,
    "preboardingPackageId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidatePreboardingPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreboardingFormTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "schemaJson" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PreboardingFormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageForm" (
    "id" TEXT NOT NULL,
    "preboardingPackageId" TEXT NOT NULL,
    "formTemplateId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "dueOffsetDays" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "PackageForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatePreboardingForm" (
    "id" TEXT NOT NULL,
    "candidatePreboardingId" TEXT NOT NULL,
    "formTemplateId" TEXT NOT NULL,
    "responseJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "submittedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "returnReason" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "dueAt" TIMESTAMP(3),
    "templateSnapshotJson" TEXT,

    CONSTRAINT "CandidatePreboardingForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequirement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "documentType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "allowedFileTypes" TEXT NOT NULL DEFAULT 'pdf,jpg,png',
    "maximumFileSize" INTEGER NOT NULL DEFAULT 5242880,
    "expiryRequired" BOOLEAN NOT NULL DEFAULT false,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "sensitivityClass" TEXT NOT NULL DEFAULT 'STANDARD',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageDocumentRequirement" (
    "id" TEXT NOT NULL,
    "preboardingPackageId" TEXT NOT NULL,
    "documentRequirementId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "dueOffsetDays" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "PackageDocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateRequiredDocument" (
    "id" TEXT NOT NULL,
    "candidatePreboardingId" TEXT NOT NULL,
    "documentRequirementId" TEXT NOT NULL,
    "fileAssetId" TEXT,
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
    "submittedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "dueAt" TIMESTAMP(3),
    "requirementSnapshotJson" TEXT,

    CONSTRAINT "CandidateRequiredDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateRequiredDocumentVersion" (
    "id" TEXT NOT NULL,
    "candidateRequiredDocumentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateRequiredDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "fileAssetId" TEXT,
    "summary" TEXT,
    "acknowledgementMethod" TEXT NOT NULL DEFAULT 'SIGNATURE',
    "signatureMethod" TEXT NOT NULL DEFAULT 'DIGITAL',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagePolicy" (
    "id" TEXT NOT NULL,
    "preboardingPackageId" TEXT NOT NULL,
    "policyDocumentId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "dueOffsetDays" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "PackagePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatePolicyAcknowledgement" (
    "id" TEXT NOT NULL,
    "candidatePreboardingId" TEXT NOT NULL,
    "policyDocumentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "viewedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signatureMethod" TEXT,
    "signatureData" TEXT,
    "signedFileId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "required" BOOLEAN NOT NULL DEFAULT true,
    "signatureIpAddress" TEXT,
    "signatureUserAgent" TEXT,
    "dueAt" TIMESTAMP(3),
    "policySnapshotJson" TEXT,

    CONSTRAINT "CandidatePolicyAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "learningObjectives" TEXT,
    "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "passMark" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "allowedAttempts" INTEGER NOT NULL DEFAULT 3,
    "certificateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseContent" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "fileAssetId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CourseContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseQuizQuestion" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "correctAnswerJson" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CourseQuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageCourse" (
    "id" TEXT NOT NULL,
    "preboardingPackageId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "timing" TEXT NOT NULL DEFAULT 'BEFORE_RESUMPTION',
    "dueOffsetDays" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "PackageCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateCourse" (
    "id" TEXT NOT NULL,
    "candidatePreboardingId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "certificateFileId" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "courseSnapshotJson" TEXT,

    CONSTRAINT "CandidateCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateCourseAttempt" (
    "id" TEXT NOT NULL,
    "candidateCourseId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "answersJson" TEXT,

    CONSTRAINT "CandidateCourseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreboardingTaskTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "dependencyJson" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PreboardingTaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageTask" (
    "id" TEXT NOT NULL,
    "preboardingPackageId" TEXT NOT NULL,
    "taskTemplateId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "dueOffsetDays" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "PackageTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatePreboardingTask" (
    "id" TEXT NOT NULL,
    "candidatePreboardingId" TEXT NOT NULL,
    "taskTemplateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "candidateComment" TEXT,
    "reviewerComment" TEXT,
    "reviewedBy" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "taskSnapshotJson" TEXT,

    CONSTRAINT "CandidatePreboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateInformationItem" (
    "id" TEXT NOT NULL,
    "candidatePreboardingId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "acknowledgementRequired" BOOLEAN NOT NULL DEFAULT true,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "CandidateInformationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreboardingMeeting" (
    "id" TEXT NOT NULL,
    "candidatePreboardingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "facilitatorUserId" TEXT,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "venue" TEXT,
    "meetingLink" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "candidateResponse" TEXT,
    "attendanceComment" TEXT,

    CONSTRAINT "PreboardingMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadinessCheck" (
    "id" TEXT NOT NULL,
    "candidatePreboardingId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceResourceType" TEXT,
    "sourceResourceId" TEXT,
    "waivedBy" TEXT,
    "waiverReason" TEXT,
    "waivedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ReadinessCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadinessConfirmation" (
    "id" TEXT NOT NULL,
    "candidatePreboardingId" TEXT NOT NULL,
    "confirmedBy" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "summaryJson" TEXT NOT NULL,
    "comment" TEXT,

    CONSTRAINT "ReadinessConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumptionRecord" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "plannedStartDate" TIMESTAMP(3) NOT NULL,
    "actualStartDate" TIMESTAMP(3),
    "reportingLocation" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmedBy" TEXT,
    "supervisorConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,

    CONSTRAINT "ResumptionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ERPTransferRecord" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "erpPersonnelNumber" TEXT NOT NULL,
    "createdInErpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED_IN_ERP',

    CONSTRAINT "ERPTransferRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "restricted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fileAssetId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deliveryChannelsJson" TEXT NOT NULL DEFAULT '["IN_APP","EMAIL"]',
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "previousValueJson" TEXT,
    "newValueJson" TEXT,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "previousHash" TEXT,
    "entryHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudReport" (
    "id" TEXT NOT NULL,
    "suspectContact" TEXT NOT NULL,
    "incidentDetails" TEXT NOT NULL,
    "reporterEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ContractType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allowedFileTypes" TEXT NOT NULL DEFAULT 'pdf,jpg,png',
    "maximumFileSize" INTEGER NOT NULL DEFAULT 5242880,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxMessage" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maximumAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "lastError" TEXT,
    "deduplicationKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "actorUserId" TEXT,
    "requestHash" TEXT NOT NULL,
    "responseJson" TEXT,
    "statusCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalHold" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "placedBy" TEXT NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedBy" TEXT,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "LegalHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "policyVersion" TEXT NOT NULL,
    "summaryJson" TEXT,
    "evidenceHash" TEXT,
    "error" TEXT,

    CONSTRAINT "RetentionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rolesSnapshotJson" TEXT NOT NULL,
    "decisionComment" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintCase" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "reporterEmail" TEXT,
    "applicationId" TEXT,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidentiality" TEXT NOT NULL DEFAULT 'CONFIDENTIAL',
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assignedToUserId" TEXT,
    "acknowledgementSentAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lockVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ComplaintCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintComment" (
    "id" TEXT NOT NULL,
    "complaintCaseId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "internalOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintAttachment" (
    "id" TEXT NOT NULL,
    "complaintCaseId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityVersion" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "changeReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityRule" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "field" TEXT,
    "operator" TEXT NOT NULL,
    "expectedJson" TEXT NOT NULL,
    "failureMessage" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EligibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityEvaluation" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "ruleVersionJson" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL,
    "suggestedOutcome" TEXT NOT NULL,
    "humanDecision" TEXT,
    "decidedBy" TEXT,
    "decisionReason" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "EligibilityEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "resourceType" TEXT,
    "resourceId" TEXT,
    "detailsJson" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summaryJson" TEXT,
    "error" TEXT,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "keyHash" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("keyHash")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ExternalIdentity_userId_idx" ON "ExternalIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdentity_issuer_subject_key" ON "ExternalIdentity"("issuer", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_scopeType_scopeId_key" ON "UserRole"("userId", "roleId", "scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VacancyCategory_name_key" ON "VacancyCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VacancyCategory_code_key" ON "VacancyCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Vacancy_referenceNumber_key" ON "Vacancy"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Application_candidateId_vacancyId_key" ON "Application"("candidateId", "vacancyId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateAssessmentAnswer_candidateAssessmentId_assessmentQ_key" ON "CandidateAssessmentAnswer"("candidateAssessmentId", "assessmentQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewPanelSubmission_panelMemberId_key" ON "InterviewPanelSubmission"("panelMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceRequest_secureTokenHash_key" ON "ReferenceRequest"("secureTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceResponse_referenceRequestId_key" ON "ReferenceResponse"("referenceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_supersedesOfferId_key" ON "Offer"("supersedesOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidatePreboarding_applicationId_key" ON "CandidatePreboarding"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadinessConfirmation_candidatePreboardingId_key" ON "ReadinessConfirmation"("candidatePreboardingId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumptionRecord_applicationId_key" ON "ResumptionRecord"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ERPTransferRecord_applicationId_key" ON "ERPTransferRecord"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_code_key" ON "NotificationTemplate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ContractType_code_key" ON "ContractType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_code_key" ON "DocumentType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxMessage_deduplicationKey_key" ON "OutboxMessage"("deduplicationKey");

-- CreateIndex
CREATE INDEX "OutboxMessage_status_availableAt_idx" ON "OutboxMessage"("status", "availableAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_scope_key_actorUserId_key" ON "IdempotencyRecord"("scope", "key", "actorUserId");

-- CreateIndex
CREATE INDEX "LegalHold_resourceType_resourceId_status_idx" ON "LegalHold"("resourceType", "resourceId", "status");

-- CreateIndex
CREATE INDEX "AccessReview_status_dueAt_idx" ON "AccessReview"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintCase_referenceNumber_key" ON "ComplaintCase"("referenceNumber");

-- CreateIndex
CREATE INDEX "ComplaintCase_status_priority_dueAt_idx" ON "ComplaintCase"("status", "priority", "dueAt");

-- CreateIndex
CREATE INDEX "ComplaintCase_reporterUserId_idx" ON "ComplaintCase"("reporterUserId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityVersion_entityType_entityId_version_key" ON "EntityVersion"("entityType", "entityId", "version");

-- CreateIndex
CREATE INDEX "EligibilityRule_vacancyId_active_idx" ON "EligibilityRule"("vacancyId", "active");

-- CreateIndex
CREATE INDEX "EligibilityEvaluation_applicationId_evaluatedAt_idx" ON "EligibilityEvaluation"("applicationId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "OperationalEvent_eventType_createdAt_idx" ON "OperationalEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "OperationalEvent_resolvedAt_severity_idx" ON "OperationalEvent"("resolvedAt", "severity");

-- CreateIndex
CREATE INDEX "JobRun_jobName_startedAt_idx" ON "JobRun"("jobName", "startedAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- AddForeignKey
ALTER TABLE "ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataDeletionRequest" ADD CONSTRAINT "DataDeletionRequest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEducation" ADD CONSTRAINT "CandidateEducation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEmployment" ADD CONSTRAINT "CandidateEmployment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateLicence" ADD CONSTRAINT "CandidateLicence_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCertification" ADD CONSTRAINT "CandidateCertification_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateLanguage" ADD CONSTRAINT "CandidateLanguage_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VacancyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_dutyStationId_fkey" FOREIGN KEY ("dutyStationId") REFERENCES "DutyStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancyQuestion" ADD CONSTRAINT "VacancyQuestion_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancyRequiredDocument" ADD CONSTRAINT "VacancyRequiredDocument_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationProfileSnapshot" ADD CONSTRAINT "ApplicationProfileSnapshot_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_vacancyQuestionId_fkey" FOREIGN KEY ("vacancyQuestionId") REFERENCES "VacancyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationFile" ADD CONSTRAINT "ApplicationFile_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationFile" ADD CONSTRAINT "ApplicationFile_vacancyQuestionId_fkey" FOREIGN KEY ("vacancyQuestionId") REFERENCES "VacancyQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationFile" ADD CONSTRAINT "ApplicationFile_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationNote" ADD CONSTRAINT "ApplicationNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationNote" ADD CONSTRAINT "ApplicationNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStageHistory" ADD CONSTRAINT "ApplicationStageHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardCriterion" ADD CONSTRAINT "ScorecardCriterion_scorecardTemplateId_fkey" FOREIGN KEY ("scorecardTemplateId") REFERENCES "ScorecardTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateScorecard" ADD CONSTRAINT "CandidateScorecard_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateScorecard" ADD CONSTRAINT "CandidateScorecard_scorecardTemplateId_fkey" FOREIGN KEY ("scorecardTemplateId") REFERENCES "ScorecardTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateScorecard" ADD CONSTRAINT "CandidateScorecard_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCriterionScore" ADD CONSTRAINT "CandidateCriterionScore_candidateScorecardId_fkey" FOREIGN KEY ("candidateScorecardId") REFERENCES "CandidateScorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCriterionScore" ADD CONSTRAINT "CandidateCriterionScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "ScorecardCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictDeclaration" ADD CONSTRAINT "ConflictDeclaration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictDeclaration" ADD CONSTRAINT "ConflictDeclaration_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAssessment" ADD CONSTRAINT "CandidateAssessment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAssessment" ADD CONSTRAINT "CandidateAssessment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAssessmentAnswer" ADD CONSTRAINT "CandidateAssessmentAnswer_candidateAssessmentId_fkey" FOREIGN KEY ("candidateAssessmentId") REFERENCES "CandidateAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAssessmentAnswer" ADD CONSTRAINT "CandidateAssessmentAnswer_assessmentQuestionId_fkey" FOREIGN KEY ("assessmentQuestionId") REFERENCES "AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPanelMember" ADD CONSTRAINT "InterviewPanelMember_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPanelMember" ADD CONSTRAINT "InterviewPanelMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewScore" ADD CONSTRAINT "InterviewScore_panelMemberId_fkey" FOREIGN KEY ("panelMemberId") REFERENCES "InterviewPanelMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewScore" ADD CONSTRAINT "InterviewScore_interviewQuestionId_fkey" FOREIGN KEY ("interviewQuestionId") REFERENCES "InterviewQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPanelSubmission" ADD CONSTRAINT "InterviewPanelSubmission_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPanelSubmission" ADD CONSTRAINT "InterviewPanelSubmission_panelMemberId_fkey" FOREIGN KEY ("panelMemberId") REFERENCES "InterviewPanelMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referee" ADD CONSTRAINT "Referee_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceRequest" ADD CONSTRAINT "ReferenceRequest_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceResponse" ADD CONSTRAINT "ReferenceResponse_referenceRequestId_fkey" FOREIGN KEY ("referenceRequestId") REFERENCES "ReferenceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionDecision" ADD CONSTRAINT "SelectionDecision_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_offerTemplateId_fkey" FOREIGN KEY ("offerTemplateId") REFERENCES "OfferTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_supersedesOfferId_fkey" FOREIGN KEY ("supersedesOfferId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreboarding" ADD CONSTRAINT "CandidatePreboarding_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreboardingPackage" ADD CONSTRAINT "CandidatePreboardingPackage_candidatePreboardingId_fkey" FOREIGN KEY ("candidatePreboardingId") REFERENCES "CandidatePreboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageForm" ADD CONSTRAINT "PackageForm_preboardingPackageId_fkey" FOREIGN KEY ("preboardingPackageId") REFERENCES "PreboardingPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageForm" ADD CONSTRAINT "PackageForm_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "PreboardingFormTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreboardingForm" ADD CONSTRAINT "CandidatePreboardingForm_candidatePreboardingId_fkey" FOREIGN KEY ("candidatePreboardingId") REFERENCES "CandidatePreboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreboardingForm" ADD CONSTRAINT "CandidatePreboardingForm_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "PreboardingFormTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageDocumentRequirement" ADD CONSTRAINT "PackageDocumentRequirement_preboardingPackageId_fkey" FOREIGN KEY ("preboardingPackageId") REFERENCES "PreboardingPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageDocumentRequirement" ADD CONSTRAINT "PackageDocumentRequirement_documentRequirementId_fkey" FOREIGN KEY ("documentRequirementId") REFERENCES "DocumentRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateRequiredDocument" ADD CONSTRAINT "CandidateRequiredDocument_candidatePreboardingId_fkey" FOREIGN KEY ("candidatePreboardingId") REFERENCES "CandidatePreboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateRequiredDocument" ADD CONSTRAINT "CandidateRequiredDocument_documentRequirementId_fkey" FOREIGN KEY ("documentRequirementId") REFERENCES "DocumentRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateRequiredDocumentVersion" ADD CONSTRAINT "CandidateRequiredDocumentVersion_candidateRequiredDocument_fkey" FOREIGN KEY ("candidateRequiredDocumentId") REFERENCES "CandidateRequiredDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagePolicy" ADD CONSTRAINT "PackagePolicy_preboardingPackageId_fkey" FOREIGN KEY ("preboardingPackageId") REFERENCES "PreboardingPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagePolicy" ADD CONSTRAINT "PackagePolicy_policyDocumentId_fkey" FOREIGN KEY ("policyDocumentId") REFERENCES "PolicyDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePolicyAcknowledgement" ADD CONSTRAINT "CandidatePolicyAcknowledgement_candidatePreboardingId_fkey" FOREIGN KEY ("candidatePreboardingId") REFERENCES "CandidatePreboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePolicyAcknowledgement" ADD CONSTRAINT "CandidatePolicyAcknowledgement_policyDocumentId_fkey" FOREIGN KEY ("policyDocumentId") REFERENCES "PolicyDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseContent" ADD CONSTRAINT "CourseContent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseQuizQuestion" ADD CONSTRAINT "CourseQuizQuestion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageCourse" ADD CONSTRAINT "PackageCourse_preboardingPackageId_fkey" FOREIGN KEY ("preboardingPackageId") REFERENCES "PreboardingPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageCourse" ADD CONSTRAINT "PackageCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCourse" ADD CONSTRAINT "CandidateCourse_candidatePreboardingId_fkey" FOREIGN KEY ("candidatePreboardingId") REFERENCES "CandidatePreboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCourse" ADD CONSTRAINT "CandidateCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateCourseAttempt" ADD CONSTRAINT "CandidateCourseAttempt_candidateCourseId_fkey" FOREIGN KEY ("candidateCourseId") REFERENCES "CandidateCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageTask" ADD CONSTRAINT "PackageTask_preboardingPackageId_fkey" FOREIGN KEY ("preboardingPackageId") REFERENCES "PreboardingPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageTask" ADD CONSTRAINT "PackageTask_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "PreboardingTaskTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreboardingTask" ADD CONSTRAINT "CandidatePreboardingTask_candidatePreboardingId_fkey" FOREIGN KEY ("candidatePreboardingId") REFERENCES "CandidatePreboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePreboardingTask" ADD CONSTRAINT "CandidatePreboardingTask_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "PreboardingTaskTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInformationItem" ADD CONSTRAINT "CandidateInformationItem_candidatePreboardingId_fkey" FOREIGN KEY ("candidatePreboardingId") REFERENCES "CandidatePreboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreboardingMeeting" ADD CONSTRAINT "PreboardingMeeting_candidatePreboardingId_fkey" FOREIGN KEY ("candidatePreboardingId") REFERENCES "CandidatePreboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadinessCheck" ADD CONSTRAINT "ReadinessCheck_candidatePreboardingId_fkey" FOREIGN KEY ("candidatePreboardingId") REFERENCES "CandidatePreboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadinessConfirmation" ADD CONSTRAINT "ReadinessConfirmation_candidatePreboardingId_fkey" FOREIGN KEY ("candidatePreboardingId") REFERENCES "CandidatePreboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumptionRecord" ADD CONSTRAINT "ResumptionRecord_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ERPTransferRecord" ADD CONSTRAINT "ERPTransferRecord_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintComment" ADD CONSTRAINT "ComplaintComment_complaintCaseId_fkey" FOREIGN KEY ("complaintCaseId") REFERENCES "ComplaintCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintAttachment" ADD CONSTRAINT "ComplaintAttachment_complaintCaseId_fkey" FOREIGN KEY ("complaintCaseId") REFERENCES "ComplaintCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
