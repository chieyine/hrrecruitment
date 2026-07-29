# FRAD Recruitment — page-by-page product review

Started: 29 July 2026

This ledger records an individual review of every `page.tsx` route. A shared
layout, component, permission or visual style is not accepted as evidence that
another page is correct.

Each page is checked for:

1. a necessary user and business job;
2. the correct owner and access boundary;
3. one clear primary action;
4. plain, specific language;
5. useful populated, empty, loading and error states;
6. responsive, accessible rendered layout;
7. duplication that should be merged or removed;
8. an auditable outcome where the page changes recruitment records.

## Review 001 — `/`

- **File:** `src/app/page.tsx`
- **User:** anyone entering the recruitment domain without a path
- **Job:** reach the list of current roles
- **Decision:** retain as a redirect to `/careers`
- **Why it earns the route:** it provides a stable product root for links,
  bookmarks and the domain itself without introducing a redundant landing page
- **Copy:** none; correct for an immediate redirect
- **Access:** public
- **Primary action:** automatic redirect
- **Result:** no change required

## Review 002 — `/careers`

- **File:** `src/app/careers/page.tsx`
- **User:** prospective and returning candidates
- **Job:** find an open role by title, reference, team or location
- **Decision:** retain as the public recruitment home
- **Why it earns the page:** role discovery must work without an account and
  must not be mixed with a candidate’s private application activity
- **Copy:** direct description of current openings, application help and the
  no-fee warning; no campaign slogan
- **Access:** public, with signed-in state used only to render the account header
- **Primary action:** open a role
- **Problems found:** the page silently capped results at 200, displayed that
  capped number as the total, and linked to a compatibility redirect rather than
  the canonical recruitment-process page
- **Changes made:** added an exact count, 20-role pagination, stable ordering,
  preserved filters across pages, invalid-page correction, removed an unused
  project join and linked directly to `/guidance`
- **Result:** retained and corrected

## Review 003 — `/careers/[reference]`

- **File:** `src/app/careers/[reference]/page.tsx`
- **User:** a person considering one specific role
- **Job:** decide whether the role fits and either begin, continue or review the
  related application
- **Decision:** retain as the canonical public job description
- **Why it earns the page:** a shareable role record is necessary before account
  creation and must remain separate from the private application form
- **Copy:** role-authored content with plain FRAD interface labels; no generated
  promotional language
- **Access:** public only while the vacancy is open and within its publication
  dates; application state is shown only to the owning candidate
- **Primary action:** start or continue the application
- **Problems found:** direct URLs exposed future or expired `OPEN` records;
  metadata could reveal their title and summary; reporting line, language,
  behavioural, safeguarding and travel requirements were stored but omitted
  from the public description
- **Changes made:** applied the publication window to both page and metadata
  queries, returned neutral metadata for unavailable roles, added reporting
  line and all material optional requirements
- **Result:** retained and corrected

## Review 004 — `/guidance`

- **File:** `src/app/guidance/page.tsx`
- **User:** a candidate who wants to understand the recruitment sequence
- **Job:** explain the likely stages, where instructions appear and how to ask
  for an adjustment
- **Decision:** retain as the single recruitment-process guide
- **Why it earns the page:** candidates need this information before they create
  an account or apply; burying it inside an application would be too late
- **Copy:** changed the generic campaign-style heading to “How recruitment
  works” and changed the supervisory “What FRAD expects” to “What to prepare”
- **Access:** public
- **Primary action:** browse open roles; the secondary adjustment link depends on
  the signed-in role
- **Problem found:** every signed-in user was linked to the candidate adjustment
  form, including staff accounts
- **Change made:** candidates reach their private request page, signed-out users
  sign in with a safe return path, and signed-in staff receive public guidance
  rather than entering a candidate flow
- **Result:** retained and corrected

## Review 005 — `/recruitment-process`

- **File reviewed:** `src/app/recruitment-process/page.tsx`
- **User:** someone following an older FRAD recruitment-process link
- **Job:** preserve that link and reach the current guide
- **Decision:** keep the URL, remove it as a React page
- **Why the URL remains:** external links and bookmarks should not break
- **Why the page does not:** it contains no interface or page-specific logic
- **Change made:** moved the permanent redirect into `next.config.js` and deleted
  the redundant page component
- **Result:** route retained as infrastructure; page removed

## Review 006 — `/recruitment-faq`

- **File:** `src/app/recruitment-faq/page.tsx`
- **User:** a candidate with a practical application, account, adjustment,
  reference, offer or fraud question
- **Job:** answer common questions without requiring a support case
- **Decision:** retain; it reduces avoidable candidate contact and does not
  duplicate the process guide
- **Why it earns the page:** it answers task-level questions while `/guidance`
  explains the overall sequence
- **Copy:** ten concrete questions and direct answers; the upload answer now
  points to Messages rather than inventing a “technical concern” process
- **Access:** public, with a role-aware help action
- **Primary action:** read an answer; secondary action is candidate messaging
- **Problem found:** “Still need help?” sent everyone to the formal concern form,
  conflating technical support with a complaint
- **Change made:** candidates go to Messages, signed-out candidates sign in with
  a safe return path, and staff return to recruitment
- **Result:** retained and corrected

## Review 007 — `/complaints`

- **File:** `src/app/complaints/page.tsx`
- **User:** a candidate, witness or member of the public raising a formal
  recruitment concern, appeal, safeguarding, adjustment or privacy issue
- **Job:** create a restricted case and return a reference
- **Decision:** retain as formal intake; do not use it for routine application
  support
- **Why it earns the page:** formal concerns need anonymous access, category
  routing, restricted case handling and an auditable receipt
- **Copy:** explains what to submit, what not to disclose and the consequence of
  omitting an email address
- **Access:** public and rate-limited; signed-in submissions can be linked to the
  reporter
- **Primary action:** submit concern
- **Problems found:** the page promised that email was optional while the API
  rejected every signed-out submission without one; fraud duplicated the
  purpose-built fraud form; network failure left the button busy and gave no
  safe retry message
- **Changes made:** anonymous no-email intake now works, the UI states that
  updates are impossible without contact details, fraud is routed to its own
  form, and submission uses reliable error/finally handling
- **Result:** retained and corrected

## Review 008 — `/report-fraud`

- **File:** `src/app/report-fraud/page.tsx`
- **User:** anyone approached by a person impersonating FRAD or requesting a
  recruitment payment
- **Job:** stop the interaction, submit the identifying details and receive a
  usable case reference
- **Decision:** retain as a focused fraud intake page
- **Why it earns the page:** fraud requires stronger warning copy, faster
  triage, separate rate limiting and different staff handling from a complaint
- **Copy:** direct no-fee warning; now distinguishes evidence a reporter should
  retain from evidence the form can actually accept
- **Access:** public, anonymous and rate-limited
- **Primary action:** submit fraud report
- **Problems found:** the page told reporters to keep screenshots without
  explaining that the form cannot upload them, did not warn against disclosing
  authentication/payment secrets, and returned a raw database UUID as the
  public reference
- **Changes made:** clarified follow-up evidence, added the sensitive-data
  warning, added a human `FRAD-FRAUD-YYYY-XXXXXXXX` reference stored on the
  report, returned it to the reporter and displayed it in the staff queue
- **Result:** retained and corrected

## Review 009 — `/report-recruitment-fraud`

- **File reviewed:** `src/app/report-recruitment-fraud/page.tsx`
- **User:** someone following the older, longer fraud-report URL
- **Job:** reach the current fraud form without a broken link
- **Decision:** preserve the URL; remove the React page
- **Change made:** added a permanent configuration redirect to `/report-fraud`
  and deleted the empty redirect component
- **Result:** route retained as infrastructure; page removed

## Review 010 — `/public/reference/[token]`

- **File:** `src/app/public/reference/[token]/page.tsx`
- **User:** a named external referee holding a time-limited request link
- **Job:** verify employment evidence once without creating an account
- **Decision:** retain as a focused external response page
- **Why it earns the page:** referees are not FRAD users and need a secure,
  single-purpose route with minimal candidate context
- **Copy:** direct request language, named candidate, role and referee; no
  “verification portal” branding or inflated recommendation labels
- **Access:** public bearer link, stored as a hash, rate-limited, expiring and
  single-use
- **Primary action:** submit reference
- **Problems found:** the form remained available while an invalid token was
  shown; it preselected favourable answers (`Excellent`, `Strong`, `Yes`,
  `None`); it ignored the intended referee name; “Satisfactory” was presented as
  “Highly Recommended”; the API accepted an arbitrary answer object; submission
  errors hid already-used and expired-link explanations
- **Changes made:** added explicit loading/invalid/completed states, removed
  every judgement default, grouped the form by employment/work/overall evidence,
  added referee-authority attestation, made development observations optional,
  corrected outcome labels, displayed server errors and enforced every answer
  field and allowed value on the API
- **Result:** retained and rebuilt

## Review 011 — `/privacy`

- **File:** `src/app/privacy/page.tsx`
- **User:** any candidate or referee whose information is processed by FRAD
- **Job:** explain the recruitment-specific collection, use, access, retention,
  protection and rights path
- **Decision:** retain as a dedicated recruitment notice
- **Why it earns the page:** recruitment records include application,
  assessment, reference, identity, adjustment and starter information that a
  generic website privacy page would not explain
- **Copy:** specific to the implemented service; final decisions are described
  as human decisions without promotional technology language
- **Access:** public
- **Primary action:** understand the notice and use Messages or the concern
  service for a request
- **Problems found:** security/audit data and approved hosting, storage and
  delivery providers were omitted; the notice did not explicitly say candidate
  information is not sold
- **Changes made:** added those disclosures and clarified the controlled
  personnel-system handover
- **Result:** retained and corrected; production release still requires the
  privacy lead approval already recorded in the release checklist

## Review 012 — `/terms`

- **File:** `src/app/terms/page.tsx`
- **User:** candidates and external users of FRAD recruitment
- **Job:** state account security, accuracy, deadline, assessment-integrity,
  adjustment and no-fee rules
- **Decision:** retain
- **Why it earns the page:** these rules are accepted at account/application
  boundaries and must remain available outside those forms
- **Copy:** candidate language; replaced the internal “preboarding service” term
  with “steps before your first day”
- **Access:** public
- **Primary action:** informational; help, concern and fraud paths are distinct
- **Problems found:** the change clause relied on passive continued use and the
  final paragraph grouped routine support, formal concerns and fraud together
- **Changes made:** material changes now require additional notice; routine
  questions go to help/Messages, formal matters to the concern service and
  impersonation/payment requests to the fraud form
- **Result:** retained and corrected

## Review 013 — `/auth/login`

- **File:** `src/app/auth/login/page.tsx`
- **User:** candidates and FRAD staff
- **Job:** establish a password, MFA or staff SSO session and return the user to
  the work they intended to open
- **Decision:** retain
- **Why it earns the page:** it is the single authentication entry point for
  candidate and staff accounts
- **Copy:** direct account language; removed the campaign-style “Pick up where
  you left off” headline
- **Access:** public; successful authentication determines the permitted
  destination
- **Primary action:** sign in; password recovery, candidate registration and
  staff SSO are subordinate paths
- **Problems found:** role links, registration, password recovery and staff SSO
  discarded the intended destination; this was especially disruptive when
  signing in from a vacancy
- **Changes made:** preserved a validated local `next` destination through the
  password and SSO flows, including SSO failure recovery; vacancy applications
  now return to the selected role after sign-in
- **Result:** retained and corrected

## Review 014 — `/auth/register`

- **File:** `src/app/auth/register/page.tsx`
- **User:** a person creating a candidate account
- **Job:** collect the minimum reusable identity and contact details, record
  notice acknowledgements and start email verification
- **Decision:** retain
- **Why it earns the page:** application data must be attached to a verified,
  reusable candidate account
- **Copy:** direct account language; removed the vague “details we can reuse”
  headline and made the legal-name purpose explicit
- **Access:** public
- **Primary action:** create an account; existing-account sign-in is secondary
- **Problems found:** every successful API response was treated as a new
  signed-in account even when the address already existed, causing an unexplained
  redirect back to sign-in; the selected vacancy was lost; the two-column name
  form was cramped on mobile
- **Changes made:** added one neutral check-email confirmation for both new and
  existing addresses, preserved the validated local destination, added browser
  autofill semantics and corrected the responsive name layout
- **Result:** retained and corrected

## Review 015 — `/login`

- **File:** `src/app/login/page.tsx`
- **User:** anyone following an old sign-in URL
- **Job:** compatibility only
- **Decision:** remove as a page
- **Why it does not earn a page:** it duplicated no interface or behaviour and
  existed only to redirect to `/auth/login`
- **Access:** public compatibility URL
- **Changes made:** deleted the page component and moved the permanent redirect
  to `next.config.js`; query parameters continue to pass through
- **Result:** one canonical sign-in page, with the old URL preserved

## Review 016 — `/forgot-password`

- **File:** `src/app/forgot-password/page.tsx`
- **User:** a candidate or staff member who cannot sign in
- **Job:** request a time-limited password reset without disclosing whether an
  account exists
- **Decision:** retain
- **Why it earns the page:** password recovery must remain available without an
  authenticated session
- **Copy:** direct security and delivery guidance; removed title-case labels and
  generic card language
- **Access:** public, IP- and account-rate-limited
- **Primary action:** send a reset link; return to sign-in is secondary
- **Problems found:** the page looked unrelated to the newer account service,
  did not explain the one-hour expiry, and discarded the role or task that
  brought the user to sign-in
- **Changes made:** rebuilt the page in the account-service design, retained the
  neutral response, added expiry/spam guidance and carried a validated local
  destination into the emailed reset link
- **Result:** retained and corrected

## Review 017 — `/reset-password`

- **File:** `src/app/reset-password/page.tsx`
- **User:** the recipient of a valid password-reset email
- **Job:** replace the account password, revoke prior sessions and return the
  user to sign-in
- **Decision:** retain
- **Why it earns the page:** the reset token must be handled in a dedicated,
  unauthenticated security flow
- **Copy:** states the actual password rule and session effect in plain
  language
- **Access:** public with a purpose-bound, expiring token
- **Primary action:** change password; request another link is shown only when
  the token is missing
- **Problems found:** a usable form appeared without a token, the saved
  destination was erased when the URL fragment was cleared, and the page did
  not tell users that a letter and number are required
- **Changes made:** added checking, incomplete-link, form and completion states;
  retained the safe return destination; removed untyped error handling and
  aligned the interface with the account service
- **Result:** retained and corrected

## Review 018 — `/verify-email`

- **File:** `src/app/verify-email/page.tsx`
- **User:** a candidate following an email-verification link
- **Job:** consume the expiring token, confirm the address and return the
  candidate to sign-in
- **Decision:** retain
- **Why it earns the page:** email verification is a separate security
  boundary and needs clear success, failure and recovery states
- **Copy:** direct verification language with no celebratory or campaign text
- **Access:** public with a purpose-bound token
- **Primary action:** sign in after success; request another email after a
  missing, invalid or expired link
- **Problems found:** a missing token left the page permanently saying
  “Verifying”; query context was erased with the token fragment; there was no
  request cancellation or distinct recovery state
- **Changes made:** rebuilt the state machine and interface, preserved the
  selected vacancy through registration and verification, and stopped creating
  a signed-in session before address verification
- **Result:** retained and corrected

## Review 019 — `/register`

- **File:** `src/app/register/page.tsx`
- **User:** anyone following an old account-creation URL
- **Job:** compatibility only
- **Decision:** remove as a page
- **Why it does not earn a page:** it contained no interface and only redirected
  to `/auth/register`
- **Access:** public compatibility URL
- **Changes made:** deleted the page component and added a permanent
  configuration redirect that preserves query parameters
- **Result:** one canonical registration page, with the old URL preserved

## Review 020 — `/candidate/dashboard`

- **File:** `src/app/candidate/dashboard/page.tsx`
- **User:** a signed-in candidate
- **Job:** show the single next action, urgent work, recent applications,
  unread messages and profile readiness
- **Decision:** retain
- **Why it earns the page:** it is the candidate’s concise starting point and
  prioritises across otherwise separate applications, interviews, offers and
  pre-start work
- **Copy:** practical task and status language; no aspirational recruitment
  marketing
- **Access:** candidate accounts only
- **Primary action:** open the most urgent task, or view applications when
  nothing is outstanding
- **Problems found:** authenticated staff could open the route and see a
  meaningless empty candidate dashboard
- **Changes made:** added candidate-role enforcement and return routing to the
  correct staff home; retained the focused hierarchy rather than adding more
  dashboard cards
- **Result:** retained and corrected

## Review 021 — `/candidate/applications`

- **File:** `src/app/candidate/applications/page.tsx`
- **User:** a signed-in candidate
- **Job:** provide the complete register of drafts and submitted applications
- **Decision:** retain
- **Why it earns the page:** the dashboard intentionally shows only a recent
  subset; candidates still need one durable place for every application
- **Copy:** concise status, receipt and last-saved language
- **Access:** candidate accounts only
- **Primary action:** continue a draft or open a submitted application
- **Problems found:** staff could open the route; links to public role details
  became a 404 after a vacancy closed; draft-deletion failures used browser
  alerts
- **Changes made:** enforced candidate access, show the public role link only
  while the vacancy is actually open, and added inline draft-deletion errors
  with a shorter confirmation
- **Result:** retained and corrected; no tabs or filters added because the
  single register is clearer at normal candidate volume

## Review 022 — `/candidate/applications/apply`

- **File:** `src/app/candidate/applications/apply/page.tsx`
- **User:** a verified candidate applying for one open role
- **Job:** collect role-specific answers and selected documents, save a draft,
  obtain declarations, present a final review and submit exactly once
- **Decision:** retain
- **Why it earns the page:** this is the core candidate transaction and cannot
  be safely collapsed into the vacancy or profile page
- **Copy:** application instructions and declarations are factual; the final
  checkbox now confirms the statements shown instead of vaguely agreeing to a
  privacy notice
- **Access:** signed-in candidate; submission additionally requires a verified
  email and an open deadline
- **Primary action:** review, then submit; server draft saving is automatic and
  manual save remains available
- **Problems found:** a missing role caused an endless loader; a closed or
  unavailable role left a generic form shell; required multi-select questions
  could reach review incomplete; answers and document identifiers were copied
  into unencrypted local storage
- **Changes made:** added a dedicated unavailable state, explicit completeness
  checks, readable document labels and server-only draft persistence; save
  failures are now stated honestly rather than claiming an offline copy exists
- **Result:** retained and materially corrected

## Review 023 — `/candidate/applications/[id]`

- **File:** `src/app/candidate/applications/[id]/page.tsx`
- **User:** the candidate who owns the application
- **Job:** provide the current status, next action, recruitment journey and
  permanent record of what was submitted
- **Decision:** retain
- **Why it earns the page:** a receipt proves submission once; this page remains
  the live application record as assessments, interviews, offers and starting
  steps are added
- **Copy:** candidate-safe statuses and direct next-step guidance
- **Access:** ownership checked in the API; internal pipeline status is removed
  from the response
- **Primary action:** complete the next recruitment activity; withdrawal is
  subordinate and only available while the state machine permits it
- **Problems found:** unpublished assessment scores were exposed; an incomplete
  terminal-state list allowed withdrawal from closed outcomes; the API returned
  submitted answers but the page did not show them; withdrawal had no network
  failure or busy handling
- **Changes made:** removed scores, delegated withdrawal eligibility to the
  workflow state machine, added submitted answers and attachment names, request
  cancellation and guarded withdrawal handling
- **Result:** retained and materially corrected

## Review 024 — `/candidate/applications/[id]/receipt`

- **File:** `src/app/candidate/applications/[id]/receipt/page.tsx`
- **User:** the candidate immediately after a successful submission
- **Job:** provide printable proof of the role, submission time, recorded item
  counts and application reference
- **Decision:** retain
- **Why it earns the page:** it is a fixed transaction confirmation, not a
  duplicate of the changing application-status record
- **Copy:** factual “Application submitted” confirmation and a short account
  communication expectation
- **Access:** candidate ownership and a non-null submission timestamp are
  required
- **Primary action:** open the live application record; print and return to the
  account are secondary
- **Problems found:** the displayed application reference was a raw database
  UUID, the timestamp showed no time, and the query loaded all answer and file
  records just to count them
- **Changes made:** added a unique human application reference assigned at
  submission, show the full submission time, and query only displayed fields
  plus relation counts
- **Result:** retained and corrected

## Review 025 — `/candidate/assessments`

- **File:** `src/app/candidate/assessments/page.tsx`
- **User:** a candidate following an older assessment-list URL
- **Job:** compatibility only
- **Decision:** remove as a page
- **Why it does not earn a page:** it contained no assessment interface and
  redirected to the unified task list; a second register would make candidates
  check two places for work
- **Access:** candidate compatibility URL
- **Changes made:** deleted the page component and added a permanent redirect to
  `/candidate/tasks`
- **Result:** one candidate work list, with the old assessment URL preserved

## Review 026 — `/candidate/assessments/[id]`

- **File:** `src/app/candidate/assessments/[id]/page.tsx`
- **User:** the candidate invited to this assessment
- **Job:** present instructions, start one controlled attempt, save answers,
  enforce the earlier of duration/deadline and submit a locked response
- **Decision:** retain
- **Why it earns the page:** timed assessment delivery is a distinct,
  high-integrity transaction
- **Copy:** direct attempt, timer, saving and submission language; results are
  not promised or disclosed without an approved publication control
- **Access:** candidate ownership plus application-stage, opening-time,
  closing-time and attempt-status checks
- **Primary action:** answer every question and submit once
- **Problems found:** a reload after submission showed “Before you begin”;
  background-tab throttling made the countdown drift; auto-scored results were
  immediately exposed; an unused GET submit handler started attempts as a side
  effect; the custom confirmation lacked the shared dialog behaviour
- **Changes made:** restored terminal status correctly, made the countdown use a
  fixed server-derived deadline, kept scores internal, removed the mutating GET
  handler and question weights, require complete answers before review, and use
  the accessible shared confirmation dialog
- **Result:** retained and materially corrected

## Review 027 — `/candidate/interviews`

- **File:** `src/app/candidate/interviews/page.tsx`
- **User:** a candidate with current or previous interview invitations
- **Job:** show the authoritative date, time, place/joining link and response
  state; allow confirmation, reschedule request, decline and calendar export
- **Decision:** retain
- **Why it earns the page:** interview details and responses remain relevant
  after the corresponding dashboard task is completed
- **Copy:** direct scheduling language with the displayed timezone made
  explicit
- **Access:** candidate ownership; response and calendar endpoints repeat the
  ownership check
- **Primary action:** respond to an upcoming invitation
- **Problems found:** past interviews appeared before upcoming ones; date-times
  omitted the timezone; meeting links were plain text; decline had no
  confirmation; the API accepted an empty reschedule reason
- **Changes made:** grouped and sorted upcoming versus history, added timezone
  output globally, made safe HTTP(S) meeting links actionable, hid calendar
  export for past/cancelled events, added the adjustment path and confirmed
  decline, and enforced reschedule comments server-side
- **Result:** retained and corrected

## Review 028 — `/candidate/offers`

- **File:** `src/app/candidate/offers/page.tsx`
- **User:** a candidate following an older offer-list URL
- **Job:** compatibility only
- **Decision:** remove as a page
- **Why it does not earn a page:** it contained no offer interface and
  redirected to Applications; outstanding offers already appear in the unified
  task list and the related application record
- **Access:** candidate compatibility URL
- **Changes made:** deleted the page component and added a permanent redirect to
  `/candidate/applications`
- **Result:** no third candidate inbox, with the old offer URL preserved

## Review 029 — `/candidate/offers/[id]`

- **File:** `src/app/candidate/offers/[id]/page.tsx`
- **User:** the candidate who received this issued offer version
- **Job:** display the formal PDF and key terms, collect a witnessed electronic
  acceptance or reasoned decline, and route an accepted candidate into starting
  steps
- **Decision:** retain
- **Why it earns the page:** an employment offer is a controlled document and
  consequential transaction, not an ordinary application status
- **Copy:** formal document and decision language; the PDF is explicitly the
  authoritative record
- **Access:** candidate ownership and candidate-visible offer states only;
  draft and superseded versions return not found
- **Primary action:** read the PDF, then accept; clarification and decline are
  secondary
- **Problems found:** the server allowed decisions without a formal PDF; the
  acceptance declaration existed only in the browser; a start-date-only
  clarification crashed; completed decisions left active controls; acceptance
  used a timed redirect; unused template content was returned to the browser
- **Changes made:** require the PDF and declaration server-side, retain
  declaration-version audit evidence, construct valid start-date messages,
  replace controls with the recorded state immediately, provide an explicit
  starting-steps action and minimise the offer payload
- **Result:** retained and materially corrected

## Review 030 — `/candidate/tasks`

- **File:** `src/app/candidate/tasks/page.tsx`
- **User:** a signed-in candidate
- **Job:** provide one deadline-ordered list of every assessment, interview,
  offer and required starting item that can still be acted on
- **Decision:** retain
- **Why it earns the page:** it replaces several fragmented inboxes and gives
  the candidate one answer to “what do I need to do?”
- **Copy:** direct title, context, deadline and overdue language
- **Access:** candidate accounts only
- **Primary action:** open the first actionable item
- **Problems found:** expired offers, closed assessments and past unanswered
  interviews/meetings could remain as impossible tasks; pre-start links opened
  only a category page; equal-deadline ordering was unstable
- **Changes made:** filter expired/non-actionable records at source, deep-link
  every pre-start task to its exact item, add deterministic tie-breaking and
  enforce candidate routing
- **Result:** retained and corrected

## Review 031 — `/candidate/messages`

- **File:** `src/app/candidate/messages/page.tsx`
- **User:** a signed-in candidate with at least one application
- **Job:** keep routine candidate/recruitment communication attached to the
  correct application and expose its delivery history
- **Decision:** retain
- **Why it earns the page:** messages are durable case records and cannot be
  replaced by transient email or dashboard notifications
- **Copy:** direct routine-help language; formal concerns and suspected fraud
  are explicitly routed to their separate services
- **Access:** candidate accounts and owned, non-restricted application threads
  only
- **Primary action:** reply to a conversation or start a message against a
  selected application
- **Problems found:** threads were ordered by UUID, lacked vacancy context and
  never cleared unread counts; a new message silently used the latest
  application; candidate-owned thread attachments were not downloadable
- **Changes made:** order by latest message, show vacancy reference/title, mark
  received messages read on view, let the candidate choose an application,
  display clean attachments and extend download ownership to non-restricted
  candidate threads
- **Result:** retained and materially corrected

## Review 032 — `/candidate/accommodations`

- **File:** `src/app/candidate/accommodations/page.tsx`
- **User:** a candidate who needs a practical change to participate in
  recruitment
- **Job:** submit the minimum adjustment needed against an active application
  and keep the confidential request/decision record
- **Decision:** retain
- **Why it earns the page:** adjustment information needs a restricted HR
  workflow and must not be mixed into selector, assessor or panel records
- **Copy:** asks what would help and explicitly says a diagnosis or medical
  history is not required
- **Access:** candidate ownership on submission; candidate list excludes closed
  applications; HR processing is separate from selection views
- **Primary action:** send a practical request; history is equally visible
- **Problems found:** history omitted the application, original request and
  date; empty accounts saw a disabled form; network failures were unhandled;
  closed unsuccessful outcomes could still accept requests
- **Changes made:** added a full candidate-visible case history, explicit
  active-application empty state, busy/error handling, human status labels and
  matching server/client closed-state rules
- **Result:** retained and materially corrected

## Review 033 — `/candidate/complaints`

- **File:** `src/app/candidate/complaints/page.tsx`
- **User:** a signed-in reporter following a formal concern, appeal or
  complaint
- **Job:** show the original submission, case status, application context,
  public case-team updates, outcome and reporter replies
- **Decision:** retain
- **Why it earns the page:** the public concern service is intake; this
  authenticated page is the private follow-up record
- **Copy:** formal case language without treating routine help as a complaint
- **Access:** enforced by the candidate-area layout and reporter ownership;
  internal case notes are never returned
- **Primary action:** read the case-team update and reply while the case remains
  open
- **Problems found:** the original submission and application context were
  hidden; comment authorship was unclear; reporters could not answer requests
  for information; there was no shared candidate-area role guard
- **Changes made:** added the application relationship and context, original
  submission, authored/timestamped conversation, rate-limited candidate reply
  endpoint with assignee notification, and one candidate-only layout boundary
- **Result:** retained and materially corrected

## Review 034 — `/candidate/profile`

- **File:** `src/app/candidate/profile/page.tsx`
- **User:** a signed-in candidate maintaining reusable application information
- **Job:** summarise contact/background readiness and manage work, education,
  licences, skills, languages, certifications and documents
- **Decision:** retain
- **Why it earns the page:** one reusable profile shortens later applications,
  while each submission still takes an immutable snapshot
- **Copy:** explains reuse and snapshot behaviour directly
- **Access:** candidate area only; submitted applications are not modified by
  later profile edits
- **Primary action:** complete or correct the next missing core section
- **Problems found:** the readiness score weighted 16 optional fields equally;
  the embedded editor refetched server data, corrupted language/certification/
  skill fields during edit, deleted immediately and used a dense basic form
- **Changes made:** readiness now measures five core records only; server data
  seeds a rebuilt neutral editor that preserves every stored field, confirms
  deletion, reports failures and refreshes the server record after changes
- **Result:** retained and materially corrected

## Review 035 — `/candidate/profile/personal`

- **File:** `src/app/candidate/profile/personal/page.tsx`
- **User:** a candidate maintaining reusable contact and availability details
- **Job:** keep legal/preferred names, reachable phone numbers, broad current
  location and work-location/start preferences accurate
- **Decision:** retain
- **Why it earns the page:** these fields apply across applications and do not
  belong in every role-specific form
- **Copy:** says why each section is collected and when fuller address data may
  be requested
- **Access:** candidate area only
- **Primary action:** save changes
- **Problems found:** blank profiles defaulted nationality/residence to Nigeria;
  the form collected residential address, LGA and contact-channel preferences
  not needed or consistently honoured during recruitment; comma parsing made
  multiple duty locations hard to enter; phone validation was weaker than
  registration
- **Changes made:** reduced the form to necessary reusable details, removed
  geographic assumptions and early full-address collection, separated the
  sections, retained raw duty-location text until save, added cancellation-safe
  loading and reused validated international phone rules
- **Result:** retained and materially simplified

## Review 036 — `/candidate/profile/education`

- **File:** `src/app/candidate/profile/education/page.tsx`
- **User:** a candidate recording academic, vocational or school
  qualifications
- **Job:** maintain reusable education history and optional candidate-owned
  evidence
- **Decision:** retain
- **Why it earns the page:** structured education can be reused and compared
  against role requirements without re-entry
- **Copy:** qualification-neutral and evidence is explicitly optional
- **Access:** candidate ownership on every create, update, delete and file
  operation
- **Primary action:** add or correct an education record
- **Problems found:** the form assumed a Nigerian bachelor degree completed in
  2018–2022, excluded other qualification paths, could not represent current
  study, hid attached evidence and had no removal path; delete network failures
  could leave the page busy
- **Changes made:** removed defaults, made qualification free text with examples,
  added nullable/current study support and migration, exposed secure certificate
  view/replace/remove actions and guarded deletion errors
- **Result:** retained and materially corrected

## Review 037 — `/candidate/profile/employment`

- **File:** `src/app/candidate/profile/employment/page.tsx`
- **User:** a candidate recording work that is relevant to an application
- **Job:** maintain reusable employer, role, type, location, dates and
  responsibility records
- **Decision:** retain
- **Why it earns the page:** structured work history prevents repeated entry and
  gives selectors consistent evidence without turning the profile into a CV
  builder
- **Copy:** direct, candidate-facing and clear that references are requested
  separately if needed
- **Access:** candidate ownership on every create, update and delete operation
- **Primary action:** add or correct one role
- **Problems found:** blank forms assumed Nigeria and full-time employment; the
  page collected supervisor details, contact permission and reasons for leaving
  before a reference check existed; deletion failures could leave the page busy;
  the presentation did not match the rest of the candidate profile
- **Changes made:** removed geographic and employment-type defaults, added
  temporary and self-employed options, limited the form to selection-relevant
  history, made reference permission default to false at the API boundary,
  guarded deletion failures and rebuilt the page with the shared candidate
  page, form and empty-state language
- **Result:** retained and materially simplified

## Review 038 — `/candidate/profile/licences`

- **File:** `src/app/candidate/profile/licences/page.tsx`
- **User:** a candidate whose work requires a professional registration or
  practising licence
- **Job:** record a regulated credential and, optionally, provide evidence
- **Decision:** retain, with a narrower purpose
- **Why it earns the page:** some FRAD roles cannot be filled without a current
  professional authorisation; this is distinct from general certificates and
  association memberships
- **Copy:** uses licence and registration language, not the previous catch-all
  “licences and memberships” wording
- **Access:** candidate ownership is checked for the record and any uploaded
  evidence
- **Primary action:** add or correct one required licence
- **Problems found:** the page overlapped with profile certifications, exposed
  the raw `UNVERIFIED` system value, hid existing evidence, offered no evidence
  removal and could remain busy after a failed deletion
- **Changes made:** narrowed the page to regulated credentials, added issue and
  expiry context, shows only meaningful completed verification, added secure
  evidence view/replace/remove actions, guarded deletion and aligned the page
  with the candidate design system
- **Result:** retained and materially focused

## Review 039 — `/candidate/profile/documents`

- **File:** `src/app/candidate/profile/documents/page.tsx`
- **User:** a candidate keeping files that can be reused in applications
- **Job:** upload, categorise, open, update or remove a reusable file
- **Decision:** retain, with early-stage document collection reduced
- **Why it earns the page:** a small reusable library makes repeat applications
  quicker while submitted applications retain their own immutable copies
- **Copy:** distinguishes application files from identity and pre-employment
  documents, which FRAD requests only when needed
- **Access:** candidate ownership is enforced; submitted copies cannot be
  deleted; category, extension and configured size limits are now checked on
  the server
- **Primary action:** upload one reusable application file
- **Problems found:** fallback categories encouraged early passport, guarantor
  and statutory-document collection; arbitrary or inactive category codes could
  be submitted; configured file limits were not enforced; files could not be
  opened from the library; every item showed a meaningless “Ready” badge; the
  delete dialog collected a note the server discarded
- **Changes made:** reduced fallback categories to CV and cover letter, made
  active configuration authoritative, enforced category limits, added loading
  and failure states, secure file opening and expiry context, replaced the
  unused reason dialog, and aligned the page with the candidate design system
- **Result:** retained and materially simplified

## Review 040 — `/candidate/settings`

- **File:** `src/app/candidate/settings/page.tsx`
- **User:** a signed-in candidate managing their account rather than an
  individual application
- **Job:** manage email, alerts, optional future-role contact, sign-in security,
  active sessions, data export and account closure
- **Decision:** retain as one settings page
- **Why it earns the page:** these are account-wide choices and security
  controls; separating each into a route would add navigation without making
  the decisions clearer
- **Copy:** direct labels tied to the effect of each setting
- **Access:** candidate area only, with re-authentication or verification where
  the underlying operation requires it
- **Primary action:** depends on the setting; no false page-wide call to action
- **Problems found:** phone editing duplicated Personal details; “withdraw
  recruitment consent” was a dangerous catch-all that withdrew every active
  application and opened a deletion request, duplicating each application’s
  explicit withdrawal control; settings mutations had no shared busy state
- **Changes made:** made Personal details the single place for phone changes,
  removed the catch-all consent action from the UI and API, retained explicit
  application withdrawal and account closure, added mutation locking and
  simplified the page title and summary
- **Result:** retained and materially simplified

## Review 041 — `/candidate/preboarding`

- **File:** `src/app/candidate/preboarding/page.tsx`
- **User:** a candidate who has accepted an offer
- **Job:** understand what remains before starting, confirm the agreed start
  date and enter each assigned requirement
- **Decision:** retain as the preboarding overview
- **Why it earns the page:** it is the one place that answers “what does FRAD
  still need from me?” across several requirement types
- **Copy:** names the role, uses “before you start,” and describes only assigned
  work
- **Access:** candidate-owned preboarding record only
- **Primary action:** complete the next outstanding assigned category
- **Problems found:** candidates without preboarding saw a zero-percent empty
  programme with seven dead-end category links; every empty category was shown;
  the role was not identified; candidates could enter a date up to 30 days away
  from the accepted offer and the system immediately marked the check passed
- **Changes made:** added explicit loading, failure and no-checklist states,
  included role context, hides unassigned categories, added the task deep-link
  anchor, and changed start-date handling to confirmation of the accepted-offer
  date with message-based change requests
- **Result:** retained and materially corrected

## Review 042 — `/candidate/preboarding/forms`

- **File:** `src/app/candidate/preboarding/forms/page.tsx`
- **User:** an offered candidate completing structured pre-employment
  information
- **Job:** save a draft, submit the assigned form, and correct it only when FRAD
  returns it
- **Decision:** retain
- **Why it earns the page:** structured, validated answers are easier for the
  candidate and safer to review than exchanging editable office documents
- **Copy:** states draft, review and returned-form behaviour plainly
- **Access:** each form is resolved through the candidate-owned preboarding
  record and the assigned template snapshot
- **Primary action:** complete and submit an outstanding form
- **Problems found:** submitted and under-review forms remained editable; due
  dates were hidden; task links could not focus the assigned form; old return
  comments could appear after resubmission
- **Changes made:** locked forms at submission in both UI and API, limited
  editing to new, draft and returned states, added due dates and stable anchors,
  and scoped change-request text to the returned state
- **Result:** retained and corrected

## Review 043 — `/candidate/preboarding/documents`

- **File:** `src/app/candidate/preboarding/documents/page.tsx`
- **User:** an offered candidate supplying a specific pre-employment record
- **Job:** understand the requirement, submit a protected file, see the exact
  submitted version and replace it only when requested
- **Decision:** retain, separate from the reusable profile library
- **Why it earns the page:** offer-specific identity and employment checks need
  stronger access, expiry, review, rejection and version controls than an
  application attachment
- **Copy:** states the requirement, accepted formats, privacy and review outcome
  without generic compliance slogans
- **Access:** candidate-owned requirement and file ownership, scan, configured
  type, size, expiry and sensitivity checks
- **Primary action:** submit or correct one requested document
- **Problems found:** submitted documents could be replaced during HR review;
  the first upload was labelled version 2; task links could not focus the
  requested document; stale rejection text could survive into unrelated states
- **Changes made:** locked submitted and under-review versions in UI and API,
  increments version only for actual replacements, added stable item anchors
  and scoped replacement reasons to rejected/resubmission states
- **Result:** retained and corrected

## Review 044 — `/candidate/preboarding/policies`

- **File:** `src/app/candidate/preboarding/policies/page.tsx`
- **User:** an offered candidate reading and acknowledging a policy assigned to
  their role
- **Job:** read the controlled PDF and record acknowledgement against that exact
  version
- **Decision:** retain
- **Why it earns the page:** policy acknowledgement needs the source document,
  assigned version and signature evidence together; a generic checkbox elsewhere
  would not provide a defensible record
- **Copy:** tells the candidate to read the document and identifies version,
  effective date, due date and recorded acknowledgement
- **Access:** candidate-owned assignment; signature evidence, IP and user agent
  are captured without exposing them back on the page
- **Primary action:** read and acknowledge or sign the assigned version
- **Problems found:** live policy edits could replace the assigned snapshot on
  screen; the legacy `SIGNATURE` method was incompatible with the signing
  control; the API allowed signing without an official clean PDF and repeat
  signing after completion; task links lacked an item anchor
- **Changes made:** renders the immutable assignment snapshot, maps legacy
  signatures to typed-name acknowledgement, requires the assigned clean PDF,
  locks terminal acknowledgements, and adds due dates and stable anchors
- **Result:** retained and materially hardened

## Review 045 — `/candidate/preboarding/courses`

- **File:** `src/app/candidate/preboarding/courses/page.tsx`
- **User:** an offered candidate completing mandatory learning
- **Job:** work through the assigned course version, record module completion,
  pass its assessment and receive a completion certificate where enabled
- **Decision:** retain as embedded, tracked learning
- **Why it earns the page:** uploading a course file does not prove completion;
  platform-recorded modules plus an assessed pass provide a useful audit trail.
  External courses should count only through a trusted provider integration or
  verifiable provider certificate
- **Copy:** describes learning, completion evidence, pass mark and remaining
  attempts directly
- **Access:** candidate-owned assignment; grading uses the server-side immutable
  snapshot
- **Primary action:** complete the next module, then submit the assessment
- **Problems found:** the full snapshot—including correct answers and score
  weights—was serialized to the browser; the API accepted incomplete or unknown
  answer sets; an empty course could receive a 100% pass; exhausted candidates
  were still shown a quiz action; task links lacked course anchors
- **Changes made:** sends a strict candidate-safe course view, retains answer
  keys only for server grading, validates the complete assigned question set,
  rejects empty course configuration, handles exhausted attempts, clarifies
  module confirmation and adds stable anchors
- **Result:** retained and materially hardened

## Review 046 — `/candidate/preboarding/tasks`

- **File:** `src/app/candidate/preboarding/tasks/page.tsx`
- **User:** an offered candidate given a specific action that does not fit a
  standard preboarding requirement
- **Job:** understand the assigned action, add a completion note or evidence,
  submit it and respond if FRAD returns it
- **Decision:** retain as a limited exception lane
- **Why it earns the page:** a small number of role- or location-specific
  actions cannot always be represented as a document, form, policy, course or
  meeting; it should not become the default way HR assigns work
- **Copy:** renamed from vague “Other tasks” to “Additional requests” and states
  the narrow purpose
- **Access:** candidate-owned assignment and candidate-owned clean evidence
- **Primary action:** submit one outstanding or returned request
- **Problems found:** the page and API used the live task template, allowing
  instructions and evidence/review rules to change after assignment; submitted
  tasks still displayed a submission control; reviewer comments and task
  anchors were absent
- **Changes made:** uses the immutable task snapshot for presentation and
  enforcement, limits action controls to new/draft/returned states, shows
  returned guidance and review state, and adds stable anchors
- **Result:** retained and corrected

## Review 047 — `/candidate/preboarding/meetings`

- **File:** `src/app/candidate/preboarding/meetings/page.tsx`
- **User:** an offered candidate attending orientation or another pre-start
  appointment
- **Job:** see the complete appointment, join or travel to it, and send an
  attendance response
- **Decision:** retain
- **Why it earns the page:** a scheduled appointment has time, timezone,
  location/link, response and attendance state that do not fit a generic task
- **Copy:** uses appointment-specific language and states the candidate’s saved
  response
- **Access:** candidate-owned meeting only; candidate changes stop after a
  terminal attendance state
- **Primary action:** confirm attendance or give a reason for another time or
  non-attendance
- **Problems found:** end time, assigned timezone and description were hidden;
  online links were printed as text; unsafe link schemes were not filtered;
  decline/reschedule responses contained no reason; task links lacked anchors
- **Changes made:** shows the full time range in the meeting timezone, venue and
  safe HTTPS join action, adds a reasoned response control with API validation,
  displays the saved response and adds stable item anchors
- **Result:** retained and corrected

## Review 048 — `/candidate/preboarding/reporting-information`

- **File:** `src/app/candidate/preboarding/reporting-information/page.tsx`
- **User:** an offered candidate preparing for the first day
- **Job:** read durable instructions about where to go, who to meet and what to
  bring, and confirm receipt where requested
- **Decision:** retain
- **Why it earns the page:** first-day instructions must remain easy to find
  after checklist actions are complete and should not be hidden inside a
  transient message or generic task
- **Copy:** practical, specific first-day language
- **Access:** candidate-owned preboarding information only
- **Primary action:** read; confirm receipt only for marked items
- **Problems found:** task links lacked item anchors; the API allowed repeated
  acknowledgement and acknowledgement of informational items that did not
  require it
- **Changes made:** added stable anchors, made the acknowledgement label
  explicit and enforced required, one-time acknowledgement on the server
- **Result:** retained with minor corrections

## Review 049 — `/recruitment/dashboard`

- **File:** `src/app/recruitment/dashboard/page.tsx`
- **User:** a recruitment/HR officer or HR manager starting a work session
- **Job:** see immediate workload, active pipeline shape, recent submitted
  records and the next assigned actions
- **Decision:** retain as the staff home, not a reporting substitute
- **Why it earns the page:** it answers “what needs my attention now?” and
  routes staff into the operational record without requiring them to search
  first
- **Copy:** short operational labels with no governance slogans
- **Access:** operational staff scope; technical administrators and specialist
  single-role users are routed to their own work areas
- **Primary action:** open My work, then the first due item
- **Problems found:** unsubmitted candidate drafts appeared in staff counts and
  recent activity; the preboarding stage used a state not present on
  applications; decision counts omitted reserve and offer-draft states; an
  officer who also held approver authority was redirected away from operations;
  the pipeline subtitle mixed lifetime totals with active stage counts
- **Changes made:** excluded drafts from every staff dashboard query, corrected
  decision/preboarding stage mappings, preserved the operational home for
  recruitment officers with multiple roles, and made the pipeline denominator
  active applications/open vacancies
- **Result:** retained and materially corrected

## Review 050 — `/recruitment/work`

- **File:** `src/app/recruitment/work/page.tsx`
- **User:** a recruitment officer managing their queue, or an HR manager
  overseeing team workload
- **Job:** work by due date and urgency across recruitment modules without
  searching each one
- **Decision:** retain as the primary operating queue
- **Why it earns the page:** one queue is the main mechanism that keeps a
  powerful platform simple; underlying pages remain the source of truth for the
  actual decision
- **Copy:** action, assignee, due date and blocking reason only
- **Access:** officers see their assignments and role queue; only HR managers
  can open team scope or take action across assignees
- **Primary action:** open the first overdue or due item and complete its
  underlying recruitment action
- **Problems found:** rendering the page rebuilt the global queue with hundreds
  of database writes despite an existing background job; `application.read.all`
  incorrectly granted recruitment officers team-wide visibility and mutation
  of HR-manager work
- **Changes made:** removed queue materialisation from the page request, leaving
  it with the scheduled job, made team scope HR-manager-only and changed the
  mutation boundary to decision authority rather than broad record visibility
- **Result:** retained and materially hardened

## Review 051 — `/recruitment/vacancies`

- **File:** `src/app/recruitment/vacancies/page.tsx`
- **User:** recruitment staff reviewing roles in their authorised scope
- **Job:** find a vacancy, see its lifecycle state and application volume, and
  open the source record
- **Decision:** retain as the vacancy register
- **Why it earns the page:** staff need a durable role-centred register; it is
  not the place for pipeline analytics or approval decisions
- **Copy:** neutral to officer and manager responsibilities; it no longer says
  every viewer builds, approves and publishes
- **Access:** all-vacancy or owner-assigned permission scope
- **Primary action:** open the required vacancy; create one only with create
  permission
- **Problems found:** application totals included private candidate drafts; a
  500-row register had no local filtering; metrics changed with the displayed
  result set and copy blurred officer work with manager approval
- **Changes made:** excludes drafts from counts, added status and
  title/reference/department filters, keeps headline metrics scoped but
  independent of filters, and simplified the page purpose
- **Result:** retained and corrected

## Review 052 — `/recruitment/vacancies/new`

- **Files:** `src/app/recruitment/vacancies/new/page.tsx`,
  `src/components/recruitment/NewVacancyForm.tsx`
- **User:** a recruitment/HR officer authorised to create a role
- **Job:** create a usable vacancy draft with its core ownership, contract,
  dates and public specification
- **Decision:** retain, radically reduce
- **Why it earns the page:** creating the initial record is a distinct action;
  advanced selection and preboarding setup belong on the saved vacancy
- **Copy:** speaks about a draft and the public role specification, without
  inflated “HR vacancy creation” language
- **Access:** server-rendered create-permission boundary plus API permission
- **Primary action:** save the draft
- **Problems found:** the client page was visible without create permission;
  it combined roughly thirty fields, conditional application design, documents,
  scorecards and preboarding; generated collision-prone references in the
  browser; assumed fixed-term/12 months/three years/30 days; fetched the entire
  vacancy register merely to populate reference lists; accepted inactive or
  invented reference values at the API
- **Changes made:** rebuilt a three-section draft form, moved advanced setup to
  the saved vacancy, added the server permission boundary, server-assigned
  cryptographic reference, reference-data-only loading, neutral defaults and
  active configured-reference validation
- **Result:** retained and materially simplified

## Review 053 — `/recruitment/vacancies/[id]`

- **Files:** `src/app/recruitment/vacancies/[id]/page.tsx`,
  `src/components/recruitment/VacancyLifecycleActions.tsx`
- **User:** authorised staff working from one vacancy source record
- **Job:** read the approved specification and setup, understand its pipeline
  and take the next permitted lifecycle action
- **Decision:** retain as the vacancy operating record
- **Why it earns the page:** every application, approval and advert action needs
  one stable role record and reference
- **Copy:** role facts, setup and next action; removed “control panel” and broad
  “accountable work” language
- **Access:** record scope plus state- and role-specific capabilities
- **Primary action:** edit/submit while draft, review in Approvals if assigned,
  publish after approval, or operate an open advert
- **Problems found:** every viewer saw edit, approve, publish, pause and close;
  the client guessed an action from partial state; vacancy approval had a second
  competing endpoint; draft application counts leaked; specifications could be
  edited after approval without invalidating that approval; pausing required no
  recorded reason
- **Changes made:** rebuilt a server-scoped record, excluded drafts, separated
  specification/setup/status, renders only explicit capabilities, made
  Approvals the sole decision page, freezes edits outside draft and requires a
  pause reason
- **Result:** retained and materially redesigned

## Review 054 — `/recruitment/vacancies/[id]/edit`

- **Files:** `src/app/recruitment/vacancies/[id]/edit/page.tsx`,
  `src/components/recruitment/EditVacancyForm.tsx`
- **User:** an authorised officer preparing a vacancy draft
- **Job:** finish the role specification, selection templates, application
  questions and document requirements before approval
- **Decision:** retain for drafts only
- **Why it earns the page:** the short create flow needs one deliberate setup
  step before approval; published records must not remain an editable form
- **Copy:** four clear sections tied to candidate and selector use
- **Access:** server update-permission boundary and draft-state check, repeated
  at the API
- **Primary action:** save changes, then return to the vacancy to submit it
- **Problems found:** the page was available beyond draft state, repeated the
  giant creation form, fetched all vacancies for options, exposed conditional
  question complexity and duplicate file-question/document mechanisms; the API
  accepted arbitrary question types, duplicate/unconfigured document types and
  client-supplied file rules
- **Changes made:** rebuilt a draft-only four-section editor, uses
  reference-data-only loading, removed conditional and file questions, added
  required/optional document choices, validates question configurations and
  derives file rules from active document-type configuration on the server
- **Result:** retained and materially simplified

## Review 055 — `/recruitment/vacancies/[id]/applications`

- **Previous file:** `src/app/recruitment/vacancies/[id]/applications/page.tsx`
- **User:** staff opening the applicants for one vacancy
- **Job:** filter the main application register to one vacancy
- **Decision:** remove as a duplicate page
- **Why it does not earn a page:** it was a smaller, weaker copy of the
  Applications register without paging, filtering, saved views or bulk
  operations
- **Replacement:** permanent redirect to
  `/recruitment/applications?vacancyId=[id]`
- **Problems found:** duplicate client data loading and access handling,
  unpaginated results, weaker presentation and draft applications returned by
  the shared API
- **Changes made:** removed the route, preserved old links through a parameter
  redirect, made the vacancy filter visible/clearable in the main register and
  excluded candidate drafts at the shared API boundary
- **Result:** removed and consolidated

## Review 056 — `/recruitment/applications`

- **Files:** `src/app/recruitment/applications/page.tsx`,
  `src/components/recruitment/ApplicationsRegister.tsx`
- **User:** recruitment operations across all authorised applications, plus
  assigned hiring-manager/panel readers
- **Job:** find, filter and open an application; authorised operations may
  select records for controlled bulk work or assisted entry
- **Decision:** retain as the single application register
- **Why it earns the page:** vacancy, candidate, email, reference and stage
  search across the whole authorised scope cannot be replaced by a vacancy
  page or dashboard
- **Copy:** a direct register description and explicit filter results
- **Access:** server read boundary; selection, bulk actions and assisted entry
  require `application.stage.change`
- **Primary action:** find and open a record
- **Problems found:** client-only access presentation, private draft stages in
  the API/filter, recruitment mutations displayed to read-only staff, duplicate
  vacancy list page, browser-only saved views/density controls that added weight
  without helping the team, assisted entry stored the complete linked user
  record in its application snapshot, omitted the formal application reference
  and treated every vacancy question as plain text
- **Changes made:** added server role/capability resolution, excluded drafts,
  consolidated vacancy filtering, hides mutation selection for readers and
  removed local-only view preferences; assisted entry now snapshots only the
  candidate profile and application evidence, issues a formal reference,
  renders typed questions, handles conditional questions, reports failures and
  refuses legacy file-question applications that it cannot safely attach
- **Result:** retained and materially simplified

## Review 057 — `/recruitment/applications/[id]`

- **Files:** `src/app/recruitment/applications/[id]/page.tsx`,
  `src/app/api/recruitment/applications/[id]/route.ts`,
  `src/app/api/recruitment/applications/[id]/stage/route.ts`
- **User:** recruitment staff responsible for the case, an assigned hiring
  manager or reviewer, an assigned panel reader, or an authorised auditor
- **Job:** understand one application, review the evidence and perform only the
  next action owned by that user
- **Decision:** retain as the canonical application record
- **Why it earns the page:** a register cannot safely hold the submitted
  profile, answers, documents, screening evidence and case history for one
  person
- **Copy:** factual record labels, direct empty states and evidence-based action
  prompts; removed “objective”, “protocol” and generic governance language
- **Access:** record-level assignment check plus separate capability flags for
  stage movement, eligibility, scoring, case administration, messages, export,
  audit and joining handover
- **Primary action:** review the submitted evidence and take the valid next step
- **Problems found:** an 866-line everything-screen; live candidate data was
  called a submission snapshot; panel and read-only users saw actions they could
  not perform; the fixed stage menu omitted valid transitions and offered
  invalid ones; reasons were optional; ERP handover appeared at every stage;
  message, approval and audit interfaces duplicated their canonical pages;
  application answers displayed raw JSON; audit history was returned without
  enforcing `audit.read`; direct links could expose unsubmitted drafts; and
  non-global reviewers received unnecessary candidate and supervisor contact
  fields
- **Changes made:** rebuilt the record around status, submitted evidence, next
  action and activity; returns an explicitly sanitised submission-time profile;
  formats typed answers; exposes clean document links; derives the stage menu
  from the state machine; requires reasons; hides each action by capability;
  restricts audit retrieval; strips contact and supervisor data for scoped
  readers; refuses draft records; limits handover to joining stages; and links
  to the communications and audit workspaces instead of reproducing them
- **Result:** retained and rebuilt

## Review 058 — `/recruitment/applications/[id]/handover`

- **Files:** `src/app/recruitment/applications/[id]/handover/page.tsx`,
  `src/app/api/recruitment/applications/[id]/handover-summary/route.ts`,
  `src/app/api/recruitment/applications/[id]/resumption/route.ts`,
  `src/app/api/recruitment/applications/[id]/erp-transfer/route.ts`
- **User:** the recruitment officer completing routine joining administration;
  the HR manager handles adverse start-date outcomes
- **Job:** confirm what happened on the agreed start date, then record the
  employee number created in FRAD’s ERP
- **Decision:** retain as a short, sequential joining handover
- **Why it earns the page:** resumption is the evidence gate between recruitment
  and the employee system; it must not be reduced to an unchecked status change
- **Copy:** “Joining handover”, “Record the start-date outcome” and “Record the
  ERP employee number”; removed protocol, clearance and manual-processing
  theatre
- **Access:** ERP-transfer permission at the page data boundary,
  resumption-confirm permission for outcomes, and HR-manager role for
  did-not-resume or withdrawal
- **Primary action:** record verified resumption, then complete the ERP handover
- **Problems found:** the page always claimed “ready to resume”; appeared before
  readiness; offered manager-only adverse outcomes to officers; used the actual
  start-date field for a postponed planned date; selected an arbitrary offer;
  ignored ERP errors; reused one idempotency key across edited attempts; allowed
  duplicate entry after completion; exposed document metadata it only needed to
  count; and omitted stage history when completing ERP transfer
- **Changes made:** rebuilt a two-step workflow with a visible three-step
  progress line; restricts the page to ready/resumed/transferred records; shows
  only accepted offer data and the latest planned date; separates actual and
  revised planned dates; gives routine outcomes to recruitment officers and
  adverse outcomes to the HR manager; returns only a verified-document count;
  surfaces API errors; locks completed handovers; uses a fresh retry-safe key
  for each ERP submission; and writes the final stage-history event
- **Result:** retained and rebuilt

## Review 059 — `/recruitment/accommodations`

- **Files:** `src/app/recruitment/accommodations/page.tsx`,
  `src/components/admin/AccommodationManager.tsx`,
  `src/app/api/recruitment/accommodations/route.ts`
- **User:** recruitment officers arranging candidate adjustments and the HR
  manager making the accountable decision
- **Job:** receive a confidential request, agree what FRAD can provide and
  confirm that the adjustment is ready
- **Decision:** retain as a restricted queue
- **Why it earns the page:** adjustment details must be kept away from selectors
  and panels while still being available to the small HR team responsible for
  delivery
- **Copy:** direct terms used by the team—request, response, agreed adjustment
  and ready; no governance or workflow slogans
- **Access:** recruitment officer and HR manager only; officers start review and
  fulfil agreed arrangements, while approval, partial approval and decline are
  HR-manager decisions
- **Primary action:** take the next valid action on the oldest request
- **Problems found:** fulfilling an adjustment overwrote the HR manager’s
  original decision, reviewer and review date; failure messages were announced
  as successful status updates; the fulfilment dialog described a new decision
  rather than delivery evidence; and the queue had no route back to the related
  application
- **Changes made:** preserves the decision and manager review record when an
  officer confirms delivery, retains the fulfilment note in audit, announces
  API failures as errors, uses fulfilment-specific wording and links each
  request to its application record
- **Result:** retained and corrected

## Review 060 — `/recruitment/approvals`

- **Files:** `src/app/recruitment/approvals/page.tsx`,
  `src/app/recruitment/approvals/layout.tsx`,
  `src/app/api/recruitment/approvals/route.ts`
- **User:** the person independently assigned to decide a vacancy, selection or
  offer, plus a requester returning evidence for a condition
- **Job:** inspect the source record and record an approval, conditions, a
  return or a rejection
- **Decision:** retain as the single decision inbox
- **Why it earns the page:** assigned, independent approvals cut across vacancy,
  selection and offer work; placing buttons on each source page would obscure
  the approver’s queue and weaken separation of duties
- **Copy:** “Items awaiting your decision” and direct decision labels; removed
  the “independent decisions” eyebrow and decorative quoted justification
- **Access:** route-level staff-role boundary; the API returns only approvals
  assigned to the current approver or condition evidence assigned back to the
  requester; system-admin accounts are excluded
- **Role ownership:** vacancy approval is HR-manager only; selection approval
  may be assigned to an independent hiring manager, HR manager or approver and
  uses a second independent stage; offer approval is HR manager or approver;
  recruitment officers can submit work and answer conditions but cannot approve
  it
- **Primary action:** open the source record, inspect the evidence and decide
- **Problems found:** the queue did not show enough evidence to approve safely:
  offer compensation and terms, vacancy staffing details, and selection scores
  and reference position were absent; source records were not linked; any
  signed-in role could load the empty workspace; and return, reject and
  conditional approval dialogs allowed an empty reason even though the API
  rejected it
- **Changes made:** added role-gated layout protection, source-record links and
  resource-specific evidence grids; highlights ranking overrides; separates
  summaries, conditions and reasons; and requires a written reason for every
  non-approval outcome
- **Result:** retained and materially strengthened

## Review 061 — `/recruitment/assessments`

- **Files:** `src/app/recruitment/assessments/page.tsx`,
  `src/components/admin/AssessmentManager.tsx`,
  `src/components/admin/AssessmentAnswerReview.tsx` and the assessment
  create, edit, invite, answer-review, mark and reset routes
- **User:** recruitment officers running assessments; the HR manager has the
  same operational capability but is not required for routine invitations or
  marking
- **Job:** invite a shortlisted candidate, review submitted work, record a
  defensible result and manage the vacancy’s assessment when necessary
- **Decision:** retain as one assessment workspace; do not create separate
  configuration pages
- **Why it earns the page:** timed online work, offline assessment evidence and
  attempt control share one candidate-assessment record and need a coherent
  operational queue
- **Copy:** direct invitation, marking and attempt language; no “AI assessment”
  or automated-decision claims
- **Access:** `assessment.manage`, assigned to recruitment officers and HR
  managers; not system admin, hiring manager or panel-member work
- **Primary action:** invite or mark; settings and creation are secondary
  disclosed sections
- **Problems found:** an 883-line manager displayed every configuration and
  operation at once, followed by a duplicate assessment list; applications
  could receive multiple active assessments despite a single assessment state
  in the application workflow; invitations could partly commit, resend or be
  sent after closing; assessment setup excluded draft and scheduled vacancies
  but the API accepted cancelled ones; online outcomes could be typed
  independently of saved question marks; online and offline result fields were
  mixed; and number questions were marked inconsistently
- **Changes made:** puts invite and mark work first and moves create/edit behind
  deliberate disclosure; removes the duplicate list; allows assessment design
  during vacancy preparation; prevents configuration on closed-out vacancies;
  enforces one active assessment per application; makes invitations atomic and
  blocks closed assessments; separates offline evidence fields; validates
  online question configuration; auto-marks number questions consistently; and
  derives the final online percentage from the stored per-question marks
- **Result:** retained and materially simplified

## Review 062 — `/recruitment/audit`

- **File:** `src/app/recruitment/audit/page.tsx`
- **User:** an authorised recruitment auditor or the HR manager; technical
  system-admin accounts use the administration governance area instead
- **Job:** establish who changed a recruitment record, when, what was recorded
  before and after, and why
- **Decision:** retain as a searchable evidence log
- **Why it earns the page:** stage history on an application is not a substitute
  for cross-resource, actor-level evidence across vacancies, applications,
  offers, approvals and restricted operations
- **Copy:** “Audit log” and a direct statement of the question the page answers;
  removed the generic “Accountability” eyebrow and immutable-record prose
- **Access:** `audit.read`; system-admin accounts are redirected to technical
  governance rather than being treated as recruitment auditors
- **Primary action:** search by exact record ID or narrow by type, action, actor
  and date
- **Problems found:** the page always showed only the latest 50 events, ignored
  record filters linked from application pages, loaded the complete actor user
  row, showed no before/after evidence, had no paging and mixed technical admin
  with recruitment audit access
- **Changes made:** added exact record, type, action, actor and date filters;
  added bounded pagination; selects only actor email; shows bounded before/after
  JSON on demand; redacts secret-, token-, credential-, MFA- and password-like
  keys; and separates technical-admin governance from recruitment audit
- **Result:** retained and rebuilt

## Review 063 — `/recruitment/communications`

- **Files:** `src/app/recruitment/communications/page.tsx`,
  `src/app/api/messages/route.ts`, `src/components/shared/MessageComposer.tsx`,
  `src/lib/notifications.ts`
- **User:** recruitment officers handling candidate contact; the HR manager can
  also read restricted HR threads
- **Job:** find an application conversation, reply in context and check whether
  its email notification was sent
- **Decision:** retain as the HR-owned candidate inbox
- **Why it earns the page:** an application record should link to its
  conversation, but a recruitment team also needs one cross-application inbox
  and delivery view
- **Copy:** “Candidate messages”, “Email delivery”, “Conversations” and concrete
  sender/delivery labels; no governed-communications or encrypted-outbox
  marketing copy
- **Access:** recruitment officer and HR manager only; assigned hiring managers,
  reviewers, panels, auditors and system admins cannot send candidate messages;
  restricted threads additionally require restricted-preboarding access
- **Primary action:** search or open an application conversation and reply
- **Problems found:** restricted threads were returned to recruitment officers;
  auditors could read candidate messages; assigned hiring managers/reviewers
  could contact candidates; the application-record filter was ignored; UUID
  ordering was treated as chronology; sender identity and attachments were
  missing; delivery totals included unrelated account/system email; an
  application with no thread had no way to send the first message; notification
  outbox rows were not linked back to the application; and draft applications
  could be targeted through a crafted request
- **Changes made:** enforces the HR operations boundary at page and message API;
  filters restricted threads by permission; implements application and text
  search; sorts loaded threads by their latest message; identifies candidate
  and staff senders; restores attachment links; limits delivery health to
  application-linked email; supports the first message for an application;
  records the application ID on message-notification outbox rows; and rejects
  draft application messaging
- **Result:** retained and rebuilt

## Review 064 — `/recruitment/complaints`

- **Files:** `src/app/recruitment/complaints/page.tsx`,
  `src/components/admin/ComplaintCaseManager.tsx`,
  `src/app/api/recruitment/complaints/route.ts`,
  `src/lib/complaint-workflow.ts`
- **User:** recruitment officers triaging and investigating cases; the HR
  manager makes the final closure decision
- **Job:** prioritise a complaint or appeal, keep internal investigation notes,
  update the reporter, record the resolution and close the file
- **Decision:** retain as a restricted case-management workspace, separate from
  ordinary candidate messages
- **Why it earns the page:** complaints, appeals, safeguarding and privacy
  concerns require restricted access, ownership, due dates, internal notes and
  a formal resolution record
- **Copy:** “Complaints and appeals”, “Triage new cases” and direct case-action
  labels; removed generic case-management language
- **Access:** `complaint.manage` for recruitment officers and HR managers;
  officers can triage, investigate and resolve, while only the HR manager can
  close the completed case
- **Primary action:** take the next valid action on the highest-severity,
  earliest-due open case
- **Problems found:** priority was sorted alphabetically, not by severity; all
  statuses were offered from every state; closed cases could be moved backwards;
  closing overwrote the resolution and erased its date; the stated final
  response was not emailed; comments did not identify staff versus reporter;
  the application link was an opaque UUID; and open and closed records were
  mixed in one unbounded list
- **Changes made:** introduced one complaint state machine shared by UI and API;
  locks closed records; preserves resolution and resolution date on closure;
  requires the manager for closure; emails the recorded resolution through the
  application-linked outbox; labels internal, staff-shared and reporter
  comments; links the related application by candidate and vacancy; sorts by
  severity then due date; and adds open/closed views plus case search
- **Result:** retained and rebuilt

## Review 065 — `/recruitment/insights`

- **Files:** `src/app/recruitment/insights/page.tsx`,
  `src/app/recruitment/reports/page.tsx`,
  `src/components/recruitment/RecruitmentInsightsOverview.tsx`
- **User:** staff who can export recruitment reports
- **Job:** understand recruitment performance and identify records that need
  attention
- **Decision:** remove as a separate destination and consolidate into Reports
- **Why it does not earn a page:** it presented the same operational measures
  now shown in the Reports overview, while Decision Quality already owns
  selection-risk checks. A third analytics label made navigation harder without
  giving staff a different task.
- **Copy:** no standalone page copy; old links now open the Reports overview
- **Access:** inherited from Reports through `report.export`
- **Primary action:** none on the alias; the Reports overview links each measure
  to the underlying work
- **Problems found:** duplicate analytics destinations, unclear boundary between
  Insights, Reports and Decision Quality, and an unnecessary item in the
  recruitment information architecture
- **Changes made:** replaced the page with a server redirect to
  `/recruitment/reports?view=overview`; removed it as an independent product
  concept while retaining bookmark compatibility
- **Result:** removed as a standalone page; permanent function consolidated
  into Reports

## Review 066 — `/recruitment/interviews`

- **Files:** `src/app/recruitment/interviews/page.tsx`,
  `src/components/admin/InterviewManager.tsx`,
  `src/components/admin/InterviewCoordinationActions.tsx`,
  `src/app/api/recruitment/interviews/route.ts`,
  `src/app/api/recruitment/interviews/[id]/route.ts`,
  `src/app/api/recruitment/interviews/[id]/invite/route.ts`,
  `src/app/api/recruitment/interviews/[id]/scores/route.ts`
- **User:** recruitment officers coordinating interviews, HR managers handling
  exceptions, and assigned panel members completing independent scorecards
- **Job:** schedule an interview, send the candidate invitation, resolve
  coordination issues, collect structured evidence and confirm the panel outcome
- **Decision:** retain as the single interview coordination and scoring workspace
- **Why it earns the page:** interviews require a shared schedule plus
  assignment-specific scorecards; neither the application record nor a generic
  work queue can support that interaction clearly on its own
- **Copy:** direct operational labels such as “Needs action”, “Save interview”,
  “Send invitation” and “Submit scorecard”; removed record-count copy,
  dashboard back-linking and the misleading “Schedule and invite” action
- **Access:** recruitment officers and HR managers coordinate; assigned panel
  members see and score only their interviews; the panel chair confirms the
  completed outcome; HR managers alone resolve conflict exceptions and reopen
  submitted scores
- **Primary action:** complete the scorecard or coordination task in the
  “Needs action” view
- **Problems found:** the setup form dominated the page; old interviews appeared
  before current work; HR coordination, personal scorecards and history were
  mixed together; hiring-manager permission was interpreted as access to every
  interview and candidate; scheduling prematurely changed the candidate stage
  and claimed to send an invitation; the same application could receive
  duplicate active interviews; scorecards could be submitted before the
  interview; the detail API returned the candidate’s full profile and contact
  record to panel members; rescheduling displayed UTC as if it were local time;
  and conflict/reopen controls were offered to officers whose endpoints rightly
  reserved them for the manager
- **Changes made:** introduced Needs action, Upcoming and History views; moved
  setup behind a compact disclosure; rebuilt interview and scorecard surfaces;
  limited coordination to recruitment HR roles and panel work to assignments;
  separated internal scheduling from candidate invitation; writes stage history
  and application-linked email only on invitation; prevents duplicate active
  interviews and past scheduling; opens scoring at the interview start; selects
  only the candidate evidence needed by the page and redacts contact details
  from panel API responses; handles browser-local rescheduling correctly; and
  shows manager-only exception controls only to the HR manager
- **Result:** retained and rebuilt

## Review 067 — `/recruitment/offers`

- **Files:** `src/app/recruitment/offers/page.tsx`,
  `src/components/admin/OfferManager.tsx`,
  `src/components/admin/OfferCorrection.tsx`,
  `src/app/api/recruitment/offers/route.ts`,
  `src/app/api/recruitment/offers/[id]/route.ts`,
  `src/app/api/recruitment/offers/[id]/actions/route.ts`,
  `src/app/api/recruitment/offers/[id]/preview/route.ts`,
  `src/lib/offer-document.ts`, `src/lib/simple-pdf.ts`
- **User:** recruitment officers preparing and issuing offers; HR managers
  withdrawing or correcting controlled terms; assigned approvers deciding in
  the separate Approvals workspace
- **Job:** prepare terms from an approved selection, preview the exact letter,
  obtain independent approval, issue the final PDF and follow the response
- **Decision:** retain as the offer operations workspace, not an approval inbox
- **Why it earns the page:** an offer is a versioned candidate document with
  terms, deadlines, delivery and response state; it needs a focused document
  workflow beyond the application record
- **Copy:** “Offers”, “Prepare an offer”, “Offers in progress”, “Preview PDF”
  and direct status language; removed the generic offer-process eyebrow,
  record-count decoration and embedded approval wording
- **Access:** recruitment officers and HR managers prepare, correct and send;
  HR managers alone withdraw; approval remains with the independently assigned
  HR manager/approver in `/recruitment/approvals`
- **Primary action:** issue an approved offer, or prepare one for an approved
  selection
- **Problems found:** the page duplicated the approval decision; preparers and
  approvers could not inspect the candidate-facing letter before approval; a
  flat all-time table mixed pending work with history; preparation trusted
  client-supplied position, duty station and contract type; an internal schedule
  was not tied explicitly to an approved selected outcome; acceptance deadlines
  could fall after the start date; correcting or withdrawing an offer left
  obsolete approval tasks open; corrections to issued offers silently removed
  the candidate’s visible document; notification outbox rows lacked the
  application link; the PDF used generic slogan copy; and crude pagination
  stranded the signature block alone on a second page
- **Changes made:** split in-progress work from history and prioritised approved
  letters ready to issue; moved preparation behind a compact disclosure;
  removed approval controls from this page; added an access-controlled draft
  PDF preview to the offer and approval records; derives role terms from the
  approved vacancy and verifies the approved selection/template; validates
  future dates and deadline order; closes superseded approval tasks; notifies a
  candidate when an issued letter enters correction; links offer notifications
  to the application; gives mutations idempotency keys; and rebuilt the
  candidate PDF with restrained FRAD document styling and measured A4
  pagination
- **PDF verification:** generated a representative draft, rendered it with
  Poppler and inspected the page image; verified one A4 page, legible hierarchy,
  no clipping or orphaned signature block, correct header/footer/page number,
  and no broken glyphs or unresolved placeholders in extracted text
- **Result:** retained and rebuilt

## Review 068 — `/recruitment/operations`

- **Files:** `src/app/recruitment/operations/page.tsx`,
  `src/app/recruitment/work/page.tsx`
- **User:** recruitment officers and HR managers
- **Job:** act on overdue or blocked recruitment work
- **Decision:** remove as a separate destination and consolidate into My Work
- **Why it does not earn a page:** “Operations” described an organisational
  area, not a user task. Its actionable content is the same overdue work already
  owned by `/recruitment/work`.
- **Copy:** no standalone page copy; old links open the overdue My Work view
- **Access:** inherited from the work queue
- **Primary action:** none on the alias; My Work provides the record-level next
  actions
- **Problems found:** duplicate queue/dashboard concepts and an abstract route
  name that did not tell staff what they could do there
- **Changes made:** retained a server redirect to
  `/recruitment/work?attention=overdue` for bookmark compatibility and removed
  Operations from the product information architecture
- **Result:** removed as a standalone page; function consolidated into My Work

## Review 069 — `/recruitment/preboarding`

- **Files:** `src/app/recruitment/preboarding/page.tsx`
- **User:** recruitment officers reviewing candidate submissions and HR managers
  overseeing clearance
- **Job:** identify the preboarding records that need HR action or may miss their
  start date, then open the right record
- **Decision:** retain as the preboarding work register
- **Why it earns the page:** preboarding has its own candidate requirements,
  due dates, readiness checks and planned-start risk after the recruitment
  selection pipeline is complete
- **Copy:** “Preboarding”, “Needs attention”, “HR review due”, “Start date at
  risk” and “Open record”; removed the abstract “New starter readiness”
  headline, dynamic record-count prose and dashboard back link
- **Access:** recruitment officers and HR managers with `preboarding.manage`;
  technical administrators and non-operational staff are excluded
- **Primary action:** open the highest-risk record in Needs attention
- **Problems found:** newest records appeared first regardless of urgency; there
  were no actionable, active or completed views; candidate work and HR review
  were indistinguishable; imminent start-date risk was not surfaced; there was
  no search; the query loaded complete candidate profiles; and a 100-record cap
  silently hid older cases
- **Changes made:** added Needs attention, All active and Ready/completed views;
  calculates overdue requirements, open mandatory checks, HR-review state and
  fourteen-day start risk; sorts risks before ordinary work and earliest starts
  first; adds candidate/vacancy/reference search; selects only the identity and
  readiness fields the register displays; expands the bounded register to 250;
  and keeps confidential requirement detail inside the record page
- **Result:** retained and rebuilt

## Review 070 — `/recruitment/preboarding/[id]`

- **Files:** `src/app/recruitment/preboarding/[id]/page.tsx`,
  `src/app/recruitment/preboarding/layout.tsx`,
  `src/app/api/recruitment/preboarding/[id]/route.ts`,
  `src/app/api/recruitment/preboarding/[id]/manage/route.ts`,
  `src/app/api/recruitment/preboarding/clearance/route.ts`,
  `src/app/api/assets/download/[id]/route.ts`
- **User:** recruitment officers reviewing ordinary submissions and maintaining
  first-day arrangements; HR managers making waiver and final-clearance decisions
- **Job:** review submitted evidence, resolve the next blocker and clear the
  starter only when every required check is complete
- **Decision:** retain as the individual preboarding evidence and clearance record
- **Why it earns the page:** the record joins versioned candidate evidence,
  embedded learning results, policy signatures, tasks, meetings, readiness
  checks and the accountable clearance decision
- **Copy:** “Submitted items”, “Open the evidence”, “Readiness checks”, “Final HR
  clearance” and “First-day arrangements”; removed the abstract “Offer and
  start” eyebrow, “candidate starting record”, success exclamation copy and
  equal-weight administrative panel descriptions
- **Access:** route-level restriction to recruitment officers and HR managers;
  officers review routine evidence and arrangements; only the HR manager records
  readiness waivers and final clearance; restricted evidence still requires the
  separate restricted-preboarding permission
- **Primary action:** open and decide the oldest submitted evidence item, then
  complete final clearance when no evidence-derived check remains
- **Problems found:** every feature was presented at the same visual weight;
  package assignment appeared before submitted evidence; staff could approve
  documents without a visible file and forms without visible answers; readiness
  checks derived from evidence could be manually passed or failed, allowing
  clearance to bypass the source evidence; final clearance included an inline
  waiver of the final review itself; clearance updates were non-transactional,
  lacked locking and stage history, and did not notify the candidate; closed
  records still exposed mutation controls; task evidence, signed policies and
  course certificates were blocked by the file-download relationship check;
  unrestricted API responses loaded the complete candidate profile; meetings
  could be scheduled in the past; and reporting information already sent to the
  candidate was not displayed
- **Changes made:** rebuilt the record around a submitted-evidence queue with
  form answers and scoped file links; disables document approval when no file is
  present; shows embedded course score and attempt history rather than accepting
  uploaded completion claims; makes derived readiness checks read-only; limits
  waivers to separately reasoned manager actions; turns final HR review into one
  locked transactional clearance after all other checks pass; writes
  application stage history and sends an application-linked candidate
  notification; hides mutations on closed records; extends scoped asset access
  to task evidence, signed policy copies and certificates; selects only the
  candidate identity the record needs; rejects past meetings; shows existing
  information and meetings; and moves package/configuration tools behind
  disclosures
- **Course assurance:** preboarding learning is embedded in the candidate
  service. Content progress, quiz attempts, pass mark, score and completion are
  persisted by the platform. This provides stronger completion evidence than a
  candidate-uploaded certificate; uploads are not used as the completion source
  of truth.
- **Result:** retained and rebuilt

## Review 071 — `/recruitment/quality`

- **Files:** `src/app/recruitment/quality/page.tsx`,
  `src/components/admin/CandidateMergeManager.tsx`
- **User:** recruitment officers resolving record issues, HR managers reviewing
  exceptions/merges, and authorised auditors inspecting decision evidence
- **Job:** correct incomplete source records, inspect like-for-like scoring
  differences, review ranking exceptions and resolve possible duplicate people
- **Decision:** retain as the active decision and record-quality review workspace
- **Why it earns the page:** Reports describes aggregate performance and
  Approvals owns assigned decisions; this page identifies cross-record
  exceptions that must be investigated before those decisions are reliable
- **Copy:** “Decision review”, “Record checks”, “Scoring and overrides” and
  “Duplicate records”; removed generic summary labels and avoids describing a
  scoring difference as an error
- **Access:** recruitment officers and HR managers; authorised report/audit users
  may inspect checks, while candidate merging remains restricted to recruitment
  HR and manager approval
- **Primary action:** open the source record behind an active quality check
- **Problems found:** the screenshot’s large card grid gave empty and populated
  measures equal visual weight; three separate jobs were presented in one long
  page; summary numbers such as total reviews/reopens had no next action;
  average score by reviewer compared different candidate pools and could support
  invalid conclusions about individual reviewers; old interview differences
  remained indefinitely; pending-offer checks treated returned drafts as
  missing approvals; and heavy scoring queries were unbounded
- **Changes made:** replaced the summary boxes with task-specific navigation;
  separated record checks, scoring/ranking review and duplicate resolution;
  replaced reviewer averages with within-candidate score ranges linked to the
  application; explains that variance is a prompt for evidence review, not proof
  of error; limits interview variance to panels awaiting confirmation; excludes
  returned offer drafts from missing-approval checks; and bounds active
  scorecard, interview and override evidence
- **Result:** retained and rebuilt

## Review 072 — `/recruitment/references`

- **Files:** `src/app/recruitment/references/page.tsx`,
  `src/components/admin/ReferenceManager.tsx`,
  `src/app/public/reference/[token]/page.tsx`,
  `src/app/api/public/reference/submit/route.ts`,
  `src/app/api/recruitment/applications/[id]/referees/route.ts`,
  `src/app/api/recruitment/reference-responses/[id]/verify/route.ts`,
  `src/app/api/recruitment/referees/[id]/send-request/route.ts`,
  `src/app/api/recruitment/referees/[id]/send-reminder/route.ts`,
  `src/lib/references.ts`
- **User:** recruitment officers collecting and reviewing references; HR
  managers approving the exceptional decision to waive a reference
- **Job:** obtain factual evidence from an authorised referee, review it and
  record FRAD’s assessment before selection progresses
- **Decision:** retain as the reference-check work queue and evidence review
- **Why it earns the page:** reference collection involves an external secure
  response, expiry/reminder handling, confidential evidence and a staff-owned
  assessment that cannot be reduced to an application-list action
- **Copy:** “References”, “Needs action”, “Response ready to review”, “Review
  referee’s answers” and “FRAD assessment”; removed generic record-count copy,
  the “Reference Checks” title and vague success/failure messages
- **Access:** recruitment officers and HR managers with `reference.manage`;
  ordinary collection and review belongs to the officer; only the HR manager
  may waive a required check
- **Primary action:** review the oldest received response and record the
  evidence-based FRAD outcome
- **Problems found:** the public referee form asked the referee to choose
  FRAD’s satisfactory/unsatisfactory outcome; the application adopted that
  unverified outcome immediately; staff could verify a response without seeing
  its answers; referee contact authority was silently submitted as true;
  requests were not ordered so the page could show an old request as current;
  action and completed records were mixed alphabetically; waivers appeared to
  all users despite server enforcement; sending a request advanced the
  application without stage history; and request/reminder emails were not
  linked to the application communication register
- **Changes made:** the referee now supplies facts only; received responses are
  stored as pending review and cannot affect the application outcome until an
  authorised staff member reads the answers, selects FRAD’s outcome and records
  a review note; application reference status is recalculated only from verified
  latest responses; the candidate’s authority to contact is an explicit required
  confirmation; latest requests are selected deterministically; needs-action
  and completed views replace the mixed list; received responses are prioritised
  and expanded with their evidence; only managers see the waiver option; the
  first reference transition writes stage history; and outbound reference
  messages carry the application ID
- **Result:** retained and rebuilt

## Review 073 — `/recruitment/reports`

- **Files:** `src/app/recruitment/reports/page.tsx`,
  `src/components/recruitment/RecruitmentInsightsOverview.tsx`,
  `src/components/admin/ReportScheduler.tsx`,
  `src/app/api/recruitment/reports/export/route.ts`,
  `src/app/api/recruitment/reports/schedules/route.ts`
- **User:** HR managers and recruitment officers monitoring service delivery;
  authorised auditors using controlled evidence exports
- **Job:** understand recruitment performance, download a specific operational
  register or schedule its delivery to an approved organisational mailbox
- **Decision:** retain, with three distinct views for performance, downloads and
  scheduled delivery
- **Why it earns the page:** management measures and cross-process statutory or
  operational registers span vacancies, applications, offers and preboarding;
  they do not belong inside any one case page
- **Copy:** “Recruitment performance”, “Time to shortlist”, “Starts at risk”,
  “Interview score ranges” and “Reasons recorded by candidates”; removed “At a
  glance”, “Close to shortlist”, the unrelated withdrawal-rate sentence under
  offer declines, and a generic catch-all service-check section
- **Access:** `report.export` opens the page; each restricted register is also
  checked against its complaint, audit, governance, reference, offer or
  preboarding permission for both immediate and scheduled exports
- **Primary action:** open the operational record behind an adverse current
  measure; downloads and schedules remain deliberate secondary views
- **Problems found:** the screenshot’s equal-weight card grid obscured priority;
  numerous loosely related activity counts did not support a management
  decision; current and period measures were presented under one period label;
  an open application stage was incorrectly included as a completed duration;
  numeric vacancy ages were sorted lexically; offer declines displayed the
  unrelated application-withdrawal rate; the page exposed restricted report
  links that the export API would reject; and scheduled-report permission checks
  were weaker than immediate-export checks
- **Changes made:** reduced the headline band to time to shortlist, overdue work,
  starts at risk and current delivery failures; distinguishes rolling-period
  measures from the current open position; removed system-automation, audit-touch
  and bulk-run counts from the management view; reports only closed stage
  intervals; fixes numeric vacancy-age ordering; clarifies score ranges as
  evidence for review rather than proof of error; aligns visible, immediate and
  scheduled report permissions; and retains the compact row-based register and
  scheduled-delivery designs rather than the screenshot’s oversized boxes
- **Visual verification:** source-level layout and interaction review completed;
  the connected browser surface was unavailable, so rendered browser inspection
  remains outstanding
- **Result:** retained and rebuilt

## Review 074 — `/recruitment/search`

- **Files:** `src/app/recruitment/search/page.tsx`,
  `src/components/admin/GlobalSearch.tsx`,
  `src/app/api/recruitment/search/route.ts`,
  `src/lib/search.ts`
- **User:** staff locating records within their existing vacancy/application
  access
- **Job:** find and open a candidate application or vacancy when the user has a
  name, contact detail, vacancy detail, application reference or ERP number
- **Decision:** retain as the cross-record finder
- **Why it earns the page:** applications, vacancies and ERP handovers have
  separate registers; one permission-scoped search avoids forcing staff to know
  which register contains a known identifier
- **Copy:** “Search”, “Search recruitment records”, “Results for…” and “No
  matching records”; removed “Global recruitment search”, dynamic “accessible”
  empty messages and the oversized list of every searchable field in the input
  placeholder
- **Access:** all authenticated recruitment staff, with application and vacancy
  results independently scoped by their all-record or assigned-record
  permissions; auditors do not receive candidate contact details
- **Primary action:** open the matching application or vacancy
- **Problems found:** links containing `?q=` opened an empty search form and did
  not run; search terms were lost from the URL; the indexed PostgreSQL path
  omitted vacancy title/context matches from application results and omitted
  project, department and station matches from vacancy results; email and
  alternate-phone matches were absent from the indexed application path; the
  empty-state panels appeared before any search; null contact fields were
  printed as interface text; and every result was rendered as a separate generic
  card
- **Changes made:** initialises and automatically runs a valid URL query; keeps
  subsequent searches in the address bar; extends the indexed path with
  vacancy-hit IDs plus email, phone and related vacancy context; retains
  permission scoping after ranking; shows empty state only after a search;
  renders withheld contact details as absent rather than “null”; and replaces
  generic cards with two compact, labelled result lists
- **Result:** retained and rebuilt

## Review 075 — `/recruitment/selections`

- **Files:** `src/app/recruitment/selections/page.tsx`,
  `src/components/recruitment/SelectionWorkspace.tsx`,
  `src/app/api/recruitment/selections/route.ts`,
  `src/lib/recruitment-scoring.ts`,
  `src/lib/recruitment-scoring.server.ts`
- **User:** recruitment officers preparing the selection record; HR managers
  may prepare when covering operational work, but independent hiring/HR
  approvers decide in the Approval queue
- **Job:** compare like-for-like recorded results for one vacancy and submit a
  reasoned proposed outcome for independent approval
- **Decision:** retain as the vacancy selection-preparation workspace, not an
  approval page
- **Why it earns the page:** this is the only place where the vacancy cohort,
  funded positions, comparable score components, ranking and proposed outcome
  must be considered together
- **Copy:** “Selection”, “Recorded results”, “Propose an outcome” and “Send for
  approval”; removed “Final candidate ranking”, “Record Final Selection
  Approval”, “matrix”, “objective evidence” boilerplate and the false implication
  that the person completing the form also approves it
- **Access:** recruitment officers and HR managers with stage-change permission;
  hiring managers, HR managers or appointed approvers receive independently
  assigned decisions in `/recruitment/approvals`; system administrators and
  non-operational roles cannot prepare selections
- **Primary action:** select one eligible candidate/outcome, record the reason
  and send it to the approval queue
- **Problems found:** the fully client-rendered page had no route-level role
  boundary; opening the page mutated and recalculated as many as 500
  applications; the ranking table exposed candidate email unnecessarily;
  returned, pending and approved decision states were not distinguished; the
  success copy tested for an API state that was never returned; the preparer
  action was labelled as approval; candidates missing a scoring component used
  for their peers could receive an inflated reweighted score and rank; ordinary
  decisions did not require any recorded reason; and a large pair of generic
  boxes obscured cohort comparison and accountability
- **Changes made:** added a server-rendered operational-role boundary; made GET
  read-only and left recalculation at the score-change/submit boundary; removed
  email from the selection payload and UI; returns the latest approval state;
  ranks only candidates with the same scoring components used by their vacancy
  cohort and rejects incomplete submissions server-side; requires a reason for
  every proposal and a longer reason for a funded-position override; links the
  candidate source record and Approval queue; and presents one vacancy at a time
  with a compact results table followed by the proposal form
- **Result:** retained and rebuilt

## Review 076 — `/recruitment/settings`

- **Files:** `src/app/recruitment/settings/page.tsx`,
  `src/components/shared/SecuritySettings.tsx`,
  `src/app/api/auth/mfa/route.ts`,
  `src/app/api/auth/sessions/route.ts`
- **User:** any staff member managing their own account
- **Job:** set up two-factor authentication, replace recovery codes and sign out
  unrecognised devices
- **Decision:** retain, but define it as personal account security rather than
  recruitment configuration
- **Why it earns the page:** these are high-consequence self-service account
  actions that need password/code confirmation and should not be mixed with
  vacancy or system configuration
- **Copy:** “Account security”, “Manage two-factor authentication, recovery codes
  and signed-in devices” and direct action labels; removed the access-warning
  paragraph and the unsupported claim that two-factor authentication is already
  mandatory for every staff account
- **Access:** any authenticated staff account; candidates use their broader
  candidate account-settings page; all data and mutations belong to the current
  user
- **Primary action:** set up two-factor authentication when it is not active, or
  inspect signed-in devices when it is
- **Problems found:** the page name could be mistaken for recruitment setup;
  a set-up button rendered while status was still loading and after failed
  status requests; failed initial requests were silent; network failures during
  actions could escape without a useful message; and the shared section bodies
  had no padding beneath their headings
- **Changes made:** narrowed the page language to personal security; introduced
  explicit loading and recoverable error states; prevents enrolment actions
  until status is known; catches action-level network failures; and restores
  consistent body spacing and device-list alignment
- **Result:** retained and corrected

## Review 077 — `/recruitment/talent-pools`

- **Files:** `src/app/recruitment/talent-pools/page.tsx`,
  `src/components/admin/TalentPoolManager.tsx`,
  `src/app/api/recruitment/talent-pools/route.ts`,
  `src/app/api/candidate/account/route.ts`
- **User:** recruitment officers maintaining future-candidate groups; HR
  managers may cover the same operational work
- **Job:** review a pool’s current members, add a suitable past candidate who
  consented to future contact, and remove a member with a recorded reason
- **Decision:** retain as a small consent-based rediscovery register
- **Why it earns the page:** future-opportunity membership has its own candidate
  consent, source-application, tagging and removal history; it should not be
  inferred from rejected candidates or held in an offline list
- **Copy:** “Talent pools”, “Pools”, “Members”, “Add candidates” and “Source
  application”; removed rediscovery/governance slogans, the large consent-count
  display and instructional prose that described the interface rather than the
  work
- **Access:** recruitment officers and HR managers with all-application access;
  auditors and technical administrators cannot manage pool membership
- **Primary action:** review the selected pool’s members; add a candidate only
  from the separate eligible-candidates view
- **Problems found:** the screenshot page never displayed the selected pool’s
  existing members, so it could not perform its stated management job; the
  selected pool was represented twice by a sidebar and a large dropdown;
  pool creation permanently occupied the most prominent space; every consenting
  profile appeared even without a relevant past application; adding a member did
  not verify that the pool was active or that the supplied source application
  belonged to that candidate; duplicate active pool names were allowed; removal
  was not available in the interface; and the generic empty panel consumed most
  of the viewport
- **Changes made:** rebuilt the page around a selected pool with member and
  add-candidate views; shows member count, skills and source application; adds
  reasoned removal; moves pool creation into a disclosure with purpose and
  description; filters discovery to active, consenting candidates with an
  eligible prior application; excludes existing members from discovery; adds
  search and possible-duplicate routing; restricts management to recruitment HR;
  validates active pool, candidate eligibility and source ownership server-side;
  prevents duplicate active names; and replaces the oversized empty canvas with
  compact task-specific empty states
- **Result:** retained and rebuilt

## Review 078 — `/admin/assessment-bank`

- **Files:** `src/app/admin/assessment-bank/page.tsx`,
  `src/app/recruitment/assessments/page.tsx`
- **User:** recruitment staff following an old assessment-bank bookmark
- **Job:** none that is distinct from the existing assessment workspace
- **Decision:** remove as a standalone destination and retain a compatibility
  redirect
- **Why it does not earn a page:** assessment definitions, invitations,
  submissions and marking already form one coherent job in Recruitment
  Assessments; a separate “bank” would split the same records between setup and
  operation
- **Copy:** no standalone interface or explanatory copy
- **Access:** inherited from Recruitment Assessments
- **Primary action:** none on the alias
- **Problems found:** the obsolete route redirected to the broad vacancy
  register, leaving a user looking for assessments at the wrong destination
- **Changes made:** redirects directly to `/recruitment/assessments`; it remains
  absent from administration navigation
- **Result:** removed as a standalone page

## Review 079 — `/admin/automations`

- **Files:** `src/app/admin/automations/page.tsx`,
  `src/components/admin/AutomationManager.tsx`,
  `src/app/api/admin/automations/route.ts`,
  `src/lib/automations.ts`
- **User:** recruitment officers monitoring and safely stopping scheduled work;
  HR managers deciding when paused/previewed schedules may resume
- **Job:** see which reminders and timed actions are running, place one into
  preview or pause it, and inspect recent run results
- **Decision:** retain as an operational safety control and run register
- **Why it earns the page:** scheduled messages and state changes span vacancies,
  applications, assessments, interviews, references, offers and preboarding;
  operators need one place to stop and inspect them
- **Copy:** “Scheduled work”, “Schedules”, “Preview”, “Pause”, “Resume” and
  “Recent runs”; removed “Automation controls”, “SLA escalation”, uppercase
  internal statuses and generic audit-record slogans
- **Access:** recruitment officers and HR managers may inspect and move a
  schedule into preview or pause; only the HR manager may reactivate work that
  can change records or send messages; system administrators are kept outside
  recruitment operations
- **Primary action:** investigate failed runs; pause an unsafe schedule or use
  preview before manager reactivation
- **Problems found:** thirteen equal-sized cards made the page long and hid
  failure evidence below the fold; an officer could reactivate every global
  message/state-changing schedule; the recent-run table had no empty state,
  exposed internal uppercase codes and made failures visually indistinct;
  loading and network failures were not represented reliably; and “SLA” added
  unnecessary jargon
- **Changes made:** replaced the card grid with a searchable, row-based schedule
  register; separates controls from the run log; highlights failure count and
  result status; adds loading, empty and caught network-error handling; gives
  preview/pause plain consequences; reserves resume for HR managers in both UI
  and API; and renames the overdue-work schedule in plain language
- **Result:** retained and rebuilt

## Review 080 — `/admin/configuration-releases`

- **Files:** `src/app/admin/configuration-releases/page.tsx`,
  `src/components/admin/ConfigurationReleaseManager.tsx`,
  `src/app/api/admin/configuration-releases/route.ts`,
  `src/lib/configuration-releases.ts`
- **User:** HR managers reviewing recruitment-configuration drafts and course
  administrators reviewing course drafts; the draft author may submit but may
  not approve their own change
- **Job:** compare a proposed version with the live record, decide it and
  publish immediately or let an approved future-dated release publish when due
- **Decision:** retain as the controlled configuration decision queue
- **Why it earns the page:** publishing templates, policies, forms, tasks,
  packages, scorecards and courses changes future candidate/staff records; the
  before/after comparison and second-person decision do not belong in the edit
  form
- **Copy:** “Review drafts”, “Needs action”, “Current”, “Proposed”, “Publish now”
  and “Publishes automatically…”; removed “Configuration releases”, the generic
  change-review eyebrow and audit-record boilerplate
- **Access:** HR managers see recruitment configuration entities; course
  administrators see courses; the draft owner submits, a different authorised
  user approves/rejects, and only eligible entity types are returned
- **Primary action:** compare every changed field and decide a pending draft
- **Problems found:** active and completed changes were mixed in one long card
  list; future-dated approved changes displayed “Publish when due” as a button
  even though clicking it only returned an API error; object values could render
  as `[object Object]`; malformed stored JSON could crash the entire page;
  loading and network failures were weakly handled; no-change drafts could enter
  the approval process; and section content lacked consistent inset spacing
- **Changes made:** separates needs-action from history; uses safe proposal/base
  parsing and readable structured values; replaces the unusable future publish
  button with the automatic publication date; adds loading, empty and caught
  network-error handling; rejects no-op drafts at creation; and restores a
  compact padded comparison card for each independent decision
- **Result:** retained and corrected

## Review 081 — `/admin/contract-types`

- **Files:** `src/app/admin/contract-types/page.tsx`,
  `src/components/admin/AdminCrud.tsx`,
  `src/app/api/admin/generic/route.ts`,
  `src/app/api/recruitment/vacancies/route.ts`,
  `src/lib/validation.ts`
- **User:** HR managers maintaining the choices used by recruitment officers
  when a vacancy is created
- **Job:** add, rename, describe, activate or retire a contract type without
  invalidating existing vacancy records
- **Decision:** retain as a small reference-data register
- **Why it earns the page:** contract type is validated against an active
  controlled list at vacancy creation and is later copied into the offer; it
  must not be free text
- **Copy:** “Contract types” and “Options available when a vacancy is created”;
  removed title case and the vague “employment and engagement categories”
  description
- **Access:** HR manager writes; recruitment staff receive active values through
  vacancy APIs but do not administer the list
- **Primary action:** add a genuinely new contract type; otherwise update its
  display name or deactivate it
- **Problems found:** inactive records were hidden from their own administration
  page, so the Active column could only say Yes and retired records could not be
  restored; changing a code already stored on vacancies would split historical
  and future reporting; the description field was editable but absent from the
  register; removal did not require or audit a reason; and the impact check did
  not count affected vacancies
- **Changes made:** the administration register now returns active and inactive
  records; shows description; reports linked vacancy count before removal;
  blocks changing an in-use code while allowing its human-readable name to
  change; and requires a reason for generic configuration removal, carrying it
  into the audit record
- **Result:** retained and corrected

## Review 082 — `/admin/courses`

- **Files:** `src/app/admin/courses/page.tsx`,
  `src/components/admin/AdminCrud.tsx`,
  `src/components/admin/ConfigurationBuilder.tsx`,
  `src/app/api/admin/generic/route.ts`,
  `src/app/api/admin/configuration-builder/route.ts`,
  `src/app/api/admin/configuration-releases/route.ts`,
  `src/app/api/candidate/preboarding/actions/route.ts`
- **User:** course administrators building learning and managing exceptional
  attempt resets; authorised reviewers publishing course metadata/activation
- **Job:** create an inactive course, add its modules and assessment, publish a
  complete version, and inspect/reset a candidate attempt only when required
- **Decision:** retain as the learning-definition and assurance workspace
- **Why it earns the page:** embedded content progress, assessment answers,
  attempt limits, pass marks and certificates are the platform’s completion
  evidence; this is materially stronger than asking candidates to upload a
  certificate
- **Copy:** “Courses”, “Learning assigned through a preboarding package”,
  “Course builder” and direct module/assessment terms; removed “Compulsory
  Courses”, generic structured-content instruction and inconsistent field
  capitalisation
- **Access:** users with `course.manage`; candidate assignment evidence is
  minimised to name, status, score and attempts; metadata activation remains a
  controlled draft requiring another authorised reviewer
- **Primary action:** choose an inactive course and add/verify its learning
  content before submitting activation
- **Problems found:** every new checkbox field defaulted true, allowing an empty
  course to be created active; activation did not require any learning material;
  published course structure could change in place; numeric settings accepted
  invalid ranges; quiz correct answers did not have to match supplied options;
  blank modules and invalid/non-HTTPS video values were accepted; opening the
  builder loaded unbounded candidate assignments for every course and returned
  complete candidate profiles; attempts occupied the main editor; upload and
  network failures could be silent; and the generic green builder treatment
  looked like a secondary prototype rather than the course workspace
- **Changes made:** supports per-field create defaults and makes new courses
  inactive; blocks direct creation as active and controlled activation without
  content or assessment; prevents in-place structural edits to published
  courses; validates duration, pass mark, attempt limits, module payloads, HTTPS
  video URLs and question answers; reduces candidate selects and bounds attempts
  to 100 per course; moves attempts behind a disclosure; catches configuration
  and upload failures; and promotes the builder to the standard product panel
- **Completion assurance:** assigned courses retain a version snapshot; the
  candidate service records each completed module, every submitted answer,
  attempt number, score, pass/fail result and completion time. Uploaded
  certificates are not accepted as the source of course completion.
- **Result:** retained and rebuilt

## Review 083 — `/admin/deletion-requests`

- **Files:** `src/app/admin/deletion-requests/page.tsx`,
  `src/components/admin/PrivacyRequestManager.tsx`,
  `src/app/api/admin/deletion-requests/route.ts`,
  `src/app/api/candidate/account/route.ts`
- **User:** system administrators acting as the restricted privacy-case
  reviewers; a different administrator completes the retention review for a
  successful appointment
- **Job:** assess an account-closure request, check holds and retained
  recruitment records, record the decision and anonymize eligible personal data
- **Decision:** retain as a restricted privacy case queue, separate from routine
  recruitment administration
- **Why it earns the page:** account closure is irreversible, spans files,
  messages, applications, offers and preboarding, and must stop when a legal
  hold or retention requirement applies
- **Copy:** “Account closure requests”, “Needs review”, “Independent review”,
  “Start retention review” and “Approve closure”; removed the ambiguous
  “legal-retention override” wording and generic deletion-card copy
- **Access:** system administrators only in both the server-rendered page and
  API; successful appointments require a second system administrator before
  anonymization; an active legal hold disables and blocks approval
- **Primary action:** resolve new eligible requests or send successful
  appointments for an independent retention decision
- **Problems found:** the list omitted request dates, candidate identity,
  application context, legal holds and the reason for prior decisions; all
  states were mixed together; the destructive control looked like an ordinary
  card action; the retention checkbox floated outside the modal and appeared
  for requests that did not need it; a direct non-admin visit rendered the page
  shell before the API failed; network failures collapsed into an empty list;
  and the first reviewer had to select a misleading “override” merely to request
  the required second review
- **Changes made:** replaces cards with an open/decided case register; exposes
  request time, application count, successful-appointment flag, legal-hold
  state and decision note; derives only the case fields needed by the client;
  adds server-side route protection, loading/retry/empty states and guarded
  destructive dialogs; makes the first action start a review automatically;
  and places the explicit retention confirmation inside the second reviewer’s
  decision
- **Result:** retained and rebuilt

## Review 084 — `/admin/departments`

- **Files:** `src/app/admin/departments/page.tsx`,
  `src/components/admin/AdminCrud.tsx`,
  `src/app/api/admin/generic/route.ts`,
  `src/app/api/recruitment/vacancies/route.ts`
- **User:** HR managers maintaining organisation choices; recruitment officers
  consume active choices when preparing a vacancy
- **Job:** keep the department list used by vacancy records, filters, exports and
  management reporting accurate
- **Decision:** retain as a compact reference-data register
- **Why it earns the page:** department is a required vacancy relationship and a
  core reporting dimension; inconsistent free text would fragment reports and
  candidate-facing vacancy information
- **Copy:** “Departments”, “Organisational units used on vacancies and in
  recruitment reporting”, “Department name” and “Reporting code”; removed the
  narrow “categorise vacancies” description
- **Access:** HR manager writes; other recruitment staff may read active values
  through the vacancy workflow
- **Primary action:** add a valid organisation unit or retire one that should no
  longer be available for new vacancies
- **Problems found:** the register did not show whether a department was already
  in use; the impact dialog did not count linked vacancies; an in-use reporting
  code could be changed, splitting stable exports and integrations; code format
  was not validated server-side; and the shared action used a destructive trash
  metaphor even though records with an Active field are only retired
- **Changes made:** shows linked vacancy count; validates a concise uppercase
  reporting code; prevents changing an in-use code while still allowing a name
  correction; adds vacancy impact to retirement; supports nested count columns
  in the shared register; and relabels the shared soft-delete action as Retire
- **Result:** retained and corrected

## Review 085 — `/admin/document-requirements`

- **Files:** `src/app/admin/document-requirements/page.tsx`,
  `src/components/admin/AdminCrud.tsx`,
  `src/app/api/admin/generic/route.ts`,
  `src/lib/preboarding.ts`, `src/lib/candidate-preboarding.ts`,
  `src/app/api/candidate/preboarding/actions/route.ts`
- **User:** HR managers defining reusable evidence checks for preboarding
  packages; candidates and HR reviewers consume frozen assignments
- **Job:** state what evidence is acceptable, how it is protected and whether it
  needs a future expiry date
- **Decision:** retain, but keep mandatory/optional assignment decisions in
  Preboarding packages
- **Why it earns the page:** one evidence definition can be reused across
  several packages while preserving file controls, candidate instructions,
  classification and review evidence
- **Copy:** “Document requirements”, “Instructions for the candidate”,
  “Accepted file types”, “Maximum file size” and “Access classification”;
  removed technical byte-entry language and the misleading claim that this page
  decides whether a package item is mandatory
- **Access:** HR manager writes; course and system administrators do not manage
  recruitment evidence; assigned candidates see the frozen version relevant to
  their own preboarding record
- **Primary action:** create a clear reusable evidence check, then assign it to
  the relevant package
- **Problems found:** Document type was free text despite an existing controlled
  type register; “Required” duplicated the package-level choice; “HR review
  required” was not honoured because document completion always requires an
  approval; users entered raw bytes; file extensions, size and classification
  lacked server validation; the page did not show package use or assignment
  impact; and although assignment snapshots were stored, candidate display and
  submission validation read the live definition, allowing a later edit to
  change an existing candidate’s obligation
- **Changes made:** uses active Document types as a select; removes the two false
  toggles and enforces review; accepts a human-readable 1–10 MB value; validates
  supported extensions, size, instructions and classification server-side;
  shows package use and retirement impact; and makes both candidate display and
  upload validation use the stored assignment snapshot with a safe legacy
  fallback
- **Result:** retained and rebuilt

## Review 086 — `/admin/document-types`

- **Files:** `src/app/admin/document-types/page.tsx`,
  `src/components/admin/AdminCrud.tsx`,
  `src/app/api/admin/generic/route.ts`,
  `src/app/api/candidate/documents/route.ts`,
  `src/app/api/recruitment/vacancies/route.ts`
- **User:** HR managers maintaining the candidate document vocabulary;
  candidates and recruitment officers consume active types
- **Job:** control the names and upload limits used by profile documents,
  application requirements and preboarding evidence definitions
- **Decision:** retain as the canonical file-category register; it does not
  duplicate Document requirements, which describe a specific evidence check
- **Why it earns the page:** a stable type code connects candidate files to
  vacancy and preboarding requirements, while the candidate-facing name and
  file rules are reusable
- **Copy:** “Document types”, “Candidate-facing name”, “Stable code”, “Accepted
  file types” and “Maximum file size”; removed title case, “Max bytes” and the
  vague “Reusable upload categories and controls”
- **Access:** HR manager writes; authenticated candidates read active categories
  for their own document library; recruitment staff read them while configuring
  vacancies
- **Primary action:** maintain a concise controlled vocabulary and retire types
  that should no longer be offered
- **Problems found:** raw bytes made size configuration error-prone; codes and
  file extensions were not validated server-side; an in-use code could be
  changed even though related records store the string rather than a foreign
  key; the register hid active state and usage; and retirement impact did not
  count candidate files, vacancy requirements or preboarding definitions
- **Changes made:** accepts a 1–10 MB value; validates stable uppercase codes and
  the upload service’s supported extensions; normalises extension lists;
  prevents changing any in-use code; shows combined usage and active state; and
  reports all three dependency classes before retirement
- **Result:** retained and corrected

## Review 087 — `/admin/duty-stations`

- **Files:** `src/app/admin/duty-stations/page.tsx`,
  `src/components/admin/AdminCrud.tsx`,
  `src/app/api/admin/generic/route.ts`,
  `src/app/api/recruitment/vacancies/route.ts`
- **User:** HR managers maintaining approved work locations; recruitment
  officers select an active location on each vacancy
- **Job:** keep physical work locations and candidate-facing addresses accurate
  without rewriting historical vacancy records
- **Decision:** retain the route but name the product page “Locations”
- **Why it earns the page:** every vacancy requires a controlled location and
  accepted candidates need reliable office/start information; free text would
  produce duplicate filters and inconsistent candidate documents
- **Copy:** “Locations”, “Location name”, “Local government area” and
  “Candidate-facing address”; removed title case, internal “duty station”
  language and “may be deployed to”
- **Access:** HR manager writes; recruitment staff consume active locations in
  the vacancy form
- **Primary action:** add a distinct location, correct its address or retire it
  from future vacancies
- **Problems found:** the page did not show usage; retirement impact omitted
  linked vacancies; duplicate name/state/LGA combinations were possible; basic
  field validation was left to the browser; and changing the identity of an
  in-use location silently rewrote how historical vacancies display
- **Changes made:** shows and reports linked vacancy count; rejects duplicate
  locations and invalid core fields server-side; protects name, state and local
  government area once used while permitting address correction; clarifies
  where the address is shown; and aligns the page name with the navigation and
  candidate language
- **Result:** retained and corrected

## Review 088 — `/admin/forms`

- **Files:** `src/app/admin/forms/page.tsx`,
  `src/components/admin/AdminCrud.tsx`,
  `src/components/admin/FormSchemaEditor.tsx`,
  `src/lib/form-template.ts`, `src/lib/configuration-releases.ts`,
  `src/lib/candidate-preboarding.ts`,
  `src/app/api/candidate/preboarding/actions/route.ts`
- **User:** HR managers designing structured preboarding questions; a different
  authorised manager reviews changes before publication
- **Job:** build a short, purposeful form, classify its responses and reuse it in
  the appropriate preboarding packages
- **Decision:** retain as a visual form-definition workspace
- **Why it earns the page:** structured candidate information needs validation,
  drafts, review, frozen assignment versions and restricted access; it should
  not be collected through documents or unstructured messages
- **Copy:** “Forms”, “Structured information collected from candidates before
  they start”, “Instructions for the candidate”, “Access classification” and
  plain answer-type labels; removed “Pre-employment Forms”, “Schema (JSON)” and
  the two misleading workflow toggles
- **Access:** HR manager authors and reviews controlled versions; candidate
  responses marked Restricted are hidden from staff without restricted-data
  access
- **Primary action:** add only the fields FRAD needs, then submit the inactive
  form for independent activation
- **Problems found:** managers had to write raw JSON; malformed or empty schemas
  could be saved; new empty forms defaulted active; “Required” duplicated the
  package-level assignment while “Review required” was ignored by readiness
  logic; the response sensitivity already enforced by the read API was not
  configurable; option values and required declarations were not fully
  validated; and assigned candidates saw live title/description changes despite
  a stored template snapshot
- **Changes made:** adds a visual field builder for labels, answer types, help,
  choices and required answers; validates 1–50 uniquely named supported fields
  on creation and controlled release; validates submitted choices and requires
  an affirmative mandatory declaration; defaults new forms inactive; makes
  review invariant and package assignment the sole mandatory/optional control;
  exposes Standard/Confidential/Restricted access; shows package use/version;
  and uses the frozen form snapshot throughout the candidate page
- **Result:** retained and rebuilt

## Review 089 — `/admin/fraud-reports`

- **Files:** `src/app/admin/fraud-reports/page.tsx`,
  `src/components/admin/FraudReportTriage.tsx`,
  `src/app/api/admin/fraud-reports/route.ts`,
  `src/app/api/public/fraud-reports/route.ts`
- **User:** recruitment officers triaging external scam reports; HR managers
  recording the final closure outcome
- **Job:** investigate reports that someone impersonated FRAD or requested money
  in connection with recruitment
- **Decision:** retain as a specialist public-fraud queue, distinct from
  candidate/application complaints
- **Why it earns the page:** reports may be anonymous and concern an external
  phone, email or social account rather than a registered candidate or vacancy;
  forcing them into an application case would lose that intake model
- **Copy:** “Fraud reports”, “Contact named in report”, “Start review”, “Action
  taken” and “Not substantiated”; removed the accusatory “suspect contact” from
  the interface, uppercase internal status labels and generic “Save” editing
- **Access:** recruitment officers start and document investigations; HR
  managers close them; system administrators have no recruitment-case access
- **Primary action:** open a new report, record the first check, then document a
  substantiated action or a reasoned not-substantiated outcome
- **Problems found:** one large card per report made scanning difficult; a
  status dropdown treated an integrity investigation like record editing;
  officers could move cases backwards; closed cases could be changed; closure
  only required a non-empty note; fetch failures were not caught; the client
  ignored API pagination and silently hid every report after the first 50; and
  “Dismissed” risked sounding like the reporter had been dismissed
- **Changes made:** replaces cards with a searchable master-detail case queue;
  uses explicit transition actions and evidence dialogs; requires a substantive
  note for every transition; makes closed cases immutable in this operational
  queue; preserves officer/manager separation in UI and API; adds caught load
  errors, clear empty states and Load more pagination; and uses neutral,
  evidence-led case language
- **Result:** retained and rebuilt

## Review 090 — `/admin/governance`

- **Files:** `src/app/admin/governance/page.tsx`,
  `src/components/admin/GovernanceManager.tsx`,
  `src/app/api/admin/governance/route.ts`, `src/lib/retention.ts`,
  `src/lib/background-jobs.ts`, `src/lib/audit.ts`
- **User:** restricted platform-governance administrators, with an independent
  eligible reviewer/releaser where the control requires separation
- **Job:** protect records from deletion, certify privileged access, investigate
  platform events and inspect retention/delivery evidence
- **Decision:** retain as one assurance workspace with four focused views,
  rather than six unrelated panels
- **Why it earns the page:** these controls concern platform evidence and
  technical data protection rather than recruitment decisions; they share a
  restricted audience and a common assurance purpose
- **Copy:** “Governance”, “Assurance”, “Legal hold register”, “Access review
  register”, “Retention run evidence” and “Undelivered messages”; removed
  “operational assurance” boilerplate, raw uppercase codes and one-click
  “Run retention policy”
- **Access:** `governance.manage` in both server page and API; an access review
  can only be assigned to an eligible governance reviewer; a hold must be
  released by a different administrator
- **Primary action:** investigate an exception or complete a pending assurance
  review; routine retention remains scheduled
- **Problems found:** six controls were presented as equal boxes; manually
  running destructive retention duplicated the scheduled automation; retrying
  every failed message required no reason and hid failure evidence; legal holds
  accepted invented record IDs and duplicate active holds; the same person
  could place and release a hold; access reviews displayed opaque user IDs,
  allowed assignment to people unable to open the page, exposed only an
  Approve action despite three API outcomes, and could never complete a
  changes-required review; due dates could be in the past; operational events
  had no resolution action; and direct unauthorised page visits rendered the
  shell before failing
- **Changes made:** adds server-side page permission; restructures the workspace
  into Assurance, Legal holds, Access reviews, and Retention & delivery; removes
  manual retention execution and points to scheduled controls; displays
  dead-letter errors before reasoned retry; validates hold targets, prevents
  duplicates and requires an independent releaser; returns readable account and
  reviewer identities; filters/enforces eligible reviewers, future due dates
  and one open review per account; supports appropriate/changes
  required/completed transitions; and adds audited event resolution
- **Result:** retained and rebuilt

## Review 091 — `/admin/interview-questions`

- **Files:** `src/app/admin/interview-questions/page.tsx`,
  `src/app/recruitment/interviews/page.tsx`,
  `src/components/admin/InterviewManager.tsx`,
  `src/app/api/recruitment/interviews/route.ts`
- **User:** recruitment staff following an old administration bookmark
- **Job:** none distinct from setting up and managing a specific interview
- **Decision:** remove as a standalone destination and retain the redirect to
  Recruitment interviews
- **Why it does not earn a page:** questions, evidence guidance, scoring range
  and panel submissions belong to the interview instance; a global question
  bank would detach confidential material from the role and selection process
  it is meant to assess
- **Copy:** no standalone interface or explanatory copy
- **Access:** inherited from the interview workspace and its panel/operations
  permissions
- **Primary action:** none on the alias
- **Problems found:** no remaining functional problem; the route is already
  absent from navigation and redirects to the correct operational workspace
- **Changes made:** documented the route as an intentional compatibility alias
  rather than an unfinished administration page
- **Result:** removed as a standalone page

## Review 092 — `/admin/notification-templates`

- **Files:** `src/app/admin/notification-templates/page.tsx`,
  `src/components/admin/AdminCrud.tsx`,
  `src/components/admin/MessageTemplateBodyEditor.tsx`,
  `src/lib/message-template.ts`, `src/lib/configuration-releases.ts`,
  `src/app/api/messages/route.ts`,
  `src/components/shared/MessageComposer.tsx`
- **User:** HR managers authoring approved message starting points; recruitment
  officers select and adapt active templates in an application conversation
- **Job:** maintain clear, consistent candidate messages without replacing the
  officer’s judgement or application context
- **Decision:** retain as the controlled message-copy workspace
- **Why it earns the page:** common application updates need consistent facts
  and safe merge fields, but final messages remain editable and are sent from
  the application communication record
- **Copy:** “Message templates”, “Stable code”, “Subject”, “Message”,
  “Candidate preview” and named candidate/vacancy detail buttons; removed
  title case, “Body Template”, “Unique Code” and generic versioning language
- **Access:** HR manager creates controlled drafts; a different authorised
  manager approves publication; recruitment officers consume only active
  templates
- **Primary action:** write and preview a useful candidate message, then submit
  its inactive version for review
- **Problems found:** the page was an unassisted textarea; unsupported merge
  fields passed validation and appeared literally in candidate messages; there
  was no sample preview or clear list of supported details; a new template
  defaulted active without review; template codes had no format validation and
  could change after use; and the register omitted version
- **Changes made:** adds variable insertion and a live candidate preview;
  validates subject/body length, uppercase stable codes and every merge field
  on creation and controlled release; prevents code changes on existing
  templates; defaults new templates inactive; and shows subject, code, version
  and active state in a compact register
- **Result:** retained and rebuilt

## Review 093 — `/admin/operating-model`

- **Files:** `src/app/admin/operating-model/page.tsx`,
  `src/components/admin/OperatingModelManager.tsx`,
  `src/app/api/admin/operating-model/route.ts`,
  `src/app/admin/layout.tsx`, `src/lib/work-items.ts`
- **User:** HR managers setting recruitment work targets; a different HR
  manager reviews each proposed change
- **Job:** decide how long newly created recruitment work should remain open
  before it becomes due
- **Decision:** retain the route as “Work targets”; remove unused workflow and
  integration theatre from the product page
- **Why it earns the page:** the configured target is read when application
  review, approval, offer, reference, assessment, interview and preboarding work
  is created; this is a small but real operational control
- **Copy:** “Work targets”, “Due after”, “Current targets”, “Change register”
  and durations in hours/days; removed “Operating model”, “service-level
  policies”, raw minute entry, workflow-rule counts and unsupported integration
  readiness claims
- **Access:** HR manager only in the server page and API; system administrators
  no longer set recruitment operating expectations; proposal and approval
  require different HR managers
- **Primary action:** propose a changed due-time target with operational
  evidence, or independently decide a pending proposal
- **Problems found:** workflow definitions and integration connections were
  displayed as if operational although no runtime code consumes them; those
  controls had no creation/editing path; system administrators owned a
  recruitment decision; editing one target silently changed three unrelated,
  unused values; targets were entered as raw minutes; every configuration
  change type was loaded into this register and the approval API treated
  unknown types as integration updates; missing resources and no-op changes
  could be submitted; the requester saw an approval button that only failed;
  and the review lacked a before/after comparison
- **Changes made:** removes dead workflow/integration controls and API actions
  from this page; moves the destination to HR manager controlled changes;
  narrows all reads/decisions to work targets; edits only the live
  `targetMinutes` value used by work creation; accepts human-readable hours;
  validates active resources and changed values; records the prior target;
  compares current/proposed durations; and hides self-approval behind the
  correct waiting state
- **Result:** retained and rebuilt

## Review 094 — `/admin/permissions`

- **Files:** `src/app/admin/permissions/page.tsx`,
  `src/app/admin/layout.tsx`, `src/lib/rbac.ts`,
  `src/app/admin/roles/page.tsx`
- **User:** system administrators following an old permission-catalogue
  bookmark
- **Job:** none that should permit creating or renaming runtime capability codes
- **Decision:** remove as a standalone page, remove it from navigation and
  redirect the legacy route to Roles
- **Why it does not earn a page:** permission codes only have meaning when
  product code checks them; creating a database row cannot add a capability,
  and renaming a checked code silently revokes access. Administrators need to
  understand role capabilities, not maintain an implementation vocabulary.
- **Copy:** no standalone interface; removed “Granular permission codes
  referenced by role assignments”
- **Access:** the redirect lands in system-admin Roles; no permission mutation
  surface remains
- **Primary action:** none on the alias
- **Problems found:** the generic CRUD implied that administrators could create
  product capabilities; it allowed edits to codes hard-coded throughout route
  authorization; descriptions could drift from enforced behaviour; and the
  page had no role-assignment function despite presenting itself as access
  administration
- **Changes made:** replaces the CRUD with a compatibility redirect and removes
  the duplicate navigation item; capability understanding is consolidated into
  the role review
- **Result:** removed as a standalone page

## Review 095 — `/admin/policies`

- **Files:** `src/app/admin/policies/page.tsx`,
  `src/components/admin/AdminCrud.tsx`,
  `src/components/admin/PolicyFileEditor.tsx`,
  `src/lib/policy-template.ts`, `src/lib/configuration-releases.ts`,
  `src/lib/preboarding.ts`,
  `src/app/candidate/preboarding/policies/page.tsx`,
  `src/app/api/candidate/preboarding/actions/route.ts`
- **User:** HR managers maintaining official preboarding policies; a different
  authorised manager reviews publication
- **Job:** attach the approved policy PDF, state what it covers, choose the
  acknowledgement evidence and reuse the version in preboarding packages
- **Decision:** retain as the official policy-document workspace
- **Why it earns the page:** candidates must read a controlled source document,
  and FRAD must retain the exact assigned file, version and acknowledgement
  evidence rather than a link to mutable content
- **Copy:** “Policies”, “Official policy PDF”, “What the candidate should know”
  and plain acknowledgement choices; removed “Policies & Documents”, manual
  version language, title case and unexplained category acronyms
- **Access:** HR manager authors controlled changes; a second authorised manager
  approves; candidates access only policies assigned to their own preboarding
  record
- **Primary action:** upload the approved PDF and prepare an inactive policy for
  independent publication
- **Problems found:** the administration page had no way to attach the PDF even
  though candidate signing correctly fails without one; version was editable
  despite being system-controlled; new policies defaulted active; summary,
  category, effective date and acknowledgement method were weakly validated;
  the unused `signatureMethod` configuration duplicated the actual
  acknowledgement method; and package usage was hidden
- **Changes made:** adds PDF-only upload with confidential storage; requires and
  verifies a clean official PDF on creation and controlled release; removes
  manual version and unused signature configuration; validates policy metadata
  and acknowledgement methods; defaults new records inactive; expands category
  names; shows package usage/version; and retains the existing frozen
  file/version snapshot for each candidate assignment
- **Result:** retained and rebuilt

## Review 096 — `/admin/preboarding-packages`

- **Files:** `src/app/admin/preboarding-packages/page.tsx`,
  `src/components/admin/AdminCrud.tsx`,
  `src/components/admin/ConfigurationBuilder.tsx`,
  `src/app/api/admin/configuration-builder/route.ts`,
  `src/app/api/admin/configuration-releases/route.ts`,
  `src/lib/preboarding.ts`,
  `src/app/api/recruitment/vacancies/[id]/actions/route.ts`
- **User:** HR managers assembling the exact work accepted candidates receive;
  a different authorised manager approves activation
- **Job:** combine forms, evidence checks, policies, embedded courses and tasks
  into a stable package selected on a vacancy
- **Decision:** retain as the single preboarding-orchestration workspace
- **Why it earns the page:** the package is the bridge from an accepted offer to
  tracked candidate completion; it avoids configuring five independent lists
  on every vacancy
- **Copy:** “Preboarding packages”, “When to use this package”, “Requirement”,
  “Due after assignment” and “Add to package”; removed unused candidate/role
  classification, uppercase item types and “bundle” boilerplate
- **Access:** HR manager builds inactive packages; a different manager approves
  activation; published packages are read-only and must be copied before change
- **Primary action:** choose an inactive package, add only the requirements that
  apply, then submit the complete package for activation
- **Problems found:** new empty packages defaulted active; published package
  contents changed in place with no version control; every item was silently
  mandatory; duplicate and inactive requirements could be added; removal did
  not verify package state; candidate type and role category were presented but
  never used to select a package; a vacancy could reach approval with no
  package; and preboarding without an explicit package selected whichever
  active package sorted first
- **Changes made:** defaults new packages inactive and validates name/use
  guidance; locks add/remove on published packages; verifies package/resource
  state and prevents duplicates server-side; supports deliberate optional
  items; simplifies course timing to before-resumption or optional for new
  entries; shows a compact grouped requirement register; requires at least one
  item before activation; requires a selected package before vacancy approval;
  removes the arbitrary fallback and unused classification UI; and shows
  package version/vacancy usage
- **Completion assurance:** required before-resumption forms, documents,
  policies, courses and tasks remain individually snapshotted and block
  readiness until their recorded completion/approval state is satisfied
- **Result:** retained and rebuilt

## Review 097 — `/admin/projects`

- **Files:** `src/app/admin/projects/page.tsx`,
  `src/components/admin/AdminCrud.tsx`,
  `src/app/api/admin/generic/route.ts`,
  `src/app/api/recruitment/vacancies/route.ts`,
  `src/app/api/recruitment/reports/export/route.ts`
- **User:** HR managers maintaining funded programme/grant choices;
  recruitment officers optionally attribute a vacancy
- **Job:** preserve a controlled funding/project dimension for vacancy records
  and recruitment reporting
- **Decision:** retain as an optional reference-data register, distinct from the
  employing Department
- **Why it earns the page:** FRAD vacancies may be funded by a programme or grant
  that differs from the organisational department; the relationship is
  optional but material to NGO recruitment reporting
- **Copy:** “Funded programmes or grants used to attribute vacancies and report
  recruitment activity”, “Project name” and “Reporting code”; removed the vague
  “can be attributed to”
- **Access:** HR manager writes; recruitment staff consume active projects in
  vacancy creation
- **Primary action:** add a funded project or retire it from future vacancy use
- **Problems found:** the page did not show use or retirement impact; project
  codes lacked server validation and could change after vacancies stored the
  relationship; and the pipeline export omitted Project, so the claimed
  reporting dimension was not actually available
- **Changes made:** validates stable uppercase reporting codes; shows and reports
  linked vacancy count; prevents changing an in-use code while allowing name
  corrections; and adds Project to pipeline CSV/XLSX exports
- **Result:** retained and corrected

## Review 098 — `/admin/roles`

- **Files:** `src/app/admin/roles/page.tsx`,
  `src/app/api/admin/generic/route.ts`
- **User:** system administrators reviewing the platform access model
- **Job:** explain each staff role, its responsibility, its boundary and the
  capabilities currently granted to it
- **Decision:** retain as the access-model reference; remove role CRUD
- **Why it earns the page:** users need one place to understand why a role
  exists before assigning it, while role design itself must remain a reviewed
  product and code decision
- **Copy:** “Clear responsibilities, limited access”, “Recorded capabilities”
  and a plain-language limit for every role; removed raw role-table language
- **Access:** system administrator only; recruitment managers do not define
  their own authority
- **Primary action:** review the model, then open Users to assign the smallest
  role that fits the person’s work
- **Problems found:** arbitrary role creation and editing could produce roles
  the application did not understand; terse seed descriptions did not explain
  boundaries; raw permission codes were not usable guidance; external
  identities appeared indistinguishable from staff roles; and the crucial
  separation between recruitment officer, HR manager and system administrator
  was not visible
- **Changes made:** replaces generic CRUD with a fixed, grouped role catalogue;
  explains purpose and explicit limits; translates stored capabilities into
  plain language; shows current assignment counts; directs assignment to Users;
  excludes public/candidate/referee identities from the staff catalogue; and
  rejects generic API attempts to create or edit roles and permissions
- **Result:** retained and rebuilt

## Review 099 — `/admin/scorecards`

- **Files:** `src/app/admin/scorecards/page.tsx`,
  `src/components/admin/ConfigurationBuilder.tsx`,
  `src/app/api/admin/generic/route.ts`,
  `src/app/api/admin/configuration-builder/route.ts`,
  `src/app/api/admin/configuration-releases/route.ts`
- **User:** HR managers defining consistent evidence for screening and
  interviews; reviewers complete the resulting scorecard elsewhere
- **Job:** create an inactive selection instrument, add clear scored criteria
  and release it for vacancy use after independent review
- **Decision:** retain and consolidate the register and builder into one
  deliberate workflow
- **Why it earns the page:** structured, vacancy-linked evidence is necessary
  for consistent and auditable selection; a free-text review would not provide
  the same control
- **Copy:** “Set the evidence and points reviewers must record”, “What
  reviewers should look for” and “Available for new vacancies”; removed
  generic template language and the unexplained Weight field
- **Access:** HR manager builds and submits; a different HR manager approves
  activation; assigned reviewers score candidates in their normal work
- **Primary action:** create a draft, add criteria totalling 100 points for
  screening, then submit activation for review
- **Problems found:** new scorecards defaulted active; criteria on active
  scorecards could be changed in place; criteria could exceed the screening
  total; activation allowed empty or unguided scorecards; type could change
  after vacancy use or scoring; the builder exposed both maximum and weight
  without explaining their combined effect; and the register hid criteria and
  usage
- **Changes made:** defaults and forces new scorecards inactive; validates
  names, use guidance and selection stage; locks criteria on active
  scorecards; requires meaningful scoring guidance; prevents screening totals
  above 100 while building and requires exactly 100 at activation; prevents
  changing the stage once assigned or used; removes weight from the interface;
  adds a point-total progress indicator and structured criterion register; and
  shows criteria, use and version in the main register
- **Result:** retained and rebuilt

## Review 100 — `/admin/system-settings`

- **Files:** `src/app/admin/system-settings/page.tsx`,
  `src/app/api/admin/generic/route.ts`,
  `src/lib/retention.ts`
- **User:** system administrators checking whether the deployed service is
  ready and healthy
- **Job:** show production dependency readiness, delivery failures, scheduled
  processing and the retention intervals the runtime actually applies
- **Decision:** retain as an operational readiness page; remove arbitrary
  key/value administration
- **Why it earns the page:** technical owners need a secret-safe view of
  deployment gaps and asynchronous service health without entering recruitment
  operations
- **Copy:** “System readiness”, “Deployment checks”, “Message delivery”,
  “Scheduled processing” and “Short-lived records”; no raw JSON settings editor
- **Access:** system administrator only
- **Primary action:** resolve a missing production dependency or failed
  delivery outside candidate and HR workflows
- **Problems found:** any key and JSON value could be created despite only four
  retention keys being read at runtime; the claimed “other business rules”
  were not implemented; S3 readiness incorrectly required a custom endpoint
  and ignored the selected driver; optional SSO made the whole deployment look
  unready; encryption-key readiness was absent; and one runtime retention
  default was invisible
- **Changes made:** removes generic settings CRUD and blocks its mutation API;
  lists only the four retention intervals consumed by the job with explicit
  fallback values; corrects database and object-storage detection; separates
  optional SSO from required readiness; adds encryption/signing checks; keeps
  secret values hidden; and requires an explicit system-administrator role
- **Result:** retained and rebuilt

## Review 101 — `/admin/tasks`

- **Files:** `src/app/admin/tasks/page.tsx`,
  `src/app/api/admin/generic/route.ts`,
  `src/app/api/admin/configuration-releases/route.ts`,
  `prisma/schema.prisma`,
  `prisma/postgresql/schema.prisma`,
  `prisma/postgresql/migrations/0015_preboarding_task_versions/migration.sql`
- **User:** HR managers defining an occasional candidate action that is not
  already covered by a form, document, policy or course
- **Job:** provide a small, trackable catch-all request with optional evidence
  and HR review
- **Decision:** retain, but position it explicitly as an exception rather than
  a parallel document or form system
- **Why it earns the page:** practical actions such as confirming travel or
  collecting equipment can require completion tracking without a structured
  form or learning module
- **Copy:** “Additional requests”, “What the candidate needs to do”, “HR must
  review completion” and “Candidate must attach evidence”; removed internal
  “pre-resumption task template” terminology
- **Access:** HR manager defines and releases requests; a package determines
  whether each request is mandatory; recruitment staff review assigned items
- **Primary action:** add a clear candidate instruction only when no more
  specific preboarding requirement fits
- **Problems found:** Template Required duplicated the package-level required
  decision; Category was stored but never shown or used; new requests defaulted
  active; the model lacked `version` even though the API treated it as
  versioned, causing controlled edits to fail; weak descriptions allowed a
  candidate to receive an unexplained checkbox; and usage was hidden
- **Changes made:** removes unused category and duplicate required controls
  from the interface; defaults new records to general, required-at-template and
  inactive; validates candidate-facing instructions; requires usable content
  before activation; adds the missing version field and migration; shows
  package/assignment usage and version; and enforces HR-manager route access
- **Result:** retained and corrected

## Review 102 — `/admin/templates`

- **Files:** `src/app/admin/templates/page.tsx`,
  `src/components/admin/AdminCrud.tsx`,
  `src/components/admin/OfferTemplateBodyEditor.tsx`,
  `src/lib/offer-template.ts`,
  `src/lib/offer-template-fields.ts`,
  `src/lib/offer-document.ts`,
  `src/lib/simple-pdf.ts`,
  `src/app/api/admin/generic/route.ts`,
  `src/app/api/admin/configuration-releases/route.ts`,
  `src/app/api/recruitment/offers/route.ts`,
  `src/app/api/recruitment/offers/[id]/preview/route.ts`,
  `src/app/api/recruitment/offers/[id]/actions/route.ts`,
  `src/app/api/recruitment/offers/[id]/route.ts`,
  `prisma/postgresql/migrations/0016_offer_template_snapshot/migration.sql`
- **User:** HR managers maintaining approved offer wording; recruitment
  officers choose it while preparing terms; approvers and candidates see a PDF
- **Job:** combine controlled letter wording with offer-specific terms inside a
  formal, stable FRAD document
- **Decision:** retain and rebuild around the actual PDF output
- **Why it earns the page:** employee, consultant and intern letters may need
  different approved wording, while compensation and dates remain specific to
  each offer
- **Copy:** “Offer letters”, “Approved letter wording”, “Engagement” and
  “Available when preparing an offer”; removed database-oriented “versioned
  body” language
- **Access:** HR manager drafts and submits wording; a different HR manager
  approves publication; recruitment officers select only active templates
- **Primary action:** write and preview the letter, then submit it for
  independent release
- **Problems found:** the page exposed a plain textarea with no document
  context; engagement accepted arbitrary text; unsupported variables were not
  rejected; new wording defaulted active; the list hid usage/version; and most
  importantly an approved offer still read the live template when sent, so a
  later template edit could change the candidate PDF after approval
- **Changes made:** adds a restrained A4-style editor preview and variable
  insertion; explains which PDF elements are applied automatically; restricts
  engagement types and template variables; requires candidate-addressed
  wording; defaults new templates inactive; shows usage and version; preserves
  the selected template snapshot on the offer; uses that snapshot for approval
  preview and issued PDF; and carries it into corrected offer versions
- **Candidate document:** the existing preview and send routes render the
  branded PDF; the issued bytes are stored as a confidential file and the
  candidate views that frozen file rather than regenerated HTML
- **Result:** retained and rebuilt

## Review 103 — `/admin/users`

- **Files:** `src/app/admin/users/page.tsx`,
  `src/components/admin/UserManager.tsx`,
  `src/app/api/admin/users/[id]/route.ts`,
  `src/app/api/admin/generic/route.ts`
- **User:** system administrators maintaining staff account access and account
  status
- **Job:** see staff accounts, assign a fixed staff role, remove access and end
  sessions when an account must be suspended
- **Decision:** retain as the only role-assignment workspace
- **Why it earns the page:** account status and platform-wide role assignment
  are technical identity controls, distinct from vacancy, approval and panel
  assignments
- **Copy:** “Staff accounts”, “Assign the smallest role” and “Separate technical
  accounts”; removed generic CRUD language and raw uppercase role names
- **Access:** system administrator only; the administrator cannot suspend
  themselves or remove their own technical role
- **Primary action:** review a staff account and add or remove the smallest
  applicable role
- **Problems found:** all candidate and referee accounts were mixed into the
  staff table; those external roles could be assigned from the role selector;
  a candidate account could receive staff access; clicking a role chip removed
  it immediately without a reason; removal identified a role rather than the
  exact assignment; scopes were claimed but the interface only created global
  access and scoped roles are excluded from sessions; account status changed
  with no confirmation; and restoring a locked account left lock counters in
  place
- **Changes made:** lists staff accounts only; filters and server-validates the
  eight fixed staff roles; prevents external identities becoming staff
  accounts; treats role access as global while resource-specific participation
  stays in recruitment; removes the exact assignment; requires and audits a
  reason for removal, suspension and restoration; ends sessions after every
  access change; clears lock state on restoration; adds search, readable role
  labels, last sign-in and explicit confirmation dialogs; and enforces route
  access
- **Result:** retained and rebuilt

## Review 104 — `/admin/vacancy-categories`

- **Files:** `src/app/admin/vacancy-categories/page.tsx`,
  `src/app/api/admin/generic/route.ts`,
  `src/app/careers/page.tsx`,
  `src/app/api/public/vacancies/route.ts`,
  `src/components/shared/SavedSearchManager.tsx`,
  `src/app/api/candidate/saved-searches/route.ts`,
  `src/lib/job-alerts.ts`,
  `src/app/api/recruitment/reports/export/route.ts`
- **User:** HR managers maintaining cross-team job families; recruitment
  officers select one on a vacancy; candidates use it to find and follow work
- **Job:** group similar roles consistently across organisational departments
  for discovery and reporting
- **Decision:** retain, rename to Job families and wire it through the product
- **Why it earns the page:** a job family describes the kind of work while
  Department describes the employing team; the distinction supports
  cross-team candidate discovery and analysis
- **Copy:** “Job families”, “Type of work” and “A consistent way for candidates
  and HR to group similar work”; removed the vague category label
- **Access:** HR manager writes; recruitment officers select active families;
  candidates filter and save alerts
- **Primary action:** add or retire a stable job family used across vacancies
- **Problems found:** the field was mandatory when creating a vacancy but was
  absent from the public vacancy payload, careers filters, job alerts and
  pipeline report; the administration page therefore managed a classification
  with almost no product effect; usage was hidden; and an in-use reporting code
  could change
- **Changes made:** adds candidate careers filtering and card context; includes
  job family in the public API; supports it in saved searches and scheduled job
  alerts; exports it in the pipeline report; validates names and stable codes;
  prevents code changes after vacancy use; shows usage/retirement impact; and
  enforces HR-manager route access
- **Result:** retained and completed

## Shared administration shell

- **Files:** `src/app/admin/layout.tsx`,
  `src/components/admin/AdminNav.tsx`
- **Decision:** retain one role-aware shell across the reviewed administration
  pages
- **Changes made:** the shell shows only the sections available to the signed-in
  role; system administration remains separate from recruitment operations;
  configuration names match the rebuilt page language; and the navigation
  heading now describes platform, recruitment, learning or operations instead
  of incorrectly calling every administration area “Recruitment setup”

## Final route and build reconciliation

- **Coverage:** 97 active `page.tsx` routes are represented in the ledger; seven
  additional reviews document routes removed as duplicates, for 104 individual
  page decisions with no unreviewed active route
- **Shared checks:** schema validation, Prisma client generation, TypeScript,
  lint and the unit suite pass
- **Build correction:** the production build script previously skipped both
  migration deployment and Next.js compilation when `CI=true`; it now skips
  only database deployment in CI and always generates Prisma and compiles the
  application
- **Local infrastructure:** the configured PostgreSQL endpoint at
  `localhost:5435` was not reachable during final verification; compile-only CI
  verification is therefore used separately from migration deployment
