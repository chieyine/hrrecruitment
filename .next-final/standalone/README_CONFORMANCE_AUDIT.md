# FRAD README Conformance Audit

Audit target: `FRAD_Recruitment_Preboarding_README.md`

Status date: 25 July 2026

This is a live conformance ledger, not a release certificate. The current
file-by-file code audit is still in progress. Earlier statements that the whole
repository and browser matrix were complete are withdrawn because they were not
supported by the current working tree.

## Outcome

All 118 current API routes have been classified by the enforced
backend-to-frontend contract. Every user-operable route has a mounted consumer;
the health probe and scheduler trigger are the only approved screenless
infrastructure routes. Candidate import code was removed because it contradicts
the explicit product exclusions. Assessment editing, submitted-scorecard
evidence viewing, and preboarding document-requirement administration were added
where backend capabilities previously had no interface.

The wider code audit, production build, and fresh browser acceptance run remain
outstanding. Playwright is intentionally deferred until the code audit is
complete.

## Current status report

| Area | Status | Verification or remaining boundary |
| --- | --- | --- |
| Applicant lifecycle | Implemented; fresh browser rerun pending | Registration, verification, editable reusable profiles, conditional applications, draft/submitted states, withdrawal, assessments, interviews, offers and preboarding are present in code. |
| HR lifecycle | Implemented; fresh browser rerun pending | Recruitment through readiness, resumption and ERP handover is present. Complaint and case actions use structured dialogs. |
| Approver | Implemented; fresh browser rerun pending | Approve, approve-with-conditions, return-for-clarification and reject are implemented with separation of duties. |
| Hiring manager | Implemented; fresh browser rerun pending | Owned and assigned scopes plus report-export authorization are implemented. |
| Panel member | Implemented; fresh browser rerun pending | Assigned panel access, conflict declaration, independent scoring, locking, variance alerts and chair confirmation are implemented. |
| Referee | Implemented | Secure single-use online references, preferred contact method, unable-to-contact records, manager-authorized waivers and HR-recorded manual references are present; manual entries require evidence and canonical outcomes. |
| Course administrator | Implemented; fresh browser rerun pending | Course-only access, structured content and quiz authoring, attempts, reasoned resets and certificates are implemented. |
| Auditor | Implemented; fresh browser rerun pending | Read-only audit/report access and authorized exports are implemented without configuration mutation rights. |
| System administrator | Implemented; fresh browser rerun pending | Restricted candidate/reference/preboarding permissions are not inherited automatically. Governance, operating-model and configuration actions use structured forms. |
| Offers | Implemented; fresh browser rerun pending | View/download, clarification, structured start-date proposal, typed acceptance, signed-PDF upload, decline and expiry are present. |
| Policies and courses | Implemented; fresh browser rerun pending | Supported policy signature methods, structured authoring, documented quiz types, attempts, resets and certificates are present. |
| Assessments | Implemented; fresh browser rerun pending | Online and practical paths, editing, questions, invitation, marking evidence, timed start/save/submit and pre-start timing are present. |
| Reports and documentation | Implemented; fresh browser rerun pending | Permission-aware registers, ZIP packs, vacancy files and candidate case files are present. |
| Search | Implemented; fresh browser rerun pending | Permission-aware candidate/contact/vacancy/project/department/station/ERP search is present. |
| Scheduled jobs | Implemented; integration rerun pending | Expiry, reminder, scheduled-report, retry, retention and escalation paths are present. |
| Accessibility and low connectivity | Code review in progress | Keyboard landmarks, accessible names, reduced motion, responsive layouts, draft recovery and retry paths are present; fresh browser and assistive-technology validation remain. |
| Release readiness | Not yet established | TypeScript, ESLint, unit tests and API/interface coverage pass. Integration, build, Playwright and production-equivalent exercises remain. |

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

Current working-tree evidence:

- ESLint: passed.
- TypeScript: passed.
- Unit tests: 78 passed across 13 files.
- Backend-to-frontend contract: 118 API routes classified; 116 have frontend
  consumers and two are approved infrastructure-only routes.
- Integration harness: corrected to require PostgreSQL instead of its invalid
  SQLite fallback. A fresh local integration run is pending a disposable
  PostgreSQL service.
- Production build: not yet rerun after the current audit changes.
- Playwright: not run during this code-first phase, by explicit instruction.
- Generated file inventory: must be regenerated at the end of the audit because
  the working tree is still changing.

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
