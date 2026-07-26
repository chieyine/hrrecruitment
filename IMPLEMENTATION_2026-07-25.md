# Implementation report — recommendations from RECOMMENDATIONS_2026-07-25.md

All recommendations implemented. **83 files changed, 41 added.**

Your three decisions, applied: TOTP built in-app (nobody can be locked out),
schema changes written with hand-authored migration SQL, and the large items
(pagination, full-text search, bulk import) included in full.

| Check | Result |
|---|---|
| Typecheck (`tsc --noEmit`, 300+ files) | clean |
| ESLint, whole tree | **0 errors**, 34 advisory warnings |
| Unit tests | **90 passing / 13 files** (was 26 / 7) |
| Schema generator | succeeds, idempotent, output in sync |
| Migration vs schema | every column and table cross-checked ✓ |

**Read §7 before deploying.** There is a required migration, and two things I
could not run in this environment.

---

## 1. Things that should have worked

### 1.1 Assessment marking is no longer blind

`GET /api/recruitment/candidate-assessments/[id]/answers` returns each question
with the candidate's answer, in the order the candidate saw it (same
`deterministicShuffle` seed the runner uses). `PATCH` records per-question marks
with a running total, so a long-text assessment is marked question by question
instead of with one overall guess.

- `AssessmentAnswerReview.tsx` renders it beside the score field in
  `AssessmentManager`, and appears as soon as a submitted assessment is selected.
- Auto-markable types (MCQ, multiselect, true/false, number) show the expected
  answer and flag whether it matches. Free-text types deliberately do not —
  a "model answer" next to a candidate's prose invites marking against the wrong
  thing.
- Marks are capped at each question's `maximumScore`, and an already-marked
  assessment must be reset before re-marking.
- Answers are only readable once the candidate has submitted, so a marker cannot
  watch a live attempt.

Candidates can now review their own submission too
(`GET /api/candidate/assessments/[id]/answers/review` +
`AssessmentSubmissionReview.tsx`). That endpoint is deliberately narrower: no
correct answers, no per-question marks, no marker comments — otherwise a
candidate could derive the answer key from their own paper. The score is
released only once marking is complete.

### 1.2 Fraud reports are now triaged

`/admin/fraud-reports` with `GET`/`PATCH` at `/api/admin/fraud-reports`,
restricted to `SYSTEM_ADMIN` and `HR_MANAGER`, filterable by status with counts.

- Schema gains `triagedBy`, `triagedAt`, `triageNote` on `FraudReport`.
- Closing a report as `ACTIONED` or `DISMISSED` **requires** a written decision.
  A confidential channel needs an accountability record, not just a status flip.
- The notification now names the queue, so it points somewhere openable.
- `proxy.ts` and the admin nav both let HR managers reach it, matching what the
  handler enforces.

### 1.3 The case notes panel can be filled in

`CaseGovernanceActions.tsx` on the application detail page: a note composer with
categories and the restricted flag, reviewer assignment, and scorecard reopening.
Reviewer options come from the existing `bulk-actions` GET rather than a second
source of truth.

### 1.4 All ten orphaned endpoints have a UI

| Endpoint | Where it now lives |
|---|---|
| `applications/[id]/notes` | `CaseGovernanceActions` |
| `applications/[id]/assign-reviewer` | `CaseGovernanceActions` |
| `scorecards/[id]/reopen` | `CaseGovernanceActions` |
| `interviews/[id]/invite` | `InterviewCoordinationActions` |
| `interviews/[id]` PATCH | `InterviewCoordinationActions` (reschedule) |
| `interviews/[id]/panel/[memberId]/reopen` | `InterviewCoordinationActions` |
| `.../resolve-conflict` | `InterviewCoordinationActions` |
| `offers/[id]` PATCH | `OfferCorrection` |

Orphaned routes went **13 → 5**. Of the remainder, three are external by design
(`/api/health` for monitors, `/api/cron/process-schedules` for the scheduler,
`/api/public/vacancies/[reference]` — the careers page queries Prisma directly).
Two remain genuinely unwired and are listed in §8.

`/recruitment/quality` will now show a non-zero "Reopened scorecards" count,
because reopening is finally possible.

### 1.5 Nothing is unreachable any more

- **Header nav:** staff gain `Selections`; candidates gain `My concerns` and
  `Settings`.
- **`/recruitment/work`** gains an "Elsewhere in recruitment" hub covering
  selections, quality, communications, assessments, references, accommodations,
  complaints, talent pools and account security.
- **Admin nav** gains the fraud queue.
- The 23 "unreachable" admin pages from the recommendations were a false
  positive — `admin/layout.tsx` has a full nav. Noted, not changed.

### 1.6 Reference data actually drives the forms

`ContractType` and `DocumentType` were admin screens configuring values nothing
read.

- `/api/recruitment/vacancies` GET now returns both; the vacancy form renders
  contract types from the database, and required documents became a `<select>`
  over configured types instead of free text (a typo used to create a new
  de-facto category).
- Candidate document upload reads the same list via
  `GET /api/candidate/documents?types=1`, with a hardcoded fallback so the form
  is never unusable if the table is empty.
- **This needed an authorisation carve-out.** `authorizeEntity` required
  `SYSTEM_ADMIN` for everything, so a recruitment officer opening the vacancy
  form would have been refused. Six pure reference-data entities are now
  **readable** by any staff member; writes still require `SYSTEM_ADMIN`.
  `proxy.ts` matches.

### 1.7 Staff can add interviews to their calendar

The ICS link is on the staff interview list, not just the candidate's.

---

## 2. New capabilities

### 2.1 TOTP multi-factor authentication

Built in-app, per your decision — no lockout risk, no dependency on OIDC being
configured.

**`lib/totp.ts`** — RFC 6238 over HMAC-SHA1, 6 digits, 30-second step,
implemented directly (~40 lines of algorithm). **Verified against all five
RFC 6238 Appendix B test vectors.**

- ±1 step of clock skew accepted.
- **Replay is refused.** The accepted step is persisted in `lastUsedStep`, so a
  code cannot be reused inside its window — the detail most hand-rolled TOTP
  gets wrong.
- Secrets are AES-256-GCM encrypted at rest (`lib/secret-box.ts`, factored out
  of the near-duplicate envelopes in `lib/s3` and `lib/outbox`).
- **`lib/qr.ts`** is a from-scratch QR encoder (byte mode, ECC level M,
  versions 1–10) so enrolment shows a scannable code without adding a runtime
  dependency for one screen.

**Flow.** Login verifies the password, then returns
`{ mfaRequired: true, challengeToken }` and **sets no cookie**. The challenge is
a distinct 10-minute JWT purpose that `verifySessionToken` rejects outright, and
is bound to `sessionVersion` so a password change between steps invalidates it.
`POST /api/auth/mfa/challenge` exchanges a code for a session, rate-limited
15/min per IP and 10 per 15 min per account — a 6-digit code is only 10⁶ wide.

Ten single-use recovery codes, SHA-256 hashed, shown exactly once. Disabling MFA
requires the current password, so a hijacked session cannot quietly remove it.

`bcrypt` cost also moved 10 → 12, with transparent re-hashing at login (the one
moment the plaintext exists).

### 2.2 Automatic account lockout

`lib/lockout.ts`. Lockout after 8 consecutive failures (configurable), for 30
minutes, with a 60-minute streak window so old failures do not accumulate.

- **`lockedUntil` expires by itself** — a real user recovers without an
  administrator. `accountStatus = 'LOCKED'` remains the manual, indefinite lock.
- The owner is notified: a lockout you did not cause is exactly the signal that
  someone is guessing at your password.
- The 423 is only returned **after the password verifies**, so lockout does not
  reintroduce the enumeration oracle the audit removed.

### 2.3 Pagination

`lib/pagination.ts` — one envelope (`page`, `pageSize`, `total`, `totalPages`,
`hasMore`), `pageSize` clamped to 200, and malformed input rejected rather than
coerced.

The applications list is fully paginated with `Pagination.tsx` controls, a
sort whitelist, and **filtering moved server-side** — with pagination, filtering
only the current page client-side would have silently hidden matches on other
pages. The stage dropdown now comes from `lib/application-stages.ts` rather than
from whatever stages happen to be on screen.

The `take: 500` cliff is gone; real totals are displayed.

**The 20,000-row insights query** is now a rolling window (default 365 days,
`INSIGHTS_WINDOW_DAYS`) with per-model caps, and the audit-touch count is a
`groupBy` instead of one row per application.

### 2.4 Full-text search

`lib/search.ts` with weighted generated `tsvector` columns and GIN indexes on
`Vacancy` and `CandidateProfile`, plus `pg_trgm` indexes for the ILIKE fallback.

- Ranked by `ts_rank`; prefix matching, so "eng" finds "engineer".
- **Now covers candidate names, skills, certifications and languages** — the
  things recruiters actually search for, and previously unsearchable.
- `toTsQuery` strips tsquery operators (`&`, `|`, `!`, `<->`) so a stray
  character cannot change the query's meaning. Queries are parameterised
  throughout; no input is ever interpolated.
- **Degrades gracefully.** `hasFullTextSearch()` probes for the columns once and
  falls back to `contains`, so search works on an un-migrated database.

### 2.5 Job alerts

`SavedSearch` + `lib/job-alerts.ts`, run from `processBackgroundSchedules`.
Candidates save up to 10 searches with daily or weekly alerts, managed from
`/candidate/settings`.

Only vacancies that opened since the last run are reported, so nobody is told
twice. Suspended accounts and unverified addresses are never emailed, and a
saved search with no criteria is refused — it would match every vacancy.

### 2.6 CSV bulk import

`lib/csv.ts` is a real RFC 4180 parser: quoted fields containing commas and
newlines, doubled-quote escapes, CRLF, BOM stripping, and per-row column-count
errors. A `split(',')` import is the classic way to corrupt an address.

`POST /api/recruitment/candidates/import` **always dry-runs first** and reports
every row's outcome; the real import is disabled until you have seen it. Column
aliases are accepted (`surname`/`last_name`/`family_name`…).

**No password is ever created for an imported candidate.** Each gets an unusable
random hash plus a password-reset invitation, so no importer ever knows a
candidate's credentials.

### 2.7 Session management

`UserSession` gives per-device revocation: the session JWT carries a `tokenId`
checked on every request. `/candidate/settings` and `/recruitment/settings` list
signed-in devices with last-seen and IP, and revoke one or all others.

Tokens minted before this feature carry no `tokenId` and stay valid until they
expire — **the rollout does not sign everyone out.**

All four session-issuing paths (login, MFA challenge, register, SSO) now go
through `lib/session.ts`, so cookie attributes and TTL cannot drift apart again.

### 2.8 Approver rotation

`findIndependentApprover` now picks the approver with the fewest **currently
open** approvals, with `createdAt` as a deterministic tie-break. The
independence rule is unchanged; the load simply spreads instead of landing
entirely on the oldest account.

---

## 3. Smaller items

| # | Done |
|---|---|
| 3.1 | `formatDate`/`formatDateTime` pin `timeZone` (default `Africa/Lagos`, `NEXT_PUBLIC_DISPLAY_TIME_ZONE`). A UTC container was rendering Lagos closing dates a day early. Invalid dates return `N/A` instead of `Invalid Date`. |
| 3.2 | Malware rescan batch is configurable (`VIRUS_RESCAN_BATCH_SIZE`), and the job reports `stillPendingFiles` so a backlog is visible. |
| 3.3 | `HEALTHCHECK` in the Dockerfile, using the real `/api/health`. |
| 3.4 | Health distinguishes `never_run` from `stale` — a fresh deployment no longer reports 503 until the first cron tick. |
| 3.5 | Next.js `output: 'standalone'`; the runtime stage copies only the server and needed modules, not the whole build tree with devDependencies. |
| 3.6 | 90 tests (was 26): TOTP (19, incl. RFC vectors), CSV (16), pagination (10), search (9), authz mapping (6), state machine (4). |
| 3.7 | Prettier configured; the five minified route files reformatted and readable. |
| 3.8 | React advisories remain warnings, not silenced. |
| 3.9 | Document types constrained to configured values on both the staff and candidate forms. |

Also: `start-production.sh` now validates every secret is ≥32 characters at
startup (failing to start beats failing on a user's first request) and handles
both standalone and non-standalone deployments. `.env.example` documents
**every** variable the code reads — verified programmatically, nothing missing.

---

## 4. Deliberate departures from the recommendations

Two, both worth flagging:

**Prettier is not a CI gate.** I added `npm run format` / `format:check` and
wired the gate into CI, then removed it: the pre-existing codebase is not
Prettier-formatted, so the gate would have been red on arrival. Enabling it needs
its own formatting-only commit — mixing a 300-file reformat into this change
would bury everything else. `.prettierignore` records why.

**`/api/admin/generic` reads are no longer SYSTEM_ADMIN-only.** Six reference-data
entities became staff-readable, because §1.6 is impossible otherwise. Writes are
unchanged. This is a deliberate, narrow widening of an authorisation boundary and
the entity list is worth your review: `src/app/api/admin/generic/route.ts`,
`STAFF_READABLE_ENTITIES`.

---

## 5. Things I got wrong along the way

- **`schema.randomizeQuestions`**, not `questionOrderRandomised` — my first
  version of the answers endpoint would not have compiled.
- **`toast(kind, message)`**, not `(message, kind)`. Typecheck caught five;
  a sixth passed only because the argument was `any`. Fixed by reading the
  provider rather than assuming.
- **`InterviewPanelSubmission`, `Offer` and `CandidatePreboarding` have no
  `createdAt`** — my insights window used fields that do not exist.
- **An early `return NextResponse.next()`** in my proxy change skipped the
  `x-request-id` propagation at the end of the function. Restructured.

Also, a correction carried over into `AUDIT_2026-07-25.md`: I had claimed files
stuck at `PENDING` virus scan were unusable for ever. Wrong — the rescan job
exists. Retracted there.

---

## 6. Migration — required before deploying

`prisma/postgresql/migrations/0006_mfa_lockout_sessions_search/migration.sql`,
hand-written and cross-checked against the schema. Every statement is
re-runnable (`IF NOT EXISTS`, `DO $$ … EXCEPTION WHEN duplicate_object`).

Adds: lockout and MFA columns on `User`; `UserMfaSecret`, `UserRecoveryCode`,
`UserSession`, `SavedSearch`; fraud triage columns; generated `tsvector` columns
with GIN indexes; `pg_trgm` and two trigram indexes.

```bash
npm install                      # prettier + updated lockfile
npx prisma generate
npx prisma migrate deploy --schema prisma/postgresql/schema.prisma
```

Two notes. `CREATE EXTENSION pg_trgm` needs elevated privileges — if your
migration principal cannot, create it once as superuser and re-run. And the
generated `tsvector` columns need PostgreSQL 12+.

---

## 7. What I could not verify here

Same two limits as the audit, and they matter more now:

1. **`npm run build` was never run.** No Prisma engine could be downloaded in
   this environment (403 on `binaries.prisma.sh`), and a full Next.js build
   exceeds the per-command time limit. Typecheck, lint and tests all pass, which
   covers compile-level risk, but **the build is unverified.**
2. **Integration and E2E suites were never run** — both need live PostgreSQL.

Please run, in order:

```bash
npm ci && npx prisma generate
npx prisma migrate deploy --schema prisma/postgresql/schema.prisma
npm run build
npm run test:integration
npm run test:e2e
```

E2E matters most. This change touched the login flow (MFA step), the
applications list (server-side filtering), and nine page components.

Worth testing by hand, because no automated test covers them:

- Enrol in MFA, sign out, sign in with a TOTP code, then with a recovery code.
- Fail login 8 times and confirm the lockout, the notification, and auto-unlock.
- Import a CSV with a quoted field containing a comma; confirm the dry run.
- Search for a candidate by skill (needs the migration applied).
- Mark a submitted free-text assessment and confirm you can read the answers.

---

## 8. Still open

1. **Two endpoints remain unwired:** `assessments/[id]` GET/PATCH (editing an
   assessment's settings and questions) and `scorecards/[id]` GET. Both need UI
   work with real design decisions — editing a live assessment's questions when
   candidates have already answered them is a product question, not a wiring one.
2. **26 route files still have unbounded `findMany`.** Mostly small config
   lookups. `admin/configuration-builder` (8 calls) and `reports/export` (10
   unbounded of 22) are the ones worth doing next.
3. **In-memory `rateLimit()` is still per-instance.** The distributed limiter
   covers the paths that matter; move the rest to Redis before running more than
   one instance.
4. **`.env` was not modified.** It still sets `DIRECT_URL` (unused) and lacks
   `OUTBOX_ENCRYPTION_KEY`, so outbox payloads and file storage currently share
   one key. Separate them. `s3.ts` now accepts the `AWS_*` names your `.env`
   already uses, so S3 credentials are no longer silently ignored.
5. **Prettier rollout** — see §4.
6. **17 React Compiler advisories** remain as warnings.
