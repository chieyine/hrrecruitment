# 15. Component index

Generated from the codebase. Every screen, endpoint and module the platform contains.

| Component type | Count |
| --- | --- |
| Screens (pages) | 103 |
| API endpoints | 134 |
| Domain modules | 75 |
| UI components | 65 |
| Database models | 136 |

## 15.1 Screens

### Careers portal (2)

- `/careers`
- `/careers/[reference]`

### Public (11)

- `/complaints`
- `/forgot-password`
- `/guidance`
- `/page.tsx`
- `/privacy`
- `/public/reference/[token]`
- `/recruitment-faq`
- `/report-fraud`
- `/reset-password`
- `/terms`
- `/verify-email`

### Authentication (2)

- `/auth/login`
- `/auth/register`

### Candidate portal (27)

- `/candidate/accommodations`
- `/candidate/applications`
- `/candidate/applications/[id]`
- `/candidate/applications/[id]/receipt`
- `/candidate/applications/apply`
- `/candidate/assessments/[id]`
- `/candidate/complaints`
- `/candidate/dashboard`
- `/candidate/interviews`
- `/candidate/messages`
- `/candidate/offers/[id]`
- `/candidate/preboarding`
- `/candidate/preboarding/courses`
- `/candidate/preboarding/documents`
- `/candidate/preboarding/forms`
- `/candidate/preboarding/meetings`
- `/candidate/preboarding/policies`
- `/candidate/preboarding/reporting-information`
- `/candidate/preboarding/tasks`
- `/candidate/profile`
- `/candidate/profile/documents`
- `/candidate/profile/education`
- `/candidate/profile/employment`
- `/candidate/profile/licences`
- `/candidate/profile/personal`
- `/candidate/settings`
- `/candidate/tasks`

### Recruitment workspace (34)

- `/recruitment/accommodations`
- `/recruitment/applications`
- `/recruitment/applications/[id]`
- `/recruitment/applications/[id]/handover`
- `/recruitment/approvals`
- `/recruitment/assessments`
- `/recruitment/audit`
- `/recruitment/background-checks`
- `/recruitment/communications`
- `/recruitment/complaints`
- `/recruitment/dashboard`
- `/recruitment/erp-transfers`
- `/recruitment/funding`
- `/recruitment/insights`
- `/recruitment/interviews`
- `/recruitment/longlisting`
- `/recruitment/longlisting/exceptions`
- `/recruitment/offers`
- `/recruitment/operations`
- `/recruitment/preboarding`
- `/recruitment/preboarding/[id]`
- `/recruitment/quality`
- `/recruitment/references`
- `/recruitment/reports`
- `/recruitment/search`
- `/recruitment/selections`
- `/recruitment/settings`
- `/recruitment/staffing-requests`
- `/recruitment/talent-pools`
- `/recruitment/vacancies`
- `/recruitment/vacancies/[id]`
- `/recruitment/vacancies/[id]/edit`
- `/recruitment/vacancies/new`
- `/recruitment/work`

### Administration (27)

- `/admin/assessment-bank`
- `/admin/automations`
- `/admin/configuration-releases`
- `/admin/contract-types`
- `/admin/courses`
- `/admin/deletion-requests`
- `/admin/departments`
- `/admin/document-requirements`
- `/admin/document-types`
- `/admin/duty-stations`
- `/admin/forms`
- `/admin/fraud-reports`
- `/admin/governance`
- `/admin/interview-questions`
- `/admin/notification-templates`
- `/admin/operating-model`
- `/admin/permissions`
- `/admin/policies`
- `/admin/preboarding-packages`
- `/admin/projects`
- `/admin/roles`
- `/admin/scorecards`
- `/admin/system-settings`
- `/admin/tasks`
- `/admin/templates`
- `/admin/users`
- `/admin/vacancy-categories`

<!--pagebreak-->

## 15.2 API endpoints

### Administration (9)

- `/api/admin/automations`
- `/api/admin/configuration-builder`
- `/api/admin/configuration-releases`
- `/api/admin/deletion-requests`
- `/api/admin/fraud-reports`
- `/api/admin/generic`
- `/api/admin/governance`
- `/api/admin/operating-model`
- `/api/admin/users/[id]`

### Authentication (12)

- `/api/auth/forgot-password`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/mfa`
- `/api/auth/mfa/challenge`
- `/api/auth/register`
- `/api/auth/reset-password`
- `/api/auth/session`
- `/api/auth/sessions`
- `/api/auth/sso/callback`
- `/api/auth/sso/start`
- `/api/auth/verify-email`

### Calendar (1)

- `/api/calendar/interviews/[id]`

### Candidate (28)

- `/api/candidate/accommodations`
- `/api/candidate/account`
- `/api/candidate/applications`
- `/api/candidate/applications/[id]`
- `/api/candidate/assessments/[id]`
- `/api/candidate/assessments/[id]/answers`
- `/api/candidate/assessments/[id]/answers/review`
- `/api/candidate/assessments/[id]/start`
- `/api/candidate/assessments/[id]/submit`
- `/api/candidate/documents`
- `/api/candidate/documents/[id]`
- `/api/candidate/education`
- `/api/candidate/education/[id]`
- `/api/candidate/employment`
- `/api/candidate/employment/[id]`
- `/api/candidate/interviews/[id]/respond`
- `/api/candidate/licences`
- `/api/candidate/licences/[id]`
- `/api/candidate/offers/[id]`
- `/api/candidate/offers/[id]/respond`
- `/api/candidate/preboarding`
- `/api/candidate/preboarding/actions`
- `/api/candidate/preboarding/confirm-start-date`
- `/api/candidate/preboarding/courses/[id]/certificate`
- `/api/candidate/privacy/export`
- `/api/candidate/profile`
- `/api/candidate/profile-items`
- `/api/candidate/saved-searches`

### Cases (2)

- `/api/complaints`
- `/api/complaints/[id]/comments`

### Files (2)

- `/api/assets/download/[id]`
- `/api/assets/upload`

### Integrations (2)

- `/api/integrations/calendar/callback/[provider]`
- `/api/integrations/calendar/connect`

### Messaging (1)

- `/api/messages`

### Operations (1)

- `/api/health`

### Public (5)

- `/api/public/fraud-reports`
- `/api/public/reference/resolve`
- `/api/public/reference/submit`
- `/api/public/vacancies`
- `/api/public/vacancies/[reference]`

### Recruitment (70)

- `/api/recruitment/accommodations`
- `/api/recruitment/applications`
- `/api/recruitment/applications/[id]`
- `/api/recruitment/applications/[id]/assign-reviewer`
- `/api/recruitment/applications/[id]/conflict`
- `/api/recruitment/applications/[id]/documentation`
- `/api/recruitment/applications/[id]/erp-transfer`
- `/api/recruitment/applications/[id]/erp-transfer/approve`
- `/api/recruitment/applications/[id]/erp-transfer/pack`
- `/api/recruitment/applications/[id]/handover-summary`
- `/api/recruitment/applications/[id]/notes`
- `/api/recruitment/applications/[id]/referees`
- `/api/recruitment/applications/[id]/resumption`
- `/api/recruitment/applications/[id]/stage`
- `/api/recruitment/applications/assisted`
- `/api/recruitment/applications/bulk-actions`
- `/api/recruitment/applications/bulk-actions/[id]/undo`
- `/api/recruitment/applications/bulk-export`
- `/api/recruitment/applications/bulk-stage-change`
- `/api/recruitment/approvals`
- `/api/recruitment/assessments`
- `/api/recruitment/assessments/[id]`
- `/api/recruitment/assessments/[id]/invite`
- `/api/recruitment/assessments/[id]/offline-pack`
- `/api/recruitment/assessments/[id]/offline-results`
- `/api/recruitment/background-checks`
- `/api/recruitment/candidate-assessments/[id]/answers`
- `/api/recruitment/candidate-assessments/[id]/mark`
- `/api/recruitment/candidate-assessments/[id]/reset`
- `/api/recruitment/complaints`
- `/api/recruitment/data-quality/merges`
- `/api/recruitment/eligibility`
- `/api/recruitment/interviews`
- `/api/recruitment/interviews/[id]`
- `/api/recruitment/interviews/[id]/confirm-panel`
- `/api/recruitment/interviews/[id]/invite`
- `/api/recruitment/interviews/[id]/panel/[memberId]/reopen`
- `/api/recruitment/interviews/[id]/panel/[memberId]/resolve-conflict`
- `/api/recruitment/interviews/[id]/scores`
- `/api/recruitment/interviews/availability`
- `/api/recruitment/longlisting/exceptions`
- `/api/recruitment/longlisting/rules`
- `/api/recruitment/longlisting/runs`
- `/api/recruitment/offers`
- `/api/recruitment/offers/[id]`
- `/api/recruitment/offers/[id]/actions`
- `/api/recruitment/offers/[id]/preview`
- `/api/recruitment/preboarding/[id]`
- `/api/recruitment/preboarding/[id]/manage`
- `/api/recruitment/preboarding/clearance`
- `/api/recruitment/referees/[id]/send-reminder`
- `/api/recruitment/referees/[id]/send-request`
- `/api/recruitment/reference-responses/[id]/verify`
- `/api/recruitment/reports/export`
- `/api/recruitment/reports/schedules`
- `/api/recruitment/scorecards`
- `/api/recruitment/scorecards/[id]`
- `/api/recruitment/scorecards/[id]/reopen`
- `/api/recruitment/search`
- `/api/recruitment/selections`
- `/api/recruitment/staffing-requests`
- `/api/recruitment/staffing-requests/[id]/actions`
- `/api/recruitment/staffing-requests/[id]/funding`
- `/api/recruitment/talent-pools`
- `/api/recruitment/vacancies`
- `/api/recruitment/vacancies/[id]`
- `/api/recruitment/vacancies/[id]/actions`
- `/api/recruitment/vacancies/[id]/documentation`
- `/api/recruitment/vacancies/[id]/emergency-review`
- `/api/recruitment/work-items/[id]`

### Scheduled jobs (1)

- `/api/cron/process-schedules`

<!--pagebreak-->

## 15.3 Domain modules

| Module | Purpose |
| --- | --- |
| `anonymisation.ts` | Anonymised longlisting and shortlisting (End_to_End.md §28.3) |
| `application-reference.ts` | — |
| `application-stages.ts` | Every internal application stage, in pipeline order |
| `approvals.ts` | Choose an approver who is independent of the requester |
| `audit.ts` | Verify the tamper-evident audit chain |
| `auth.ts` | Resolve the JWT signing secret. No insecure fallback: the process must be |
| `authz.ts` | Well-known Prisma error codes mapped to the response a caller can act on |
| `automations.ts` | — |
| `background-checks.ts` | Background and due-diligence checks (End_to_End.md §16, §28.11) |
| `background-jobs.ts` | — |
| `calendar-identity.ts` | Storage and lifecycle for a user's calendar OAuth grant (§28.15) |
| `calendar-providers.ts` | Calendar and video-meeting providers (End_to_End.md §28.15) |
| `candidate-preboarding.ts` | — |
| `candidate-status.ts` | — |
| `candidate-tasks.ts` | — |
| `complaint-workflow.ts` | — |
| `concurrency.ts` | — |
| `configuration-releases.ts` | — |
| `cv-parser.ts` | Structured CV parsing (End_to_End.md §28.1) |
| `deterministic-shuffle.ts` | — |
| `eligibility.ts` | Longlisting execution (End_to_End.md §11.3) |
| `emergency-recruitment.ts` | Emergency recruitment (End_to_End.md §28.7) |
| `erp-handover.ts` | ERP handover (End_to_End.md §19) |
| `errors.ts` | — |
| `export-files.ts` | — |
| `form-template-fields.ts` | — |
| `form-template.ts` | — |
| `home-route.ts` | One source of truth for the first page a signed-in user sees |
| `idempotency.ts` | — |
| `internal-identity.ts` | Internal candidate identity (End_to_End.md §28.8) |
| `job-alerts.ts` | Emails candidates when a vacancy matching one of their saved searches opens |
| `lockout.ts` | Automatic account lockout after consecutive failed sign-in attempts |
| `logger.ts` | Tiny structured logger. Emits single-line JSON so logs are greppable and can |
| `longlisting-rules.ts` | Rule-based longlisting (End_to_End.md §11) |
| `mailer.ts` | Email transport. Uses nodemailer over SMTP when SMTP_* env vars are set and |
| `message-template-fields.ts` | — |
| `message-template.ts` | — |
| `notifications.ts` | — |
| `offer-document.ts` | — |
| `offer-template-fields.ts` | — |
| `offer-template.ts` | — |
| `oidc.ts` | — |
| `outbox.ts` | — |
| `pagination.ts` | One pagination contract for every list endpoint |
| `policy-template.ts` | — |
| `preboarding.ts` | — |
| `prisma.ts` | — |
| `profile-completion.server.ts` | — |
| `profile-completion.ts` | — |
| `qr.ts` | Minimal QR code encoder producing an inline SVG |
| `rate-limit.ts` | Minimal in-memory sliding-window rate limiter. Suitable for a single-instance |
| `rbac.ts` | System administration is a technical control-plane role. It must never |
| `recruitment-access.ts` | Resolve access against the concrete application. Permission checks alone are |
| `recruitment-role-policy.ts` | §3.7 Funding authority sits with the Budget Holder — the person with authority |
| `recruitment-scoring.server.ts` | — |
| `recruitment-scoring.ts` | Pure selection-scoring maths. This module must not import Prisma: it is |
| `references.ts` | — |
| `retention.ts` | Apply the approved short-lived-record policy as one serializable database |
| `roles.ts` | Role classification shared by Edge middleware, server routes and client UI |
| `s3.ts` | File storage adapter. Persists bytes to a local storage root |
| `scheduled-report.ts` | — |
| `search.ts` | PostgreSQL full-text search over vacancies and candidates |
| `secret-box.ts` | AES-256-GCM envelope for short secrets held in the database (currently TOTP |
| `session.ts` | Single place where a signed-in session is minted |
| `signature-policy.ts` | Signature policy and hashing (End_to_End.md §28.10) |
| `signatures.ts` | Electronic approvals and signatures (End_to_End.md §28.10) |
| `simple-pdf.ts` | A generic branded, sectioned A4 document |
| `staffing-request.ts` | Staffing request lifecycle (End_to_End.md §5) |
| `state-machine.ts` | Application & vacancy state transition rules (README §42) |
| `tokens.ts` | — |
| `totp.ts` | TOTP (RFC 6238) over HMAC-SHA1 with 6 digits and a 30-second step — the |
| `utils.ts` | The timezone every rendered date is expressed in |
| `validation.ts` | Parse and validate a request body against a Zod schema |
| `virus-scan.ts` | File anti-virus scan hook |
| `work-items.ts` | Materialises actionable work from authoritative workflow records. Upserts |

<!--pagebreak-->

## 15.4 Database models

**1. Identity & Permissions** — `User`, `UserMfaSecret`, `UserRecoveryCode`, `UserSession`, `SavedSearch`, `ExternalIdentity`, `Role`, `Permission`, `RolePermission`, `UserRole`

**2. Candidate Profile** — `CandidateProfile`, `ConsentRecord`, `DataDeletionRequest`, `CandidateEducation`, `CandidateEmployment`, `CandidateLicence`, `CandidateCertification`, `CandidateSkill`, `CandidateLanguage`

**3. File Storage & Documents** — `FileAsset`, `CandidateDocument`

**4. Vacancies & Config** — `Department`, `VacancyCategory`, `Project`, `DutyStation`

**4a. Staffing Requests & Funding (End_to_End.md §5, §3.7)** — `StaffingRequest`, `FundingConfirmation`, `OfferFinancialApproval`, `Vacancy`, `VacancyQuestion`, `VacancyRequiredDocument`

**5. Applications** — `Application`, `ApplicationProfileSnapshot`, `ApplicationAnswer`, `ApplicationFile`, `ApplicationNote`, `ApplicationStageHistory`

**6. Scorecards & Screening** — `ScorecardTemplate`, `ScorecardCriterion`, `CandidateScorecard`, `CandidateCriterionScore`, `ConflictDeclaration`

**7. Assessments** — `Assessment`, `AssessmentQuestion`, `CandidateAssessment`, `CandidateAssessmentAnswer`

**8. Interviews** — `Interview`, `InterviewPanelMember`, `InterviewQuestion`, `InterviewScore`, `InterviewPanelSubmission`

**9. References** — `Referee`, `ReferenceRequest`, `ReferenceResponse`

**10. Selection & Approvals** — `SelectionDecision`, `Approval`, `ApprovalCondition`

**11. Offers** — `OfferTemplate`, `Offer`

**12. Preboarding Packages & Requirements** — `PreboardingPackage`, `CandidatePreboarding`, `CandidatePreboardingPackage`

**13. Preboarding Forms** — `PreboardingFormTemplate`, `PackageForm`, `CandidatePreboardingForm`

**14. Document Requirements** — `DocumentRequirement`, `PackageDocumentRequirement`, `CandidateRequiredDocument`, `CandidateRequiredDocumentVersion`

**15. Policies & Signatures** — `PolicyDocument`, `PackagePolicy`, `CandidatePolicyAcknowledgement`

**16. Compulsory Courses** — `Course`, `CourseContent`, `CourseQuizQuestion`, `PackageCourse`, `CandidateCourse`, `CandidateCourseContentProgress`, `CandidateCourseAttempt`

**17. Pre-resumption Tasks & Info** — `PreboardingTaskTemplate`, `PackageTask`, `CandidatePreboardingTask`, `CandidateInformationItem`

**18. Meetings & Orientation** — `PreboardingMeeting`

**19. Readiness, Resumption & ERP Transfer** — `ReadinessCheck`, `ReadinessConfirmation`, `ResumptionRecord`, `ERPTransferRecord`

**19a. Background & Due-Diligence Checks (§16, §28.11)** — `BackgroundCheck`

**19b. CV Parsing (§28.1)** — `CvParseResult`

**19c. Electronic Signatures (§28.10)** — `ElectronicSignature`

**20. Messaging, Notifications & Audit** — `MessageThread`, `Message`, `Notification`, `AuditLog`, `AuditChainHead`, `FraudReport`, `SystemSetting`

**22. Recruitment operating system** — `WorkflowDefinition`, `WorkflowVersion`, `WorkflowTransitionRule`, `SlaPolicy`, `WorkItem`, `TalentPool`, `TalentPoolMember`, `AccommodationRequest`, `IntegrationConnection`, `IntegrationIdentity`, `IntegrationOAuthState`, `AvailabilityWindow`, `ConfigurationChangeRequest`, `AutomationControl`, `AutomationActionLog`, `BulkActionRun`, `CandidateMergeReview`, `NotificationTemplate`, `ContractType`, `DocumentType`

**21. Reliability, Governance & Case Management** — `OutboxMessage`, `IdempotencyRecord`, `LegalHold`, `RetentionRun`, `AccessReview`, `ComplaintCase`, `ComplaintComment`, `ComplaintAttachment`, `EntityVersion`, `EligibilityRule`, `EligibilityRuleChange`, `LonglistRun`, `EligibilityEvaluation`, `OperationalEvent`, `JobRun`, `JobLease`, `RateLimitBucket`, `ScheduledReport`
