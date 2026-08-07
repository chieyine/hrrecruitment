# 11. Security, privacy and data

## 11.1 Authentication

Password authentication with bcrypt at cost factor 12, chosen as a meaningful brake on offline cracking while staying inside a normal request budget. Passwords are validated for length and composition and capped at 72 UTF-8 bytes, the bcrypt limit.

Additional controls:

- **TOTP multi-factor authentication** (RFC 6238) with recovery codes
- **Automatic lockout** after repeated failures, expiring on its own so a locked-out user recovers without an administrator; a manual administrative lock remains indefinite and separate
- **Per-device sessions** with individual revocation
- **Session versioning**, so a password change or forced sign-out invalidates every existing token
- **Optional SSO** through OIDC

Sessions are JWT cookies. Verification status is deliberately **not** carried in the token — it would go stale the moment someone verified — so a token-only read reports "not verified" and fails closed, and anything depending on it re-reads from the database.

## 11.2 Authorisation

Three layers, checked in order:

1. **Role** — coarse routing, deciding which workspace a user lands in
2. **Permission** — granular capability, checked per action
3. **Scope** — resource-level assignment, so a hiring manager sees only their own vacancies

Scoped role assignments never become global merely because a caller omitted resource context; the check fails closed until the exact scope is supplied.

System administrators are structurally excluded from operational permissions. If an operational role is mistakenly also assigned to a system-admin account, the platform ignores it.

## 11.3 Rate limiting and abuse

Distributed rate limiting protects authentication and the public vacancy feed. Public search terms are capped in length. Idempotency keys are required for operations that must not double-execute — recording an ERP transfer, submitting an application — so a retried request returns the original result rather than acting twice.

## 11.4 Files

Uploaded files are validated for type, size and signature, scanned for viruses, encrypted at rest, and classified by sensitivity as standard, confidential or restricted. Access is checked against ownership and permission on every read. Restricted files are excluded from bulk exports.

## 11.5 Secrets

Secrets held in the database — TOTP seeds, OAuth access and refresh tokens, PKCE verifiers — are sealed with AES-256-GCM under a key derived from `STORAGE_ENCRYPTION_KEY`. A dump of the database yields no usable credential.

An unopenable token is treated as a changed key: the identity is marked expired with an explanatory message, rather than producing a stream of unexplained authorisation failures.

## 11.6 Data protection

| Requirement | Implementation |
| --- | --- |
| Privacy notice | Published, versioned, and the accepted version recorded per candidate |
| Consent records | Per consent type with the notice version, decision, date and any withdrawal |
| Data minimisation | Only necessary fields transmitted to any third party |
| Role-based access | Every read is permission-checked |
| Encryption | In transit and at rest |
| Secure upload | Validated, scanned, access-controlled |
| Retention schedule | Configurable, with recorded retention runs |
| Correction | Candidates may correct their own profile |
| Deletion | Requested, reviewed against holds and statutory windows, decided with a recorded basis |
| Secure archive | Records move to archived state rather than being deleted |
| Anonymisation | Automatic where configured |
| Legal hold | Suspends retention and deletion for named records |
| Breach logging | Operational events with severity |
| Restricted export | Permission-scoped and audited |

## 11.7 The data model

136 models, grouped by area:

| Area | Models | Examples |
| --- | --- | --- |
| Identity and permissions | 10 | User, Role, Permission, RolePermission, UserRole, UserSession, UserMfaSecret, ExternalIdentity |
| Candidate profile | 9 | CandidateProfile, CandidateEducation, CandidateEmployment, CandidateLicence, ConsentRecord |
| Files and documents | 2 | FileAsset, CandidateDocument |
| Vacancies and configuration | 4 | Vacancy, Department, Project, DutyStation |
| Staffing requests and funding | 6 | StaffingRequest, FundingConfirmation, OfferFinancialApproval |
| Applications | 6 | Application, ApplicationAnswer, ApplicationProfileSnapshot, ApplicationStageHistory |
| Scorecards and screening | 5 | ScorecardTemplate, ScorecardCriterion, CandidateScorecard, ConflictDeclaration |
| Assessments | 4 | Assessment, AssessmentQuestion, CandidateAssessment |
| Interviews | 5 | Interview, InterviewPanelMember, InterviewScore, InterviewPanelSubmission |
| References | 3 | Referee, ReferenceRequest, ReferenceResponse |
| Selection and approvals | 3 | SelectionDecision, Approval, ApprovalCondition |
| Offers | 2 | Offer, OfferTemplate |
| Preboarding | 22 | Packages, forms, documents, policies, courses, tasks, meetings |
| Readiness and ERP transfer | 4 | ReadinessCheck, ResumptionRecord, ERPTransferRecord |
| Due diligence | 1 | BackgroundCheck |
| CV parsing | 1 | CvParseResult |
| Electronic signatures | 1 | ElectronicSignature |
| Messaging, notifications, audit | 7 | MessageThread, Notification, AuditLog, AuditChainHead |
| Recruitment operating system | 20 | WorkflowDefinition, SlaPolicy, WorkItem, TalentPool, EligibilityRule, LonglistRun |
| Reliability and governance | 18 | OutboxMessage, LegalHold, RetentionRun, ComplaintCase, EntityVersion, JobRun |

## 11.8 Talent pools

Approved pools for emergency response, consultants, enumerators, drivers, community mobilisers, health, nutrition, WASH, protection, MEAL, finance and operations, interns and volunteers, and reserve candidates.

Each roster record shows the technical category, preferred location, availability, expected rate or grade, previous assessment results, reference status, background-check status, roster expiry, last verification date and deployment history.

**Candidates must consent before being added**, and that consent carries an expiry.
