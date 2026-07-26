# FRAD Recruitment and Preboarding Platform

Working Next.js implementation of the product specification in
[`FRAD_Recruitment_Preboarding_README.md`](./FRAD_Recruitment_Preboarding_README.md).
The system covers public vacancies, candidate profiles and applications,
screening, assessments, interviews, references, selection approval, offers,
preboarding, readiness, resumption confirmation, and manual ERP handover.
The root address opens the vacancy board directly; there is no separate
recruitment marketing homepage.

## Run locally

Requirements: Node.js 20+, npm, and PostgreSQL 16+.

```bash
cp .env.example .env
npm ci
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Seed users are created only for local evaluation;
their password is the `SEED_PASSWORD` value. Change or remove those accounts
before using real candidate data.

Set independent random values of at least 32 characters for `JWT_SECRET`,
`SESSION_SECRET`, `STORAGE_ENCRYPTION_KEY`, and `CRON_SECRET`. SMTP is optional
locally; without `SMTP_HOST`, development records only recipient/subject delivery
metadata and does not deliver the message. Production fails closed without SMTP.

## Verification

```bash
npm run lint
npm test
TEST_DATABASE_URL=postgresql://user:password@127.0.0.1:5432/frad_integration npm run test:integration
npm run audit:frontend-coverage
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --exit-code
npm run build
```

The integration suite requires an explicitly configured disposable PostgreSQL
database. Never point `TEST_DATABASE_URL` at a database containing data you need.
The production build runs Prisma Client generation before compiling Next.js.
Browser tests run desktop and mobile Chromium profiles; authenticated flows
require the test credentials configured in CI.

## Implemented workflow

- Public careers search uses opening/closing windows and exposes only open vacancies.
- The public and authenticated interfaces share an editorial FRAD design system
  with role-aware navigation and plain-language candidate guidance.
- Registration sends a signed, expiring verification link. Email verification is required before application submission.
- Candidate profiles support personal details, education, employment, licences, and a private reusable document library.
- Candidate profiles also support skills, languages, certifications, account changes, consent withdrawal, and closure/deletion requests.
- Applications can be saved as drafts, restored, validated against typed vacancy questions, include secure file answers, submitted once, withdrawn, and snapshotted.
- Staff stage changes use explicit state transitions; screening requires a conflict declaration and a versioned scorecard.
- Assessments use an explicit start action, server-side timing, autosave/resume, optional auto-submit, automatic or manual marking, and attempt-safe answer records.
- Interviews support scheduling, editing, invitations, candidate responses, conflict handling, independent panel scores, variance visibility, lock/reopen, and version history.
- Reference links are random, stored only as hashes, expire, and are single-use.
- Selection creation and approval are separate actions and cannot be performed by the same person.
- Offers use approval-before-send, correction versions, clarification, owned acceptance/decline, and electronic-signature evidence. Acceptance creates preboarding and materialises the configured package.
- Candidates can submit forms/documents, sign policies, complete course quizzes and tasks, acknowledge reporting information, and respond to meetings.
- HR can review readiness checks; waivers require an HR manager and a reason. Mandatory outstanding checks block clearance.
- Actual resumption must be confirmed before a manual ERP personnel number can be recorded. No automatic ERP integration exists.
- Admin includes users/roles/status, departments, projects, duty stations,
  contract/document types, preboarding document requirements, vacancy
  categories, templates, scorecards, courses, policies, packages, settings, and
  privacy requests.
- Material actions are audited; authentication endpoints and public reference submission are rate-limited; scheduled work handles vacancy windows, timeouts, reminders, expiry, and retention.
- Reports export live pipeline/preboarding data as CSV, XLSX, or PDF.
- Staff operate from an SLA-backed My Work queue with ownership, blocking,
  escalation, and completion controls.
- Vacancy workspaces, Candidate 360, the preboarding control tower, decision
  quality drill-through, and governed communications replace disconnected
  status-only dashboards.
- Candidates have a consolidated action centre, confidential accommodation
  requests, interview calendar files, and explicit talent-pool consent.
- Workflow, SLA, and integration configuration is versioned or independently
  approved. Selection ranks and override flags are server-computed.
- Talent pools are consent-led and possible duplicate records are flagged for
  human verification; records are never merged automatically.

Explicitly excluded: WhatsApp delivery, multilingual pages, candidate imports,
advanced question banks, advanced/remote proctoring, and AI summaries.

## Security and deployment boundary

Local development and production use PostgreSQL. Local file uploads use the
AES-256-GCM encrypted filesystem-backed private-storage adapter. Production
must use managed PostgreSQL, private encrypted object storage, a distributed
rate limiter, a real malware scanner, HTTPS, backups, monitoring, and configured
SMTP. These are deployment adapters, not automatic ERP integration.

Never commit `.env`, database files, uploaded files, or real candidate data.
Signed downloads require `SESSION_SECRET` or `JWT_SECRET`; scheduled jobs require
`CRON_SECRET` and fail closed when it is absent.

The demo seed refuses to run in production. For a new production database, run
the one-time controlled bootstrap after migrations:

```bash
BOOTSTRAP_ADMIN_EMAIL=admin@example.org \
BOOTSTRAP_ADMIN_PASSWORD='use-a-secret-manager-value' \
npm run db:bootstrap-admin
```

The command refuses to run after a global system administrator exists. Remove
the bootstrap password from the environment immediately afterward.

## Repository map

- `src/app` — public, candidate, recruitment, admin pages and route handlers.
- `src/lib` — authentication, RBAC, state machines, audit, storage, notifications, and preboarding logic.
- `prisma/schema.prisma` — application data model.
- `prisma/seed.ts` — roles, permissions, scorecard, reference data, and the fully linked default preboarding package.
- `tests` — unit and database integration tests.
- `COMPLETE_FILE_AUDIT.md` — generated first-party file inventory with current-state hashes.
- `BACKEND_FRONTEND_COVERAGE.md` — enforced operational API-to-interface contract and approved infrastructure exceptions.

The generated repository inventory is in
[`COMPLETE_FILE_AUDIT.md`](./COMPLETE_FILE_AUDIT.md). It is deliberately not a
self-certifying audit report; executed verification is documented above and
release acceptance remains a separate human-controlled gate. The long-form
product and technical specification remains in
`FRAD_Recruitment_Preboarding_README.md`; this README is the operational guide
for the implemented repository.
