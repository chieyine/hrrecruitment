# HR productivity recommendations — implementation record

Status date: 24 July 2026

The twelve recommendations in the HR productivity review are implemented in
the current repository. “Implemented” here means that the application path,
permissions, validation, audit evidence, error handling and relevant automated
coverage exist. Production infrastructure and organisational acceptance remain
separate release activities.

| Recommendation | Status | Implementation |
| --- | --- | --- |
| My Work as the centre | Implemented | Staff land on My Work. It shows assigned/team work, overdue, due-today, urgent and blocked exceptions, ownership, due dates, blockers, safest next actions and the previous seven days of automated handling. |
| Case-based Candidate 360 | Implemented | Candidate position, blockers, profile, answers, documents, eligibility, assessments, interviews, references, decisions, approvals, offers, preboarding, communications, delivery failures, notes, audit history and case-file exports are consolidated. |
| Routine coordination | Implemented | Application acknowledgement, draft reminders, vacancy opening/closure, unambiguous assessment invitations, assessment/interview reminders, reference chasing, offer reminders/expiry, preboarding reminders, decision-owner alerts, SLA escalation, readiness alerts and scheduled reports run through governed controls. Each considered action is recorded. |
| Safe bulk work | Implemented | Stage changes, assessment invitations, scheduled-interview invitations, messages, reviewer assignment, reference reminders, talent-pool placement and selected-record exports share impact previews and per-record validation. Partial results have receipts; reviewer assignment and talent-pool placement have a 15-minute safe undo. |
| Situation-based communications | Implemented | Approved acknowledgement, assessment, interview, reference, delay, rejection, offer and preboarding templates use candidate/vacancy variables. HR edits the final rendered message. Candidate 360 shows messages, replies/read state and outbound delivery history. |
| Self-sufficient managers and panels | Implemented | Hiring managers see only owned/assigned scope. Panel members land on assigned interviews with permitted evidence, conflict declaration, scoring guidance, mandatory evidence comments, recommendation and submission state. |
| Candidate certainty | Implemented | Candidate pages distinguish draft and submitted records, provide receipts, plain public statuses, outstanding actions, local-time deadlines, next steps, help routes, messages and document/action receipt states without exposing internal HR stages. |
| Configuration safety | Implemented | Versioned configuration edits create drafts with before/after comparison, reason, scheduling and effective dates. A second administrator approves publication. Dependency checks, cloning, version history, publish-time concurrency detection and audited rollback are present. |
| Operational data quality | Implemented | The quality workspace identifies duplicate candidates, missing contact details, unassigned applications, missing scorecards, incomplete panels, inconsistent assessments, offers without approval, overdue preboarding and incomplete ERP handover. Duplicate merge uses comparison, survivor choices, collision checks, independent approval and one transactional merge. |
| Decision-oriented management views | Implemented | Management insight covers stage duration, slow vacancies, delayed work, withdrawal, panel variance, offer-decline reasons, start-date risk and outcomes by permitted operational dimensions. Each metric links to underlying records. |
| Mistakes and interruptions | Implemented | Candidate applications, assessments, preboarding and administration drafts recover entered data. Application filters and density persist. Errors retain inputs, material mutations use optimistic locks, completed bulk actions produce receipts, controlled configuration can roll back, and safe bulk operations can be undone within a bounded window. |
| Outcome measurement | Implemented | Management insight tracks close-to-shortlist time, HR touches, overdue work, hiring-manager waiting time, support cases, delivery failures, abandonment, readiness before start, automated actions and bulk failure rates. |

## Verification

- TypeScript: passed.
- ESLint: passed with no warnings.
- Unit tests: 26 passed.
- SQLite integration tests: 15 passed.
- PostgreSQL Prisma schema validation: passed.
- Production build: passed.
- Desktop Chromium acceptance matrix: 50 passed, 0 failed after correction and
  rerun of the eight findings from the first pass.

## Release boundary

Code completion does not certify FRAD’s production environment. Deployment
still requires real PostgreSQL, object storage, SMTP, SSO and malware scanning;
worker scheduling and monitoring; backup/restore and disaster-recovery
exercises; load testing; and assistive-technology testing with real users.
