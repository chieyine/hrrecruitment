# Recommendations — gaps, dead ends, and missing features

Companion to `AUDIT_2026-07-25.md`. That document covered *things that are
wrong*. This one covers *things that are absent* — backend work with no way to
reach it, screens nothing links to, and data captured then never shown.

Everything below is evidence-backed; the grep or file/line that establishes it is
quoted. Nothing here has been changed — these are decisions for you.

A note on the shape of the problem. This codebase is not half-finished. The
schema is 120 models with **zero dead models**, all 112 route handlers are
authorised, and every internal `href` resolves to a real page. The gaps are
almost entirely **wiring**: the backend runs ahead of the UI. That is the
cheapest possible kind of gap to close, and it's worth closing before adding
anything new.

---

## 1. Should work but doesn't

### 1.1 Assessment marking is blind — the marker cannot see the answers

**The most serious functional gap in the application.**

Candidates submit answers; they are stored:

```
api/candidate/assessments/[id]/answers/route.ts:40   tx.candidateAssessmentAnswer.upsert
api/candidate/assessments/[id]/submit/route.ts:161   tx.candidateAssessmentAnswer.upsert
```

Nothing in the codebase ever reads them back. Not a page, not an endpoint, not a
nested `include`. The only other reference is a `deleteMany` in the reset route.

Meanwhile `api/recruitment/candidate-assessments/[id]/mark/route.ts` asks a human
marker for `score: 0–100` and, for offline assessments, ≥10 characters of
"marker evidence". For an online `SHORTTEXT` assessment the marker is being asked
to score a submission they have no way of reading.

The candidate can't see their own submitted answers afterwards either.

**Recommendation.** Add `GET /api/recruitment/candidate-assessments/[id]/answers`
(gated on `assessment.manage`) returning each question with the candidate's
answer and, for auto-marked types, the stored `correctAnswer`. Render it beside
the score field in the marking UI. Add a read-only view for candidates on
submitted assessments. Until this exists, any assessment requiring human marking
is not usable in production.

### 1.2 Fraud reports go into a black hole

`POST /api/public/fraud-reports` creates a `FraudReport` and notifies every
`SYSTEM_ADMIN` and `HR_MANAGER`:

```
body: `A new report (${report.id}) requires review.`
```

`prisma.fraudReport` appears **exactly once** in the codebase — that `.create`.
There is no page, no endpoint, and `fraud-reports` is not among the 19 entities
in `api/admin/generic`'s `ENTITIES` whitelist.

So the notification names a report ID that no one can open, and confidential
fraud reports accumulate unread. For an anti-fraud channel on a public
recruitment site, that is worse than not offering the channel.

**Recommendation.** Highest value-per-hour fix in this document. Either add
`fraud-reports` to the generic admin whitelist (read-only, plus a status field),
or build a small triage page. Also make the notification deep-link to it.

### 1.3 The "Case notes" panel can never be filled in

`recruitment/applications/[id]/page.tsx:360` renders case notes with a fallback:

> "No case notes recorded."

Notes *are* read (`api/recruitment/applications/[id]/route.ts:34`), and
`POST /api/recruitment/applications/[id]/notes` is fully implemented — validation,
`restricted` flag, categories, audit logging. **No UI calls it.** `grep -rn
"/notes" src/ --include=*.tsx` returns nothing.

So that panel will read "No case notes recorded" for ever. Given this is
described in the page as "the accountable record behind this case", it matters.

**Recommendation.** Add a note composer to that panel. The backend is done; this
is a form.

### 1.4 Nine working endpoints have no UI at all

Of 112 route handlers, 13 are referenced nowhere in the app. Three are
legitimate (`/api/health` for monitors, `/api/cron/process-schedules` for the
scheduler, `/api/public/vacancies/[reference]` — the careers page queries Prisma
directly). The other ten are finished features with no way in:

| Endpoint | What it does | Notes |
|---|---|---|
| `applications/[id]/assign-reviewer` POST | Assign a reviewer, with a real check that the reviewer holds `application.read.assigned` scoped to that vacancy | Reviewer assignment drives `assignedApplicationWhere` — the whole "assigned" access model — and cannot be set |
| `applications/[id]/notes` POST | Case notes | §1.3 |
| `scorecards/[id]/reopen` POST | Reopen a submitted scorecard, requires `scorecard.reopen` + ≥5-char reason | See below |
| `interviews/[id]/panel/[memberId]/reopen` POST | Reopen one panel member's score | |
| `interviews/[id]/panel/[memberId]/resolve-conflict` POST | HR approves a conflict-of-interest exception; correctly refuses self-approval | A declared conflict currently has no resolution path |
| `interviews/[id]/invite` POST | Send interview invitations | The assessment equivalent *is* wired up in `AssessmentManager.tsx:66` |
| `interviews/[id]` PATCH | Edit a scheduled interview | Interviews can be created but not amended |
| `assessments/[id]` PATCH | Edit an assessment | |
| `offers/[id]` PATCH | Edit an offer | |

The scorecard one is my favourite illustration. `/recruitment/quality/page.tsx:24`
counts reopened scorecards and displays the total under the heading "Reopened
scorecards" — a dashboard metric for an action the UI does not let you perform.
It will read `0` for ever.

**Recommendation.** Wire these into the pages that already exist
(`recruitment/applications/[id]`, `InterviewManager`, `recruitment/offers`).
This is the single largest chunk of finished-but-unreachable work in the repo,
and none of it needs new backend code.

### 1.5 Six substantial pages are unreachable by clicking

Every `href` in the app resolves — but 6 pages have no link, `router.push`, or
`redirect` pointing at them anywhere:

| Page | Lines | Heading |
|---|---|---|
| `/recruitment/selections` | 219 | **"Final Candidate Weighted Ranking"** |
| `/recruitment/quality` | 102 | "Recruitment decision quality" |
| `/recruitment/communications` | 34 | "Candidate communications" |
| `/candidate/settings` | 65 | Account settings |
| `/candidate/complaints` | 13 | "My complaints and concerns" |

(`/reset-password` and `/verify-email` are correctly reached from email links,
and `/report-recruitment-fraud` is a deliberate 2-line redirect alias to
`/report-fraud` — those three are fine.)

`/recruitment/selections` is the standout. Weighted final ranking is the decision
step the whole pipeline exists to support — `lib/recruitment-scoring.ts`,
`refreshApplicationFinalScore`, `DEFAULT_SELECTION_WEIGHTS` all feed it — and
staff can only reach it by typing the URL.

`/candidate/complaints` matters for a different reason: candidates can raise a
concern from the *public* `/complaints` page, but signed-in candidates have no
nav route to their own complaint history.

**Recommendation.** `Header.tsx` builds nav from role-conditional arrays
(lines 49–69); this is a handful of entries. Suggested additions:

- staff: `Selections`, `Quality`, `Communications`
- candidate: `Settings`, `My concerns`

Then add a lint or test that asserts every non-dynamic page is reachable, so
this cannot silently recur.

### 1.6 Two admin CRUD screens configure values the app ignores

`/admin/contract-types` and `/admin/document-types` are full CRUD screens over
real seeded models. Neither is consulted where it matters:

- `recruitment/vacancies/new/page.tsx:203-208` hardcodes six contract types
  (`FIXED_TERM`, `PERMANENT`, `TEMPORARY`, `CONSULTANT`, `INTERN`, `VOLUNTEER`).
  Note the same page *does* load departments, categories, duty stations,
  projects and scorecards dynamically — so contract type is the odd one out.
- `candidate/profile/documents/page.tsx:142-148` hardcodes seven document types.

Add "Secondment" in the admin screen and it will never appear in a vacancy form.
`ContractType` and `DocumentType` are also the only two models in the schema that
*only the seed script* ever writes.

**Recommendation.** Fetch both from `/api/admin/generic?entity=contract-types`
and `?entity=document-types`. Small change; removes a genuinely misleading admin
screen. (Worth a quick check that a non-admin can read those two entities —
`authorizeEntity` currently requires `SYSTEM_ADMIN` for everything except
`courses`, so a recruitment officer creating a vacancy would be refused. That
needs a read-only carve-out for reference data.)

### 1.7 Staff can't add interviews to their calendar

`/api/calendar/interviews/[id]` serves a proper ICS file and candidates get a
button for it (`candidate/interviews/page.tsx:59`). `recruitment/interviews/page.tsx`
has zero references to it — so panel members, the people most likely to want a
calendar entry, don't get one. One-line addition.

---

## 2. Features that should exist but don't

Ordered by what I'd do first.

### 2.1 No multi-factor authentication — anywhere

`grep -rniE 'totp|mfa|two.?factor|authenticator|otp'` across `src/` and
`prisma/schema.prisma` returns nothing.

This system holds candidate PII, medical and accommodation records, banking
details for preboarding, confidential reference responses, and `RESTRICTED`-class
identity documents. A `SYSTEM_ADMIN` password is currently the only thing between
an attacker and all of it.

The good news is that the groundwork is already there: `sessionVersion` gives you
global revocation, and the OIDC integration is properly built (PKCE S256, nonce,
issuer/audience pinning).

**Recommendation.** Two options, and I'd take the first:

1. **Mandate SSO for all staff roles** and treat MFA as the identity provider's
   job. Cheapest and strongest. Requires setting `OIDC_ALLOWED_EMAIL_DOMAIN`
   (currently optional) and refusing password login for non-candidate accounts.
2. **Build TOTP** — a `UserMfaSecret` model, enrolment, verification at login,
   recovery codes. Meaningful work, and it duplicates what your IdP already does.

Either way, MFA for privileged accounts is the highest-value security feature
missing from this platform.

### 2.2 No automatic account lockout

`accountStatus: 'LOCKED'` exists in the schema and in the admin API
(`api/admin/users/[id]/route.ts:7`) but **nothing ever sets it automatically.**
The only defence against password guessing is the rate limiter: 10 failures per
IP per minute, 10 per account per 15 minutes.

That's a decent brake, but it never stops. An attacker gets ~40 attempts/hour
per account indefinitely, and the account owner is never told.

**Recommendation.** Add `failedLoginCount` and `lockedAt` to `User`; lock after
N consecutive failures with a time-based auto-unlock; notify the account owner
on lock. `LOGIN_FAILED` is already audited, so you have the signal —
you just aren't acting on it. Note that §1.3 of the audit changed the login flow
so a `403` no longer leaks account existence, so lockout can be added without
reintroducing an enumeration oracle.

### 2.3 No pagination in the UI, anywhere

The audit found 28 route files with unbounded `findMany`. The flip side is that
**no list screen in the application paginates** — not applications, not
vacancies, not candidates, not the audit trail.

Two concrete cliffs:

- `api/recruitment/applications/route.ts:28` uses `take: 500`. At application
  501 the UI silently stops showing candidates. No warning, no next page.
- `recruitment/insights/page.tsx:22` loads `take: 20000` applications *with*
  their full stage history, in a server component, on every page view.

**Recommendation.** Standardise one paginated envelope
(`{ items, page, pageSize, total, hasMore }` — `api/public/vacancies` now uses
exactly this shape after the audit) and adopt it list by list, starting with
applications. Then add a server-side filter and sort UI, because pagination
without filtering just moves the problem.

### 2.4 Search is a `contains` scan with no relevance

`/recruitment/search` (itself unreachable, §1.5) does `contains` across
reference, title, project, department and duty station with `take: 50`. There is
no full-text index, no relevance ranking, no fuzzy matching, and — notably — **no
search over candidate names, skills or CV content**, which is what recruiters
actually search for.

**Recommendation.** PostgreSQL is right there: add a `tsvector` column with a
GIN index over the candidate and vacancy fields worth searching, and rank by
`ts_rank`. Also fold the talent-pool query into the same index — you already
have `skills: { select: { name: true }, take: 10 }` in
`api/recruitment/talent-pools/route.ts:43`, which is the beginning of skill
search without the index to support it.

### 2.5 No candidate job alerts or saved searches

`TalentPool` exists, and candidates can consent to `TALENT_POOL` membership, but
that is a *recruiter-side* pull. A candidate cannot save a search or subscribe to
new vacancies matching their interests.

For a public recruitment site this is the standard mechanism for bringing
candidates back, and you already have every part needed to build it: an outbox
with retry and dead-lettering, notification templates, a working scheduler, and
consent records. It's a `SavedSearch` model plus one job in
`processBackgroundSchedules`.

### 2.6 No bulk candidate import

Staff have thorough bulk *actions* (message, stage change, export, undo) but
there is no way to bring candidates *in* — no CSV import, no bulk vacancy
creation. For an organisation migrating from spreadsheets or another ATS, that's
usually the first thing needed and it's currently a manual per-record job through
`applications/assisted`.

### 2.7 No session management for the account owner

The audit added `{"allDevices": true}` to logout, but there's no UI for it and no
way for a user to see where they're signed in. Sessions are stateless JWTs, so
`sessionVersion` is all-or-nothing: you cannot revoke one device.

**Recommendation.** If per-device revocation matters, add a `UserSession` table
(device, IP, last seen, `jti`) and check `jti` in `getVerifiedUser`. If it
doesn't, at least expose "sign out everywhere" in `/candidate/settings` — the
endpoint already supports it.

### 2.8 Approvals always land on the same person

`lib/approvals.ts:5` — `findIndependentApprover` does `findFirst` ordered by
`createdAt: 'asc'`. The oldest matching account receives **every** independent
approval in the system, for ever. Correct for separation of duties, unusable as a
workload model.

**Recommendation.** Round-robin on open approval count, or an explicit
per-department approver assignment. Low effort, and it's the difference between
the approvals feature being used and being routed around.

---

## 3. Smaller things worth doing

| # | Item | Evidence |
|---|---|---|
| 3.1 | `formatDate` renders in the **server's** timezone in 19 server components — no `timeZone` option on `toLocaleDateString('en-GB')`. Correct today only if the host runs in the intended zone. Pin it, ideally from a system setting. | `lib/utils.ts:11` |
| 3.2 | Malware rescan processes 25 files per cron tick. Sound mechanism, but a bulk upload could outrun it and those files are undownloadable until scanned. Make the batch size a setting. | `lib/background-jobs.ts:240` |
| 3.3 | No `HEALTHCHECK` in the Dockerfile despite a good `/api/health` with dead-letter and critical-event awareness. | `Dockerfile` |
| 3.4 | `/api/health` degrades on `!lastJob`, so a fresh deployment reports 503 until the first cron run. Distinguish "never run" from "stalled". | `api/health/route.ts:20` |
| 3.5 | Docker image copies the whole build stage including devDependencies and source. Next.js standalone output would cut it substantially. | `Dockerfile:16` |
| 3.6 | 36 unit tests for 364 files. The four largest modules — `work-items.ts` (297), `background-jobs.ts` (293), `preboarding.ts` (203), `eligibility.ts` (73, but the most logic-dense) — have **no unit coverage at all**. `eligibility.ts` decides who is eliminated from a recruitment; it should be the best-tested file in the repo. | |
| 3.7 | Several files are minified onto single lines (`api/public/fraud-reports/route.ts`, `sso/callback/route.ts`, `resolve-conflict/route.ts`). Nothing wrong with the logic, but they're effectively unreviewable — a diff on them tells you nothing. Prettier would pay for itself. | |
| 3.8 | 13 React Compiler advisories remain (now warnings, not silenced): mostly `new Date()` during render and `setState` in an effect body. | |
| 3.9 | Candidate document types are a free-form string, so a typo creates a new de-facto category. Constrain to `DocumentType` (see §1.6). | `candidate/profile/documents/page.tsx:15` |

---

## 4. If you only do three things

1. **Wire up §1.4 and §1.5** — ten finished endpoints and six finished pages,
   reachable with nav entries and forms. Days, not weeks, and it's the largest
   ratio of delivered function to effort anywhere in this codebase.
2. **Fix assessment marking (§1.1) and fraud report triage (§1.2).** Both are
   features that currently mislead their users: one asks for a score without
   showing the work, the other promises a confidential reporting channel and then
   discards what it collects.
3. **Decide the MFA question (§2.1).** Mandating staff SSO is the cheap answer
   and it's the right one. Given the sensitivity of what's stored here, "password
   only" for `SYSTEM_ADMIN` is the risk I'd least want to carry.

## 5. What I'd deliberately not rush

Pagination (§2.3) and search (§2.4) are real, but they change response shapes and
touch every list screen. They deserve their own change with their own testing,
not a hurried pass. The 500-row ceiling on applications is the one part that has
a hard failure mode, so it's worth handling on its own first.
