# End_to_End.md Conformance

Governing specification: `docs/End_to_End.md`
Status date: 7 August 2026

`End_to_End.md` is now the governing specification for this codebase, superseding
`FRAD_Recruitment_Preboarding_README.md` where the two conflict.

## Internal identity

Staff and internal candidates use `@fradfoundation.org`. An internal candidate
applies with the ordinary `CANDIDATE` role, so **the email domain — not the
recruitment role — is what identifies them**, and the address must be verified.
`INTERNAL_EMAIL_DOMAINS` (comma-separated) overrides the default if the domain
changes or a second one is added. Matching is exact: `not-fradfoundation.org`,
`fradfoundation.org.attacker.com` and unlisted subdomains are all rejected.

## Agreed exclusions

These are out of scope by explicit decision, not gaps:

| Section | Capability | Decision |
| --- | --- | --- |
| §28.13 | Multilingual applicant portal | Not required |
| §28.14 | SMS / WhatsApp notifications | Not required |
| §7.2, §28.9 | Publication channel tracking and job-board integration | Not required |
| §3.2, §3.4 | HR Assistant and Senior HR Officer role tiers | Collapsed into the single `RECRUITMENT_OFFICER` role |
| §19.3 | API-based ERP transfer | Transfer stays manual; a PDF handover pack carries the §19.2 dataset |

---

## What was built

### 1. Staffing requests — §5, §27 item 2

- `StaffingRequest` model with all 25 §5.1 fields and the 12 §5.2 statuses.
- `src/lib/staffing-request.ts` — transition table, executive-escalation rules (§3.9).
- `POST/GET /api/recruitment/staffing-requests`, `.../[id]/actions`.
- `/recruitment/staffing-requests` workspace serving requester, HR and Budget Holder.
- Escalation to an executive approver is automatic for senior grades, emergency
  recruitment, or a new establishment of three or more posts.

### 2. Budget Holder and funding — §3.7, §17, §22.3, §27 item 3

- `BUDGET_HOLDER` role plus `funding.confirm`, `funding.read`, `offer.financial.confirm`.
- `FundingConfirmation` (supersede-on-write, so one envelope is ever current) and
  `OfferFinancialApproval` for offers above the confirmed ceiling.
- `POST /api/recruitment/staffing-requests/[id]/funding`.
- `/recruitment/funding` — the §22.3 dashboard. Contains no candidate data at all.
- A Budget Holder cannot fund a request they raised.

### 3. Longlisting — §11 (the largest change)

| §11 requirement | Implementation |
| --- | --- |
| 17 rule types (§11.1) | All 17 in `src/lib/longlisting-rules.ts` |
| Rule classification (§11.2) | `MANDATORY_KNOCKOUT` / `SCORED` / `PREFERRED` / `INFORMATIONAL` |
| Per-rule outcomes (§11.3.3) | `MET` / `NOT_MET` / `UNCLEAR` / `NOT_APPLICABLE` |
| Eligibility score (§11.3.4) | Weighted sum across scored rules |
| Automatic placement (§11.3.5–7) | `LonglistRun` groups every application |
| Deciding rule recorded (§11.3.8) | `EligibilityEvaluation.decidingRuleId` |
| Summary (§11.3.9, §11.8) | Run counters plus reason distribution by rule |
| No silent alteration (§11.3.10) | `originalOutcome` written once and never updated |
| Exception queue (§11.5) | `/recruitment/longlisting/exceptions` |
| Override controls (§11.6) | Reason code, justification, evidence where required, approval routing |
| Rule locking (§11.7) | Locks at publication; changes become approvable diffs with fairness review |
| Rule builder UI | `/recruitment/longlisting` |

The engine is pure and takes an injected clock, so runs are reproducible.
`AUTOMATICALLY_ELIGIBLE` requires at least one mandatory rule to have passed —
an empty rule set can never auto-approve anyone.

### 4. Background and due-diligence checks — §16, §28.11

- `BackgroundCheck` covering all nine §16 check types.
- Required set derived from the vacancy's safeguarding classification and title.
- Findings for criminal-record, safeguarding and sanctions checks are redacted
  **server-side** for anyone without `backgroundcheck.read.restricted`.
- Only the minimum field set per check type is transmitted to a provider (§28.11);
  the audit log records which fields were shared, never their values.
- Waiving a check is an HR Manager act and requires a reason.

### 5. ERP handover — §19

- `assessTransferReadiness` enforces every §19.1 trigger condition.
- HR Manager approval is a separate, signed step before any pack is issued.
- `erpPersonnelNumber` is nullable and holds only a real ERP number; workflow
  state lives in `transferStatus` (`APPROVED` → `RECORDED` → `CONFIRMED`).
- `checkForDuplicateEmployee` (§19.3) matches only against people who actually
  hold an ERP number. Identity, email and phone each block on their own; a
  shared name is reported as context but does not force an override, because a
  control everyone clicks past is not a control.
- Statutory data is pulled from the form explicitly designated by
  `PreboardingFormTemplate.handoverPurpose`, never by matching a form title.
  The pack distinguishes *not collected*, *not yet submitted* and *unreadable*
  so a gap can never be mistaken for a blank field.
- `renderHandoverPdf` produces a branded PDF containing the complete §19.2 dataset.
  Verified: valid header/trailer, correct xref offsets, multi-page pagination.
- Every pack download is audited; the transferred dataset is snapshotted for §28.24.
- `/recruitment/erp-transfers` is the §28.22 monitoring view.

### 6. Statuses — §21

Vacancy gained `RETURNED_FOR_CORRECTION`, `APPROVED`, `LONGLISTING`,
`SHORTLISTING`, `ASSESSMENT`, `INTERVIEW`, `DUE_DILIGENCE`, `OFFER`, `FILLED`.

Applications gained `INCOMPLETE`, `EXCEPTION_REVIEW`, `NOT_LONGLISTED`,
`NOT_SHORTLISTED`, `ASSESSMENT_PASSED`, `ASSESSMENT_FAILED`, `BACKGROUND_CHECK`,
`CONDITIONAL_OFFER`, `PRE_EMPLOYMENT_CLEARANCE`, `READY_FOR_ERP_TRANSFER`,
`ARCHIVED`. A rejected applicant cannot be revived; a closed outcome can only be
archived.

### 7. Advanced features — §28

| Section | Status |
| --- | --- |
| §28.1 CV parsing | Heuristic parser; extracts name, contacts, education, employment, skills, languages, memberships. Conservative — omits rather than guesses. Candidate corrects before submit. |
| §28.3 Anonymised review | Per-vacancy field policy, redacted server-side in the applications register and the exception queue, with stable aliases and free-text scrubbing. Fails closed to the full default set if the config is unreadable. Applies to early stages only. |
| §28.7 Emergency recruitment | Shortened service targets per stage, a 24-hour advertising floor, separate HR-manager approval of the accelerated route, five non-waivable controls (identity, safeguarding, references, funding, offer approval), and an evidence-assembled post-recruitment compliance review |
| §28.8 Internal vacancies | `audience` = PUBLIC / INTERNAL / BOTH. Internal candidates are identified by a **verified** `@fradfoundation.org` address, not by recruitment role — enforced on the careers page, both public APIs, and at application save and submit. |
| §28.10 E-signatures | All 14 §28.10 document classes via `recordSignature`, hashed over canonical JSON so later edits are detectable |
| §28.15 Calendar | Full OAuth (Microsoft Graph, Google, Zoom) with PKCE, sealed tokens, lazy refresh, free/busy sync, meeting-link provisioning, time-zone-correct slot proposal |
| §28.22 ERP monitoring | Handover register with duplicate-check status and pack availability |

### 8. Reports — §23

Thirteen added: staffing requests, funding, longlisting, longlisting exceptions,
shortlisting, candidate ranking, selection, background-check status, time to fill,
source of application and hire, recruitment closure, recruitment compliance,
electronic signature register. Financial and due-diligence reports are gated on
`funding.read` / `backgroundcheck.manage` rather than general HR access.

### 9. Publication gate — §7.1

`PUBLISH` now blocks unless: the staffing request is linked and approved, funding
is confirmed, at least one mandatory longlisting rule exists, shortlisting and
interview criteria are set, application questions exist, safeguarding is
classified, and a recruitment contact is recorded. Publication also locks the
longlisting rules.

### 10. High-volume and low-connectivity operation — §12.7–12.8

- Bulk actions now separately support previewed application-stage changes,
  candidate communication, document requests, reference requests and reminders,
  assessment invitations, sequential interview scheduling with shared panels,
  interview invitations, reviewer assignment, talent-pool placement and approved
  ERP personnel-number recording.
- Offline assessments provide an audited PDF pack containing the candidate
  register, attendance fields, questions and marking criteria.
- Offline score CSV imports have a validation-only preview and refuse the whole
  import until every row is eligible; applying records attendance, evidence,
  scores and final outcomes in one transaction.
- The candidate application has a persistent low-data view, device-local draft
  recovery, connection state, account autosave and automatic retry when the
  browser reconnects.
- Recruitment mutations now reject files after ERP transfer; transferred and
  archived applications remain readable for audit and reporting.

---

## Verification performed

The complete local quality-gate set was executed after regenerating the Prisma
client. The build uses the supported Webpack path so it also works when optional
native Turbopack bindings are unavailable.

| Check | Result |
| --- | --- |
| Schema relation integrity (`scripts/check-schema-relations.mjs`) | Pass — 136 models, every relation two-sided |
| Prisma `select`/`include` field validity (`scripts/check-prisma-usage.mjs`) | Pass — 387 files |
| Type checking (`npx tsc --noEmit`) | Pass |
| Linting (`npm run lint`) | Pass — warnings only, no errors |
| Unit tests (`npm test`) | **224 pass, 0 failures** |
| PostgreSQL integration tests (`npm run test:integration`) | **15 pass, 0 failures** |
| Backend-to-frontend coverage | Pass — all 132 routes classified; 2 infrastructure-only |
| Production build (`next build --webpack`) | Pass — 136 application routes generated |
| PDF guide build (`npm run docs:guide`) | Pass — 15 chapters, 57 pages |

`npm run check:schema` runs both analysers.

## Platform documentation

A complete reference covering every component of the platform: roles and
separation of duties, each process stage, the longlisting engine, due diligence,
ERP handover, controls and signatures, security and the data model, emergency
recruitment, reporting, operations, and a generated index of all 103 screens,
134 endpoints, 75 modules, 65 UI components and 136 models.

| Format | File | Rebuild |
| --- | --- | --- |
| Word, for letterhead | `docs/FRAD_Recruitment_Platform_Guide.docx` (60 pages) | `npm run docs:guide:docx` |
| PDF, designed, for circulation | `docs/FRAD_Recruitment_Platform_Guide.pdf` (57 pages) | `npm run docs:guide` |

Both build from the same Markdown chapters in `docs/platform-guide/`, so the two
formats cannot drift apart.

**The Word version is built for letterhead transfer.** It uses only Word built-in
style names — Title, Subtitle, Heading 1–3, Body Text, Block Text, Source Code —
and carries no hard-coded colours or fonts, so applying the FRAD template
restyles the whole document in place. The running header is deliberately left
empty so the letterhead's own header is unobstructed, and the contents list is a
live field that repaginates on Update Field. Dropping a `reference.docx` into
`docs/platform-guide/` pins organisational fonts and colours without editing the
script.

The PDF renderer fails the build if any character outside the PDF base-font
encoding would render as a black box.

### Configuration required for §28.15

Calendar providers self-report as unavailable until configured:

```
APP_BASE_URL=
MICROSOFT_CLIENT_ID=      MICROSOFT_CLIENT_SECRET=
GOOGLE_CLIENT_ID=         GOOGLE_CLIENT_SECRET=
ZOOM_CLIENT_ID=           ZOOM_CLIENT_SECRET=
```

Redirect URI per provider: `{APP_BASE_URL}/api/integrations/calendar/callback/{microsoft|google|zoom}`.

The OAuth flows are written against each provider's documented API but could not
be exercised without live credentials — they are the one area of this work that
has had no runtime verification.

PKCE verifiers are sealed with the same AES-256-GCM envelope as the tokens they
are exchanged for, so `STORAGE_ENCRYPTION_KEY` (or a 32-character
`SESSION_SECRET`) must be set before a calendar connection can be started.

---

## Post-implementation corrections

The following were identified in a self-review after the initial build and have
been fixed:

| Issue | Resolution |
| --- | --- |
| `PENDING-…` placeholder written into `erpPersonnelNumber` to satisfy a unique constraint | Field is nullable; workflow state moved to `transferStatus` |
| `window.prompt` used for reason capture in two workspaces | Replaced with the existing `ReasonDialog`, extended with a `minLength` that mirrors the server's 10-character rule |
| `runLonglisting` issued one deep query per application | Cursor-paged batches of 200 with a single rule resolution and one bulk insert per page |
| Duplicate detection flagged on surname alone | Name now requires a corroborating signal; matching narrowed in the database; records without an ERP number excluded |
| Statutory data located by keyword-matching form titles | Explicit `handoverPurpose` on the form template, with distinct rendering for not-collected / not-submitted / unreadable |
| §28.7 was a flag rather than a workflow | Service targets, advertising floor, separate approval, non-waivable controls, compliance review |
| `anonymisation.ts` was written but only partly wired | Applied in the applications register and exception queue with per-vacancy field configuration |
| PKCE verifier stored in plaintext | Sealed with `lib/secret-box` |
| Dashboard ran seven aggregates for every viewer | Each count is issued only when the viewer holds the permission to act on it |
| Signature capture was non-blocking and written after the state change committed | Thirteen critical classes now write **inside the same transaction** as the decision; a failure rolls the decision back and returns a specific 503 |

### Signature enforcement (§28.10)

Thirteen of the sixteen signable document classes are **critical** — those conferring
legal, financial or safeguarding authority. For these:

- the signature row is written in the same database transaction as the state change;
- a failure aborts the transaction, so an unsigned approval cannot exist;
- the caller receives a specific error stating nothing was saved.

The four highest-stakes call sites were restructured accordingly: funding
confirmation, staffing-request submission and executive approval, longlist
confirmation, and ERP transfer approval. Conflict declarations, reference forms
and pre-employment declarations remain non-blocking, so an informational
acknowledgement cannot take down the action it accompanies.

Policy and hashing live in `lib/signature-policy.ts` with no database import, so
the canonical-hash guarantees are unit-tested directly.

---

## §27 MVP scorecard

| # | Item | Status |
| --- | --- | --- |
| 1 | User and role management | Complete |
| 2 | Staffing request | Complete |
| 3 | Budget Holder confirmation | Complete |
| 4 | Vacancy creation | Complete |
| 5 | HR Manager approval | Complete |
| 6 | Public applicant portal | Complete |
| 7 | Candidate profile | Complete |
| 8 | Vacancy-specific application form | Complete |
| 9 | Rule-based automatic longlisting | Complete |
| 10 | Exception-review queue | Complete |
| 11 | Human shortlisting | Complete |
| 12 | Interview scheduling | Complete |
| 13 | Interview scorecards | Complete |
| 14 | Candidate ranking | Complete |
| 15 | References | Complete |
| 16 | Offer approval | Complete |
| 17 | Pre-employment checklist | Complete |
| 18 | ERP transfer | Complete (manual, PDF pack) |
| 19 | Candidate communication | Complete |
| 20 | Reports | Complete |
| 21 | Audit log | Complete |

**21 of 21.**
