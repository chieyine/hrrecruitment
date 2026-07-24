# FRAD README Conformance Audit

Audit target: `FRAD_Recruitment_Preboarding_README.md`

Status date: 24 July 2026

This report supersedes the earlier completion claim. The fresh audit found and
repaired authenticated headers that appeared logged out, incorrect draft
presentation, a submitted-application re-entry path, a pre-start assessment
timer, the `/guidance` failure, and browser tests that could pass without
exercising their named workflow. The classifications below distinguish
implemented product behavior, remaining staff-interface debt, and work that can
only be evidenced in FRAD's deployment environment.

## Outcome

The README's in-scope recruitment and preboarding behavior is present in the
repository, including the documented specialist roles. Candidate and staff
actions use structured, validated interfaces; the application source contains
no native browser prompt or confirmation calls. External services and
operational controls still cannot be certified from this local repository.

## Current status report

| Area | Status | Verification or remaining boundary |
| --- | --- | --- |
| Applicant lifecycle | Implemented and tested | Registration, verification, editable reusable profiles, conditional applications, honest draft/submitted states, withdrawal, assessments, interviews, offers and preboarding have direct browser coverage. |
| HR lifecycle | Implemented and tested | Recruitment through readiness, resumption and ERP handover is present. Complaint and case actions use validated, accessible dialogs. |
| Approver | Implemented and tested | Approve, approve-with-conditions, return-for-clarification and reject are directly tested with vacancy transitions and separation of duties. |
| Hiring manager | Implemented and tested | Owned and assigned scope plus a negative report-export boundary are covered on desktop and mobile. |
| Panel member | Implemented and tested | Assigned panel access, conflict declaration, independent mandatory scoring, locking, score-variance alerts and explicit chair confirmation are directly tested. |
| Referee | Implemented | Secure single-use online references, preferred contact method, unable-to-contact records, manager-authorized waivers and HR-recorded manual references are present; manual entries require evidence and canonical outcomes. |
| Course administrator | Implemented and tested | Course-only access, structured content and quiz authoring, attempts, reasoned resets and certificates are implemented. |
| Auditor | Implemented and tested | Read-only audit/report access and authorized exports work without configuration mutation rights. |
| System administrator | Implemented and tested | Restricted candidate/reference/preboarding permissions are not inherited automatically. Governance, operating-model and configuration actions use structured forms. |
| Offers | Implemented and tested | View/download, clarification, structured start-date proposal, typed acceptance, signed-PDF upload, decline and expiry are covered. |
| Policies and courses | Implemented and tested | Supported policy signature methods, structured authoring, documented quiz types, attempts, resets and certificates are present. |
| Assessments | Implemented and tested | Online and practical paths, multiple questions, invitation, marking evidence, timed start/save/submit and pre-start timer behavior are covered. |
| Reports and documentation | Implemented and tested | Twenty-two permission-aware registers export in CSV/XLSX/PDF. Complete ZIP packs, vacancy recruitment files and candidate case files are auditable and directly tested. |
| Search | Implemented and tested | Permission-aware candidate/contact/vacancy/project/department/station/ERP search includes a direct non-disclosure test. |
| Scheduled jobs | Implemented and tested | Expiry, reminder, scheduled-report, retry, retention and escalation paths are present and the due-job/idempotency path is exercised. Scheduled report attachments are generated in the selected CSV, XLSX or PDF format. |
| Accessibility and low connectivity | Internally tested | Keyboard landmarks, accessible names, reduced motion, responsive page rendering, draft recovery and an API-outage path are automated. Formal assistive-technology user testing is outstanding. |
| Release readiness | Not externally proven | Local code/schema/build gates pass. Real PostgreSQL, S3, SMTP, SSO, ClamAV, load, backup and disaster-recovery exercises still require production-equivalent infrastructure. |

## Persona conformance

| Persona | Implemented access and workspace |
| --- | --- |
| Public visitor | Published vacancy search/detail, guidance, complaints, fraud reporting, registration and account recovery |
| Applicant/candidate | Reusable profile, documents, drafts, conditional applications, withdrawal, messages, assessments, interviews, offers, and full preboarding |
| Recruitment officer | Vacancy/application operations, screening, assessments, interviews, references, offers, preboarding and cases |
| HR manager | Full HR workflow, independent approvals, restricted HR content, clearance, resumption, ERP handover, reports and governance |
| Hiring manager | Only owned/assigned vacancies, applications, scorecards and interviews |
| Panel member | Only assigned interviews, conflict declaration, independent scoring and submission |
| Referee | Expiring, single-use public token flow; no internal-record access |
| Approver | Dedicated assigned approval queue with approve, approve-with-conditions, return-for-clarification and reject |
| Course administrator | Dedicated course-only administration, content and quiz authoring, enrolment visibility and attempt reset |
| System administrator | System/configuration administration without automatic access to restricted preboarding, reference, or complaint content |
| Auditor | Read-only recruitment/audit access and authorized report export; no configuration mutation |

## Functional conformance

| README capability | Status | Implementation evidence |
| --- | --- | --- |
| Careers portal and published-vacancy rules | Implemented | Public vacancy APIs/pages and vacancy lifecycle scheduler |
| Registration, verification, recovery and reusable profile | Implemented | Auth APIs and candidate profile workspaces |
| Draft, auto-save, local recovery and one application per vacancy | Implemented | Candidate application UI/API plus database uniqueness |
| Configurable and conditional application questions | Implemented | Vacancy builder, candidate renderer and server-side condition enforcement |
| Required reusable documents and secure uploads | Implemented | Candidate document library, ownership checks, type/size/signature/AV validation |
| Applicant review, filters, notes, bulk actions and Candidate 360 | Implemented | Recruitment application APIs/pages |
| Eligibility, conflicts and versioned scorecards | Implemented | Eligibility engine, conflict gates and scorecard APIs |
| Online and offline assessments | Implemented | All documented delivery/question types, scheduling, attempts, timed auto-submit and manual outcomes |
| Interviews and independent panel scoring | Implemented | Scheduling, invitations/calendar, candidate responses, conflicts, panel submissions and reopen controls |
| Online and manual references | Implemented | Single-use reference flow, reminders, verification and manual evidence entry |
| Selection and maker-checker approval | Implemented | Selection records, approval assignment and self-approval prevention |
| Offers | Implemented | Generation, approval, send/view/expire, PDF download, typed acceptance, signed PDF upload, decline, clarification and proposed start date |
| Preboarding packages | Implemented | Versioned package assignment and materialized snapshots |
| Forms and document review | Implemented | Dynamic forms, auto-save, submission, versioned uploads, approval/return/waiver |
| Policies and signatures | Implemented | Acknowledge, typed name, drawn signature and signed-PDF methods |
| Courses | Implemented | Versioned content, all simple quiz types, attempts, reset, grading and downloadable certificates |
| Tasks, meetings and reporting information | Implemented | Candidate actions and HR management/review |
| Readiness, waivers and clearance | Implemented | Mandatory readiness checks, reasoned waivers and clearance gate |
| Resumption and ERP handover | Implemented | Start confirmation, actual outcome, handover summary and unique ERP personnel number |
| Notifications and schedules | Implemented | Transactional outbox, retries/dead letters, lifecycle/reminder jobs and idempotent daily notification keys |
| Global search | Implemented | Permission-aware candidate/contact/vacancy/project/department/station/ERP search |
| Reports and documentation | Implemented | 22 recruitment, preboarding, operational, privacy and governance registers; recurring delivery; complete ZIP packs; vacancy files; and candidate case files with controlled attachments |
| Scheduled reports | Implemented | User-owned schedules, email delivery links, recurrence and audit events |
| Privacy, retention, legal hold and audit integrity | Implemented | Export/deletion workflows, retention evidence, legal holds and chained audit verification |
| Accessibility and low-connectivity code requirements | Implemented | Responsive layouts, labels, keyboard controls, reduced motion, print styles, plain errors, auto-save, local recovery, retryable uploads and audited HR-assisted entry |

## Automated evidence

- ESLint: passed.
- TypeScript: passed.
- Unit tests: 26 passed.
- SQLite integration tests: 15 passed.
- PostgreSQL Prisma schema validation: passed.
- Production Next.js build: passed, 141 application routes/pages generated.
- Desktop Chromium acceptance matrix: 50 passed and 0 failed. The first pass
  produced 42 passes and eight findings; all eight passed after correction on
  the rebuilt application.
- The browser matrix includes structured administration forms, candidate
  profile CRUD, assessment/interview completion, every public/candidate/HR/admin
  page, specialist personas, authorization boundaries and mobile acceptance.
- Complete generated inventory: 391 files.

## Deployment boundary

The following are deployment tasks, not missing application features:

- Provide production PostgreSQL and run the checked migrations.
- Configure real SMTP and verify sender reputation/delivery.
- Configure the approved SSO provider and callback URLs.
- Configure S3-compatible object storage and ClamAV.
- Configure worker/cron execution, monitoring, alerting and backups.
- Run organizational accessibility testing with assistive-technology users.
- Run load/capacity tests against production-equivalent infrastructure.
- Complete security/privacy approvals and disaster-recovery exercises.

The platform intentionally retains the README's stated exclusions: WhatsApp,
multilingual pages, candidate import tools, advanced/remote proctoring,
AI-generated summaries, internal vacancies, and provider-specific external
job-board/e-signature/SMS integrations.
