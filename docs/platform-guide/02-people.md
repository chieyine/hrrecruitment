# 2. The people who use it

Eleven roles exist. Each one is a set of permissions, not a job title — a person may hold more than one, and the platform cares only about what the combination allows.

## 2.1 Applicants

Anyone may browse published vacancies without an account. Applying requires registration and a verified email address.

**An applicant can:** create an account and verify it; build one reusable profile covering education, employment, licences, certifications, skills and languages; upload a CV and supporting documents; search and filter vacancies; save a draft application and return to it; submit; withdraw; track status; receive and respond to assessment and interview invitations; nominate referees; accept or decline an offer; complete pre-employment requirements; raise a complaint or appeal; request correction or deletion of their data.

**An applicant can never see:** internal recruitment notes, screening or interview scores, panel comments, other candidates, salary deliberations, reference responses, background-check findings, or safeguarding records. This is enforced by a separate candidate-facing status vocabulary — several distinct internal stages collapse to the same words an applicant sees, so the granularity of internal deliberation never leaks.

| Internal stage | What the applicant sees |
| --- | --- |
| `UNDER_REVIEW`, `EXCEPTION_REVIEW`, `LONGLISTED` | Under review |
| `REFERENCE_CHECK`, `BACKGROUND_CHECK`, `RECOMMENDED`, `RESERVE` | Under review |
| `NOT_LONGLISTED`, `NOT_SHORTLISTED`, `INELIGIBLE`, `NOT_SELECTED` | Unsuccessful |
| `PREBOARDING`, `PRE_EMPLOYMENT_CLEARANCE` | Preboarding in progress |
| `RESUMED`, `READY_FOR_ERP_TRANSFER`, `TRANSFERRED_TO_ERP` | Recruitment completed |

^ Table 1. An applicant told "under review" cannot tell whether their file was flagged as an exception. That is intentional.

## 2.2 Internal candidates

An internal candidate is a member of staff applying for a vacancy. They apply with the ordinary applicant role, because a recruitment role describes what someone does *in the recruitment system*, not whether they work here.

They are identified by their **verified** `@fradfoundation.org` email address. Two rules make this safe to rely on:

- The address must be verified. An unverified one proves nothing, and internal vacancies are frequently promotions or restructures that must not be visible outside the organisation.
- The domain must match exactly. `not-fradfoundation.org`, `fradfoundation.org.attacker.com` and unlisted subdomains are all rejected.

The domain list is configurable through `INTERNAL_EMAIL_DOMAINS` so a rename or a second domain does not require a code change.

## 2.3 Hiring department representative

Each department has one accountable manager, with its staff assigned beneath that department scope. That manager, or a technical lead they delegate for a particular recruitment, represents the hiring department.

**They can:** raise a staffing request with its justification; attach or confirm the job description; recommend technical eligibility and longlisting criteria; review applicants HR assigns to them; take part in shortlisting; sit on panels and submit independent scores; recommend candidates; add technical comments.

**They cannot:** publish a vacancy, edit an applicant's record, see confidential reference or safeguarding findings, change HR-approved longlisting rules, issue an offer, see another panel member's score before submitting their own, or approve money unless they separately hold the Budget Holder role.

## 2.4 Budget Holder

The person with authority over the relevant project, grant, department or budget line. **Not Finance.** Finance may receive reports, but the business decision that a post is funded belongs to the person who owns the budget.

**They can:** confirm that a position is funded; confirm the budget line, the funding period and whether it is grant or unrestricted; set the salary or consultancy ceiling and the maximum recruitment cost; record whether donor approval is required and its reference; re-confirm an offer that exceeds the ceiling they set; reject or return an unfunded request.

**They cannot:** see candidate records, scores, interview outcomes or offers beyond the financial terms. Their workspace contains no candidate data at all.

A Budget Holder cannot confirm funding for a request they raised themselves.

## 2.5 Recruitment officer

The day-to-day HR operator, and the busiest role in the platform.

**They can:** create and prepare vacancies; define longlisting rules and shortlisting matrices; run automatic longlisting; work the exception-review queue; assign reviewers; configure and schedule assessments and interviews; manage references; request and record background checks; prepare selection documentation and conditional offers; manage preboarding; record ERP handovers; handle complaints.

**They cannot:** approve a vacancy, confirm a longlist, reverse an automatic eligibility outcome, approve an offer, waive a required check, or approve an ERP transfer. Each of those is reserved for the HR Manager.

## 2.6 HR Manager

The accountable owner of the recruitment process, and the principal business approver.

**They can:** everything a recruitment officer can, plus approve vacancies; approve or reject staffing requests; approve changes to locked longlisting rules; confirm longlists; reverse automatic eligibility outcomes; approve selection recommendations; approve offers within delegated authority; waive required checks with a reason; approve ERP transfers; configure workflows, statuses, templates, scorecards and service standards; manage operational access for HR users; freeze or reopen stages.

The organisation has one HR Manager. Where another role initiates a controlled decision, the HR Manager remains the approver. A vacancy owned and submitted by the HR Manager is approved automatically with an explicit audit record; it is not routed to a fictional second HR level. Funding confirmation still belongs to the Budget Holder, and publication gates still apply.

## 2.7 Interview panel member

**They can:** see only the vacancies and candidates assigned to them; read the approved candidate pack; declare a conflict of interest; view the approved question set; enter scores and evidence-based comments independently; submit a recommendation; confirm their completed scorecard.

**They cannot:** see another panel member's score before submitting their own, change anyone else's score, reach unrelated vacancies, see salary details unless separately authorised, see background or safeguarding findings, or alter the final ranking.

## 2.8 Executive approver

The Executive Director, Country Director or a delegated senior officer. They are involved only where policy requires it: senior-management recruitment, recruitment outside the approved structure, exceptional salary proposals, policy waivers, direct appointments, cancellations at an advanced stage, and emergency staffing requests. They are not a routine second approval level for an HR-owned vacancy.

The platform decides when to escalate rather than leaving it to judgement. A staffing request routes to an executive automatically when the grade is senior, the urgency is emergency, or a new establishment of three or more posts is proposed — and the reason for the escalation is displayed alongside it.

## 2.9 Referee

An external person completing a reference. They reach the platform through a single-use, expiring link and never hold an account. They see the questions and nothing else — no internal records, no other referees' responses, no candidate file.

## 2.10 Course administrator

Manages preboarding course content, quiz authoring, enrolment visibility and attempt resets. Sees nothing else.

## 2.11 Auditor

Read-only access to recruitment records, the audit trail and authorised report exports. Cannot mutate configuration or make any recruitment decision.

## 2.12 Technical system administrator

Manages the technology, not the recruitment process.

**They can:** create and disable accounts; assign roles on approved instruction; configure authentication; manage backups, integrations and email delivery; monitor availability; manage security settings and software updates; restore from backup where authorised.

**They cannot:** approve vacancies or candidates, alter scores, change selection decisions, issue offers, approve funding, or change any recruitment outcome. This is enforced structurally: a system-administrator account is restricted to three technical permissions and *cannot inherit recruitment authority even if an operational role is mistakenly also assigned to it*. Someone who does both jobs needs two accounts, so every decision has an unambiguous actor.

All technical-administrator access to recruitment data is logged.

## 2.13 Separation of duties, summarised

| Decision | Who may make it | Who is excluded |
| --- | --- | --- |
| Raise a staffing request | Hiring department, HR | — |
| Confirm funding | Budget Holder | Anyone who raised the request; Finance |
| Approve a vacancy | HR Manager; automatic when HR owns it | Recruitment officers |
| Change a locked rule | HR Manager | The person who proposed it |
| Confirm a longlist | HR Manager | — |
| Reverse an automatic outcome | HR Manager | Recruitment officers |
| Score an interview | Assigned panel members | Anyone unassigned |
| Approve an offer | HR Manager, executive | The person who prepared it |
| Approve an ERP transfer | HR Manager | — |
| Waive a required check | HR Manager | Recruitment officers |
