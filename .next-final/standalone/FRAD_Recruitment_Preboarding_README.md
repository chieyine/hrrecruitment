# FRAD Recruitment and Preboarding Platform

## Complete Product and Technical README

**Project:** FRAD Recruitment and Preboarding Platform  
**Primary owner:** FRAD Human Resources  
**Main users:** Applicants, selected candidates, HR officers, hiring managers, panel members, referees, approvers, course administrators and system administrators  
**System boundary:** The platform manages the journey from vacancy publication to candidate resumption and manual creation of the successful candidate's profile in the FRAD ERP.

---

# 1. Product overview

The FRAD Recruitment and Preboarding Platform is a standalone web application for managing recruitment and preparing successful candidates before they resume.

The platform must support:

1. Public vacancy publication.
2. Candidate registration and reusable profiles.
3. Vacancy-specific applications.
4. Application screening and shortlisting.
5. Assessments.
6. Interview scheduling and scoring.
7. Reference checks.
8. Final selection and approval.
9. Offer generation and acceptance.
10. Preboarding after offer acceptance.
11. Required forms and document submission.
12. Policy acknowledgement and signing.
13. Compulsory courses and quizzes.
14. Pre-resumption tasks.
15. Reporting, travel, security and first-day information.
16. Candidate readiness clearance.
17. Resumption confirmation.
18. Manual ERP handover tracking.

The recruitment platform must remain separate from the FRAD ERP. It must not automatically create employee records in the ERP. After the candidate resumes, HR manually creates the official ERP profile and records the ERP personnel number in the recruitment platform.

---

# 2. Product goals

The system should help FRAD to:

- Run consistent and transparent recruitment processes.
- Keep candidate records in one secure location.
- Reduce repeated data entry.
- Standardize shortlisting and interview scoring.
- Preserve evidence supporting recruitment decisions.
- Communicate clearly with candidates.
- Ensure successful candidates complete important requirements before resumption.
- Ensure candidates know where, when and how to resume.
- Track forms, documents, signatures, courses, tasks and meetings.
- Give HR a clear readiness dashboard.
- Produce a complete handover summary for manual ERP entry.
- Maintain a reliable audit history.

---

# 3. Non-goals

The platform must not become a second HR ERP. It should not manage:

- Payroll.
- Leave.
- Attendance.
- Timesheets.
- Ongoing performance management.
- Promotion and transfer.
- Disciplinary cases.
- Ongoing staff training after ERP transfer.
- Staff assets.
- Staff travel after resumption.
- Employee exit management.
- Annual workforce planning.
- Project budget approval.
- Automatic ERP synchronization.
- A complex remote-proctoring system.
- A full organization-wide learning management system.

It may collect information required for preboarding and ERP handover, but ongoing employee management belongs in the ERP.

---

# 4. End-to-end lifecycle

```mermaid
flowchart LR
    A[Vacancy Published] --> B[Candidate Applies]
    B --> C[Application Review]
    C --> D[Longlisting]
    D --> E[Shortlisting]
    E --> F[Assessment]
    F --> G[Interview]
    G --> H[Reference Check]
    H --> I[Final Selection]
    I --> J[Offer Sent]
    J --> K[Offer Accepted]
    K --> L[Preboarding]
    L --> M[Ready to Resume]
    M --> N[Resumed]
    N --> O[Profile Manually Created in ERP]
    O --> P[Recruitment Record Closed]
```

The core status journey is:

```text
DRAFT APPLICATION
→ SUBMITTED
→ UNDER REVIEW
→ LONGLISTED
→ SHORTLISTED
→ ASSESSMENT
→ INTERVIEW
→ REFERENCE CHECK
→ RECOMMENDED
→ OFFER SENT
→ OFFER ACCEPTED
→ PREBOARDING
→ READY TO RESUME
→ RESUMED
→ CREATED IN ERP
→ CLOSED
```

Alternative outcomes include:

- Ineligible.
- Not shortlisted.
- Failed assessment.
- Not recommended.
- Reserve candidate.
- Offer declined.
- Offer expired.
- Candidate withdrew.
- Did not resume.
- Vacancy cancelled.

---

# 5. Recommended architecture

The AI build agent may adapt the stack if FRAD has an existing standard, but the recommended default is:

## Frontend

- Next.js.
- TypeScript.
- React.
- Tailwind CSS.
- shadcn/ui or another accessible component library.
- React Hook Form.
- Zod validation.
- TanStack Query where useful.

## Backend

Use either:

- Next.js route handlers and server actions for a simpler deployment, or
- A separate Node.js API using NestJS or Fastify.

## Database

- PostgreSQL.
- Prisma ORM or Drizzle ORM.

## File storage

- Private S3-compatible object storage.
- Time-limited signed URLs.
- Virus and malware scanning.
- Encryption at rest.

## Authentication

- Secure email and password authentication.
- Email verification.
- Password reset.
- Optional multi-factor authentication for internal users.
- Role-based access control.

## Notifications

- Email.
- SMS where configured.
- In-platform notifications.

## Background jobs

Use a queue for:

- Notifications.
- Vacancy opening and closing.
- Assessment auto-submission.
- Offer expiry.
- Reminder delivery.
- Course deadlines.
- Document expiry checks.
- Readiness alerts.

---

# 6. Suggested repository structure

```text
frad-recruitment-platform/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── careers/
│   │   │   ├── candidate/
│   │   │   ├── recruitment/
│   │   │   ├── preboarding/
│   │   │   ├── admin/
│   │   │   ├── api/
│   │   │   └── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   └── styles/
│   └── worker/
│       ├── jobs/
│       ├── notifications/
│       └── schedules/
├── packages/
│   ├── database/
│   ├── auth/
│   ├── validation/
│   ├── permissions/
│   ├── notifications/
│   ├── shared-types/
│   └── ui/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
├── docs/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── docker-compose.yml
├── README.md
└── package.json
```

---

# 7. User roles

## 7.1 Public visitor

Can:

- View published vacancies.
- Search and filter vacancies.
- Read vacancy details.
- Read recruitment guidance.
- Register or sign in.

Cannot:

- View internal recruitment information.
- Access candidate records.

## 7.2 Candidate

Can:

- Create and manage a reusable profile.
- Upload profile documents.
- Apply for vacancies.
- Save draft applications.
- Submit applications.
- View simplified status.
- Receive assessment and interview invitations.
- Respond to invitations.
- Accept or decline an offer.
- Complete preboarding forms.
- Upload required documents.
- Read and sign policies.
- Complete courses and quizzes.
- Complete assigned tasks.
- View reporting and travel information.
- Communicate with HR.
- Confirm start date.
- Withdraw an application.

Cannot:

- View internal reviewer comments.
- View panel scores.
- View reference reports.
- View other candidates.
- Access the FRAD ERP.

## 7.3 Recruitment officer

Can:

- Create and manage vacancies.
- Configure application questions.
- Review applications.
- Assign reviewers.
- Move candidates through approved stages.
- Schedule assessments and interviews.
- Send candidate messages.
- Record references.
- Prepare offers.
- Assign preboarding packages.
- Review forms and documents.
- Confirm readiness and resumption.
- Generate ERP handover summaries.

## 7.4 HR manager

Can perform recruitment officer functions and may also:

- Approve vacancies where required.
- Approve final selection.
- Approve offers.
- Approve waivers.
- View restricted HR information.
- Configure templates and workflows.
- Reopen locked records with a reason.

## 7.5 Hiring manager

Can:

- View assigned vacancies.
- Review assigned candidates.
- Complete screening scorecards.
- Participate in interviews.
- Recommend candidates.

Cannot normally view:

- Bank details.
- Pension information.
- Medical information.
- Restricted safeguarding declarations.
- Reference details not required for their role.

## 7.6 Panel member

Can:

- View assigned candidates.
- Complete conflict-of-interest declarations.
- View approved interview questions.
- Submit independent scores and comments.

Cannot:

- See other panel scores before submitting.
- Edit another member's score.
- Access preboarding information.

## 7.7 Referee

Uses a secure, time-limited link to:

- Confirm identity.
- Complete a reference form.
- Submit one response.

A referee does not need a normal platform account.

## 7.8 Approver

Can:

- Approve.
- Reject.
- Return for clarification.
- Approve with conditions.

## 7.9 Course administrator

Can:

- Create courses.
- Upload course materials.
- Create quizzes.
- Create course packages.
- Review completion.
- Reset attempts where authorized.

## 7.10 System administrator

Can:

- Manage internal accounts.
- Assign roles.
- Configure platform settings.
- Manage system templates.
- View technical logs.

System administrators should not automatically receive access to confidential candidate content.

## 7.11 Auditor

Can:

- View recruitment records.
- View approval history.
- View audit logs.
- Export authorized reports.

Cannot edit records.

---

# 8. Role-based access control

Permissions should use a consistent format:

```text
resource.action.scope
```

Examples:

```text
vacancy.create.all
vacancy.update.assigned
application.read.assigned
application.score.assigned
offer.approve.all
preboarding.document.review.assigned
audit.read.all
```

Authorization must be restricted by:

- Role.
- Vacancy assignment.
- Candidate assignment.
- Department.
- Project.
- Duty station.
- Candidate stage.
- Data sensitivity.

Sensitive data classes:

1. Standard application data.
2. Recruitment evaluations.
3. References.
4. Identity documents.
5. Bank, tax and pension data.
6. Medical and accessibility information.
7. Safeguarding and misconduct declarations.

Every API endpoint must enforce authorization. Hiding a button in the interface is not sufficient.

---

# 9. Public careers portal

## 9.1 Careers landing page

Include:

- FRAD recruitment introduction.
- Open vacancies.
- Search.
- Filters.
- Recruitment process summary.
- Safeguarding statement.
- Equal opportunity statement.
- Fraud warning.
- Statement that FRAD does not charge recruitment fees.
- Frequently asked questions.
- Sign-in and registration links.
- Recruitment fraud reporting link.

## 9.2 Vacancy listing

Each card should show:

- Job title.
- Duty station.
- Department or project.
- Contract type.
- Closing date.
- Vacancy reference.
- Number of positions where appropriate.
- View details action.

Filters:

- Department.
- Project.
- Duty station.
- State.
- Contract type.
- Job category.
- Closing date.
- Keyword.

## 9.3 Vacancy details page

Display:

- Job title.
- Reference number.
- Department.
- Project.
- Duty station.
- Contract type.
- Contract duration.
- Reporting line.
- Number of positions.
- Job summary.
- Responsibilities.
- Essential qualifications.
- Desirable qualifications.
- Required experience.
- Skills.
- Languages.
- Travel requirement.
- Safeguarding responsibilities.
- Required documents.
- Opening and closing dates.
- Application instructions.
- Apply button.
- Print view.
- Privacy notice.
- Fraud warning.

## 9.4 Public vacancy rules

- Draft vacancies must never be visible.
- Scheduled vacancies become visible only at the opening time.
- Closed vacancies cannot accept applications.
- Cancelled vacancies should display a cancellation notice if they were previously public.
- Completed vacancies may be hidden after a configurable period.

---

# 10. Candidate authentication

## 10.1 Registration fields

- Full name.
- Email.
- Phone number.
- Password.
- Password confirmation.
- Privacy agreement.
- Terms agreement.

Rules:

- Email must be unique.
- Phone number should be normalized.
- Email verification is mandatory before application submission.
- Passwords must meet security requirements.
- Duplicate accounts should be detected where reasonably possible.

## 10.2 Sign-in functions

- Email and password.
- Remember me.
- Password reset.
- Failed-login throttling.
- Account lockout.
- Optional one-time code.

## 10.3 Account recovery

The candidate should be able to:

- Reset a password.
- Change email after verification.
- Change phone number.
- Request account closure.

---

# 11. Candidate profile

The profile should be reusable across applications.

## 11.1 Personal information

- Legal first name.
- Middle name.
- Last name.
- Preferred name.
- Email.
- Primary phone.
- Alternative phone.
- Nationality.
- Country of residence.
- State.
- LGA.
- Current city or town.
- Address.
- Preferred communication channel.
- Willingness to relocate.
- Preferred duty locations.
- Earliest available start date.
- Languages and proficiency.

Avoid collecting information that is unnecessary at the initial application stage.

## 11.2 Education

Allow multiple records with:

- Institution.
- Qualification.
- Field of study.
- Country.
- Start year.
- Completion year.
- Grade or classification.
- Certificate upload.
- Verification status.

## 11.3 Employment history

Allow multiple records with:

- Employer.
- Job title.
- Employment type.
- Country.
- State.
- Location.
- Start date.
- End date.
- Current role indicator.
- Responsibilities.
- Reason for leaving.
- Supervisor name.
- Supervisor email.
- Supervisor phone.
- Permission to contact.

## 11.4 Professional licences

- Professional body.
- Licence type.
- Registration number.
- Issue date.
- Expiry date.
- Evidence upload.
- Verification status.

## 11.5 Skills and certifications

- Skill or certification name.
- Issuing body.
- Issue date.
- Expiry date.
- Credential number.
- Supporting document.
- Category.

## 11.6 Candidate document library

Reusable documents may include:

- CV.
- Cover letter template.
- Academic certificates.
- Professional licences.
- NYSC certificate or exemption.
- Driver's licence.
- Passport photograph.
- Portfolio.
- Writing sample.

Each file should have:

- Type.
- Upload date.
- Expiry date where applicable.
- Verification status.
- Candidate note.
- Reuse permission.

## 11.7 Profile completion

Show:

- Completion percentage.
- Missing fields.
- Missing documents.
- Expired documents.
- Sections requiring attention.

A profile may remain incomplete, but a vacancy application cannot be submitted until all vacancy-specific requirements are met.

---

# 12. Vacancy management

## 12.1 Vacancy fields

- Internal ID.
- Vacancy reference number.
- Job title.
- Department.
- Project.
- Job category.
- Duty station.
- State.
- LGA.
- Number of positions.
- Contract type.
- Contract duration.
- Reporting line.
- Job summary.
- Responsibilities.
- Essential qualifications.
- Desirable qualifications.
- Minimum years of experience.
- Desired experience.
- Language requirements.
- Technical skills.
- Behavioural competencies.
- Safeguarding responsibilities.
- Travel requirement.
- Opening date and time.
- Closing date and time.
- Contact person.
- Application form template.
- Screening scorecard.
- Assessment requirement.
- Interview scorecard.
- Required application documents.
- Preboarding package.
- Recruitment owner.
- Status.

## 12.2 Vacancy statuses

```text
DRAFT
PENDING_APPROVAL
SCHEDULED
OPEN
PAUSED
CLOSED
CANCELLED
COMPLETED
ARCHIVED
```

## 12.3 Vacancy actions

- Create.
- Edit.
- Save draft.
- Preview.
- Submit for approval.
- Approve.
- Schedule.
- Publish.
- Pause.
- Resume.
- Extend deadline.
- Close.
- Cancel.
- Duplicate.
- Archive.

Every sensitive action must create an audit log.

## 12.4 Vacancy duplication

Copy:

- Job details.
- Application questions.
- Required documents.
- Scorecards.
- Assessment settings.
- Interview questions.
- Preboarding package.

Do not copy:

- Applicants.
- Scores.
- Dates.
- Interviews.
- References.
- Offers.
- Approvals.

---

# 13. Application form builder

## 13.1 Field types

- Short text.
- Long text.
- Number.
- Date.
- Yes or no.
- Single select.
- Multi-select.
- Dropdown.
- File upload.
- Declaration checkbox.
- Information block.
- Repeated group.
- Rating scale.

## 13.2 Field settings

- Label.
- Help text.
- Placeholder.
- Required status.
- Minimum and maximum length.
- Allowed file types.
- Maximum file size.
- Validation rule.
- Conditional visibility.
- Display order.
- Scoring eligibility.
- Candidate-visible status.

## 13.3 Conditional logic examples

- If a candidate has a professional licence, request number, expiry date and evidence.
- If a candidate previously worked for FRAD, request position, dates and reason for departure.
- If a candidate is related to a FRAD staff member, request the person's name and relationship.
- If a candidate requires accommodation, display a confidential explanation field.
- If a candidate is willing to relocate, request preferred locations.

## 13.4 Candidate declarations

Before submission, the candidate must confirm:

- Information is accurate.
- Documents are authentic.
- FRAD may verify information.
- FRAD does not charge recruitment fees.
- False information may lead to disqualification.
- Conflicts of interest have been disclosed.
- The privacy notice is accepted.

---

# 14. Application management

## 14.1 Internal statuses

```text
DRAFT
SUBMITTED
UNDER_REVIEW
LONGLISTED
INELIGIBLE
SHORTLISTED
ASSESSMENT_INVITED
ASSESSMENT_IN_PROGRESS
ASSESSMENT_COMPLETED
INTERVIEW_INVITED
INTERVIEW_CONFIRMED
INTERVIEW_COMPLETED
REFERENCE_CHECK
RECOMMENDED
RESERVE
NOT_SELECTED
OFFER_DRAFT
OFFER_SENT
OFFER_ACCEPTED
OFFER_DECLINED
OFFER_EXPIRED
PREBOARDING
READY_TO_RESUME
RESUMED
DID_NOT_RESUME
TRANSFERRED_TO_ERP
WITHDRAWN
CANCELLED
ARCHIVED
```

## 14.2 Candidate-visible statuses

```text
APPLICATION_DRAFT
APPLICATION_RECEIVED
UNDER_REVIEW
SHORTLISTED
ASSESSMENT_STAGE
INTERVIEW_STAGE
OFFER_SENT
PREBOARDING_IN_PROGRESS
READY_TO_RESUME
UNSUCCESSFUL
RECRUITMENT_COMPLETED
```

## 14.3 Application record

- Application ID.
- Candidate ID.
- Vacancy ID.
- Submission date.
- Answers.
- Attachments.
- Internal status.
- Candidate-visible status.
- Assigned reviewer.
- Eligibility result.
- Screening score.
- Assessment score.
- Interview score.
- Final score.
- Reference status.
- Recommendation.
- Offer status.
- Preboarding status.
- Audit history.

## 14.4 Draft application

Candidates should be able to:

- Save progress.
- Continue later.
- See missing requirements.
- Delete a draft.
- Submit before the deadline.

Auto-save should be used where possible.

## 14.5 Submission rules

An application may be submitted only when:

- The vacancy is open.
- Email is verified.
- Mandatory fields are complete.
- Required files are uploaded.
- Required declarations are accepted.
- The candidate has not already submitted for the same vacancy.

After submission:

- Send confirmation.
- Lock candidate editing.
- Preserve a snapshot of profile and application values.
- Allow corrections only through a controlled HR-return workflow.

---

# 15. Applicant review workspace

The review page should show:

- Candidate list.
- Profile summary.
- Application answers.
- Required documents.
- Eligibility result.
- Screening score.
- Current stage.
- Assigned reviewer.
- Notes.
- Activity timeline.

## 15.1 Filters

- Status.
- Qualification.
- Years of experience.
- Location.
- Professional licence.
- Assessment score.
- Interview score.
- Final score.
- Assigned reviewer.
- Date applied.
- Candidate name.
- Keyword.

## 15.2 Bulk actions

- Assign reviewer.
- Send message.
- Move to review.
- Invite to assessment.
- Invite to interview.
- Mark unsuccessful.
- Export approved data.

High-risk bulk actions require confirmation.

## 15.3 Internal notes

Categories:

- General recruitment note.
- Screening note.
- Assessment note.
- Interview note.
- Reference note.
- Preboarding note.
- Restricted HR-only note.

Record author and timestamp for every note.

---

# 16. Screening and longlisting

## 16.1 Scorecard

Example:

| Criterion | Maximum score |
|---|---:|
| Required qualification | 10 |
| Relevant experience | 25 |
| NGO or humanitarian experience | 15 |
| Technical experience | 20 |
| Duty-location experience | 10 |
| Communication and application quality | 10 |
| Additional relevant skills | 10 |

Each criterion should contain:

- Name.
- Description.
- Maximum score.
- Weight.
- Required status.
- Minimum acceptable score.
- Reviewer guidance.
- Evidence field.
- Comment requirement.

## 16.2 Workflow

1. HR assigns a reviewer.
2. Reviewer completes a conflict-of-interest declaration.
3. Reviewer checks evidence.
4. Reviewer scores every mandatory criterion.
5. Reviewer adds comments.
6. Reviewer submits outcome.
7. HR confirms longlist or ineligibility.

## 16.3 Outcomes

- Meets requirements.
- Does not meet requirements.
- Requires clarification.
- Longlisted.
- Ineligible.

## 16.4 Ineligibility reason codes

- Qualification not met.
- Experience not met.
- Mandatory licence missing.
- Required document missing.
- Application incomplete.
- Application received after deadline.
- Candidate unavailable.
- Duty station requirement not met.
- Duplicate application.
- False or inconsistent information.
- Other, with explanation.

Automatic checks may flag issues, but the system must not make final rejection decisions without human review.

---

# 17. Conflict-of-interest management

Before reviewing or interviewing a candidate, each reviewer must declare:

- No conflict.
- Family relationship.
- Personal relationship.
- Previous supervisory relationship.
- Previous colleague relationship.
- Financial relationship.
- Other potential conflict.

When a conflict is declared:

- HR receives an alert.
- The reviewer may be blocked from scoring the candidate.
- HR may assign another reviewer.
- Any approved exception must contain written justification.
- The declaration remains in the audit record.

---

# 18. Assessment management

## 18.1 Supported assessment types

- Online multiple-choice test.
- Online short-answer test.
- Essay.
- Scenario-based assessment.
- File-upload exercise.
- Offline written test.
- Practical test.
- Presentation.
- Driving test.
- Spreadsheet exercise.
- Clinical or technical simulation.

## 18.2 Assessment configuration

- Title.
- Description.
- Instructions.
- Assessment type.
- Duration.
- Opening date and time.
- Closing date and time.
- Pass mark.
- Maximum attempts.
- Auto-submit setting.
- Randomized question order.
- Question set.
- Marker.
- Result release setting.
- Candidate accommodation.

## 18.3 Online question types

- Multiple choice.
- Multiple response.
- True or false.
- Short text.
- Long text.
- Number.
- File upload.

## 18.4 Candidate assessment experience

Show:

- Title.
- Instructions.
- Deadline.
- Duration.
- Start button.
- Timer after starting.
- Question navigation.
- Save progress.
- Submission confirmation.
- Completion confirmation.

Record:

- Invitation date.
- Start date and time.
- Submission date and time.
- Whether auto-submitted.
- Status.
- Score.
- Marker.
- Comments.

## 18.5 Offline assessment record

- Date.
- Venue.
- Attendance.
- Invigilator.
- Score.
- Pass or fail.
- Marker.
- Comments.
- Uploaded script.
- Uploaded score sheet.

## 18.6 Assessment statuses

```text
NOT_ASSIGNED
INVITED
NOT_STARTED
IN_PROGRESS
SUBMITTED
AUTO_SUBMITTED
AWAITING_MARKING
MARKED
PASSED
FAILED
ABSENT
WITHDRAWN
CANCELLED
```

A highly complex remote-proctoring system is not required for the initial release.

---

# 19. Interview management

## 19.1 Interview setup

- Interview title.
- Candidate.
- Vacancy.
- Date.
- Start and end time.
- Time zone.
- Venue.
- Meeting link.
- Interview format.
- Panel members.
- Chairperson.
- HR representative.
- Candidate instructions.
- Attachments.
- Reminder schedule.

## 19.2 Candidate response

The candidate can:

- Confirm attendance.
- Request rescheduling.
- Decline.
- Request accommodation.
- Ask a question.

## 19.3 Attendance statuses

```text
INVITED
CONFIRMED
RESCHEDULE_REQUESTED
RESCHEDULED
ATTENDED
DID_NOT_ATTEND
WITHDREW
CANCELLED
```

## 19.4 Interview question bank

Questions may be grouped by:

- Technical knowledge.
- Relevant experience.
- Problem-solving.
- Communication.
- Teamwork.
- Safeguarding.
- Humanitarian principles.
- Motivation.
- Leadership.
- Ethical judgement.
- Duty-station readiness.

Each question should contain:

- Question text.
- Competency.
- Guidance.
- Expected evidence.
- Red flags.
- Maximum score.
- Mandatory comment setting.

## 19.5 Panel scoring

Each panel member must:

1. Declare conflict of interest.
2. Score independently.
3. Add comments.
4. Submit the scorecard.
5. Confirm final submission.

The system must:

- Hide other panel scores until submission.
- Calculate individual totals.
- Calculate average panel score.
- Show unusually large scoring variance to HR.
- Prevent score changes after submission unless HR reopens the scorecard.
- Audit every score change.

## 19.6 Final interview outcomes

- Recommended.
- Reserve.
- Not recommended.
- Additional assessment required.
- Reference check required before decision.

---

# 20. Reference checks

## 20.1 Referee record

- Candidate.
- Referee name.
- Organization.
- Position.
- Relationship to candidate.
- Email.
- Phone.
- Period known.
- Candidate permission to contact.
- Preferred contact method.

## 20.2 Reference methods

HR should be able to:

- Send a secure digital reference form.
- Record a telephone reference.
- Upload an emailed reference.
- Send reminders.
- Mark unable to contact.

## 20.3 Reference questions

Recommended questions:

- Confirm employment dates.
- Confirm position.
- Confirm responsibilities.
- Comment on work quality.
- Comment on reliability.
- Comment on integrity.
- Comment on teamwork.
- Comment on management ability where relevant.
- State reason for leaving.
- State eligibility for re-employment.
- State any safeguarding concern.
- State any disciplinary concern.
- Recommend or do not recommend.
- Add comments.

## 20.4 Reference statuses

```text
NOT_REQUIRED
PENDING
REQUEST_SENT
REMINDER_SENT
RESPONSE_RECEIVED
VERIFIED
SATISFACTORY
SATISFACTORY_WITH_CONCERNS
UNSATISFACTORY
UNABLE_TO_VERIFY
WAIVED
```

Reference information is confidential and should not be visible to the candidate or ordinary panel members.

---

# 21. Final selection

## 21.1 Selection summary

Display:

- Screening score.
- Assessment score.
- Interview score.
- Final weighted score.
- Reference status.
- Panel recommendation.
- HR comment.
- Final decision.

## 21.2 Score weights

Weights must be configurable per vacancy and total 100 percent.

Example with assessment:

```text
Screening: 20%
Assessment: 30%
Interview: 50%
```

Example without assessment:

```text
Screening: 30%
Interview: 70%
```

## 21.3 Selection outcomes

- Selected candidate.
- First reserve.
- Second reserve.
- Not selected.
- Additional review required.

## 21.4 Approval workflow

Use a simple configurable workflow such as:

1. HR recommendation.
2. Hiring manager approval.
3. Final approver.
4. Offer preparation.

Approver actions:

- Approve.
- Reject.
- Return for clarification.
- Approve with condition.

Record approver, date, decision and comment.

## 21.5 Ranking override

If a candidate other than the highest-ranked person is selected, require:

- Written justification.
- HR manager approval.
- Final approver confirmation.
- Audit log entry.

---

# 22. Offer management

## 22.1 Offer template variables

```text
{{candidate_name}}
{{job_title}}
{{duty_station}}
{{department}}
{{project}}
{{contract_type}}
{{contract_duration}}
{{start_date}}
{{end_date}}
{{salary}}
{{probation_period}}
{{reporting_line}}
{{acceptance_deadline}}
```

## 22.2 Offer fields

- Candidate.
- Vacancy.
- Template.
- Position.
- Duty station.
- Contract type.
- Contract duration.
- Salary or compensation.
- Proposed start date.
- End date.
- Probation period.
- Reporting line.
- Conditions.
- Acceptance deadline.
- Approver.
- Offer document.
- Signed candidate document.

## 22.3 Offer statuses

```text
DRAFT
PENDING_APPROVAL
APPROVED
SENT
VIEWED
ACCEPTED
DECLINED
EXPIRED
WITHDRAWN
SUPERSEDED
```

## 22.4 Candidate actions

- View.
- Download.
- Accept.
- Decline.
- Request clarification.
- Propose a different start date.
- Upload a signed copy.
- Add a comment.

## 22.5 Acceptance record

Store:

- Decision.
- Date and time.
- Confirmed start date.
- Candidate comment.
- Electronic signature.
- Signed document.
- Device or IP information where lawful and proportionate.

Offer acceptance automatically starts preboarding.

---

# 23. Preboarding module

Preboarding begins immediately after offer acceptance and ends after actual resumption and manual ERP transfer.

## 23.1 Candidate preboarding dashboard

Show:

- Position.
- Duty station.
- Department.
- Project.
- Confirmed start date.
- Reporting location.
- HR contact.
- Supervisor or reporting contact where available.
- Overall completion percentage.
- Forms.
- Uploaded documents.
- Documents and policies to sign.
- Courses.
- Tasks.
- Meetings.
- Reporting and travel information.
- Messages.
- Readiness status.

## 23.2 Preboarding statuses

```text
NOT_STARTED
IN_PROGRESS
AWAITING_CANDIDATE
AWAITING_HR_REVIEW
ACTION_REQUIRED
READY_TO_RESUME
OVERDUE
ON_HOLD
WITHDRAWN
COMPLETED
```

## 23.3 Completion calculation

Completion should be based on mandatory items only.

Recommended categories:

- Forms.
- Uploaded documents.
- Signed documents.
- Courses.
- Tasks.
- Meetings.
- Final HR checks.

Example:

```text
Forms: 100%
Documents: 80%
Policies: 100%
Courses: 75%
Tasks: 90%
Overall mandatory completion: 88%
```

Optional items must not block readiness.

---

# 24. Preboarding packages

HR should create reusable packages such as:

- General employee package.
- Consultant package.
- Intern package.
- Volunteer package.
- Driver package.
- Health staff package.
- Nutrition staff package.
- Finance and procurement package.
- MEAL package.
- Manager package.
- Field deployment package.

A package may contain:

- Forms.
- Document requirements.
- Policies and agreements.
- Courses.
- Tasks.
- Meetings.
- Information pages.
- Readiness rules.

Packages may be combined. Example:

```text
General Employee Package
+ Health Staff Package
+ Field Deployment Package
```

When an offer is accepted, the system should assign the package configured for the vacancy. HR may add or remove packages before final assignment.

---

# 25. Pre-employment forms

## 25.1 Form types

- Personal information form.
- Residential address form.
- Emergency contact form.
- Next-of-kin form.
- Bank details form.
- Pension form.
- Tax information form.
- Professional licence form.
- Conflict-of-interest declaration.
- Previous employment declaration.
- FRAD staff relationship declaration.
- Medical fitness status form.
- Accessibility request form.
- Deployment readiness form.

## 25.2 Form settings

- Title.
- Description.
- Candidate category.
- Mandatory status.
- Due date.
- Field schema.
- HR review requirement.
- Version.
- Status.

## 25.3 Form statuses

```text
NOT_STARTED
IN_PROGRESS
SUBMITTED
UNDER_REVIEW
APPROVED
RETURNED
RESUBMITTED
WAIVED
```

## 25.4 Restricted forms

Access to the following must be limited:

- Bank details.
- Pension information.
- Medical information.
- Accessibility requests.
- Next-of-kin information.

---

# 26. Required document submission

## 26.1 Possible requirements

- Passport photograph.
- National identification.
- Academic certificate.
- NYSC certificate or exemption.
- Professional licence.
- Driver's licence.
- Bank verification document.
- Pension evidence.
- Tax identification.
- Medical fitness certificate.
- Guarantor form.
- Previous employment clearance.
- Signed offer.
- Signed contract draft.
- Role-specific evidence.

## 26.2 Requirement settings

- Name.
- Description.
- Candidate type.
- Mandatory status.
- Allowed file types.
- Maximum file size.
- Expiry date requirement.
- Verification requirement.
- Due date.
- Whether multiple files are allowed.
- Sensitivity classification.

## 26.3 Review workflow

1. Candidate uploads a file.
2. File is scanned.
3. Status becomes submitted.
4. HR reviews.
5. HR approves or rejects.
6. Rejection requires a reason.
7. Candidate receives a notification.
8. Candidate resubmits.
9. Previous versions remain in the audit history.

## 26.4 Document statuses

```text
NOT_SUBMITTED
UPLOADING
SCAN_PENDING
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
RESUBMISSION_REQUIRED
EXPIRED
WAIVED
```

Example HR rejection comment:

> The professional licence uploaded expired in March 2026. Please upload a current licence.

---

# 27. Policies and documents to read and sign

## 27.1 Supported document types

- Offer letter.
- Employment contract draft.
- Job description.
- Code of conduct.
- Safeguarding policy.
- PSEA policy.
- Child safeguarding policy.
- Anti-fraud and anti-corruption policy.
- Conflict-of-interest policy.
- Confidentiality agreement.
- Data protection policy.
- ICT acceptable-use policy.
- Social-media policy.
- Whistleblowing policy.
- Security policy.
- Staff handbook.
- Health and safety policy.
- Other FRAD policy.

## 27.2 Document settings

- Title.
- Category.
- Version.
- Effective date.
- File.
- Summary.
- Mandatory status.
- Acknowledgement method.
- Signature method.
- Due date.
- Applicable candidate types.
- Applicable roles.
- Applicable locations.

## 27.3 Acknowledgement and signature methods

- Read and acknowledge.
- Type full legal name.
- Draw signature.
- Upload signed copy.
- One-time code confirmation.
- Combined acknowledgement and upload.

Important documents such as contracts, confidentiality agreements and codes of conduct should require stronger evidence than a simple checkbox.

## 27.4 Signature record

Store:

- Candidate.
- Document.
- Document version.
- Date opened.
- Date acknowledged.
- Date signed.
- Signature method.
- Signature data.
- Signed file.
- Device or IP information where appropriate.
- HR verification.

## 27.5 Statuses

```text
NOT_ASSIGNED
ASSIGNED
NOT_VIEWED
VIEWED
ACKNOWLEDGED
SIGNED
AWAITING_HR_REVIEW
APPROVED
REJECTED
SUPERSEDED
WAIVED
```

If a policy version changes before resumption, HR should be able to assign the new version and mark the earlier one as superseded.

---

# 28. Compulsory courses

## 28.1 Core pre-resumption courses

Recommended for all successful candidates:

1. Introduction to FRAD.
2. FRAD mission, values and operating areas.
3. Code of conduct.
4. Safeguarding.
5. Prevention of sexual exploitation and abuse.
6. Child safeguarding.
7. Fraud, bribery and corruption awareness.
8. Confidentiality and data protection.
9. Security awareness.
10. Whistleblowing and incident reporting.
11. Humanitarian principles.
12. Accountability to affected populations.

## 28.2 Role-specific courses

### Health and nutrition

- Patient confidentiality.
- Infection prevention and control.
- Clinical documentation.
- Safeguarding in service delivery.
- Referral pathways.
- Technical reporting.
- Relevant protocols.

### Finance and procurement

- FRAD financial procedures.
- Procurement procedures.
- Fraud controls.
- Conflict of interest.
- Approval and documentation rules.

### Drivers

- Defensive driving.
- Vehicle inspection.
- Incident reporting.
- Fleet procedures.
- Movement and security protocols.

### MEAL

- Informed consent.
- Data protection.
- Data quality.
- Safe data collection.
- Complaints and feedback.

### Managers

- Staff supervision.
- Safeguarding leadership.
- Incident escalation.
- Budget responsibility.
- Recruitment responsibilities.
- Performance expectations.

## 28.3 Course fields

- Title.
- Description.
- Category.
- Version.
- Learning objectives.
- Reading material.
- Video.
- Slides.
- Attachments.
- Estimated duration.
- Quiz.
- Pass mark.
- Allowed attempts.
- Deadline.
- Certificate setting.
- Mandatory timing.

## 28.4 Mandatory timing

- Before resumption.
- Within first week.
- Within first month.
- Optional.

Only courses classified as before resumption should block readiness.

## 28.5 Course statuses

```text
NOT_ASSIGNED
ASSIGNED
NOT_STARTED
IN_PROGRESS
QUIZ_PENDING
COMPLETED
FAILED
OVERDUE
WAIVED
EXPIRED
```

## 28.6 Quiz types

- Multiple choice.
- Multiple response.
- True or false.
- Short response.

Record:

- Attempt number.
- Start time.
- Completion time.
- Score.
- Pass or fail.
- Answers.

---

# 29. Pre-resumption tasks

## 29.1 Example tasks

- Confirm start date.
- Confirm duty station.
- Upload passport photograph.
- Submit identity document.
- Complete next-of-kin form.
- Submit bank details.
- Sign code of conduct.
- Sign safeguarding policy.
- Complete security course.
- Complete PSEA course.
- Confirm travel arrangement.
- Attend orientation.
- Contact assigned HR officer.
- Confirm reporting instructions.
- Bring original certificates on the first day.
- Complete medical clearance.
- Submit updated professional licence.

## 29.2 Task fields

- Title.
- Description.
- Category.
- Assigned to.
- Assigned by.
- Due date.
- Mandatory status.
- Candidate action.
- Evidence requirement.
- HR review requirement.
- Dependency.
- Status.
- Comments.

## 29.3 Task statuses

```text
NOT_STARTED
IN_PROGRESS
SUBMITTED
AWAITING_REVIEW
APPROVED
RETURNED
COMPLETED
OVERDUE
WAIVED
CANCELLED
```

## 29.4 Dependencies

Examples:

- Bank details may depend on approved identification.
- Travel confirmation may depend on duty-station confirmation.
- Readiness depends on all mandatory tasks.

---

# 30. Things to know before resumption

The platform should provide candidate-specific practical information.

## 30.1 General reporting information

- Confirmed start date.
- Reporting time.
- Reporting location.
- Office or facility address.
- Map link.
- HR contact.
- Supervisor or contact person.
- Working hours.
- First-day schedule.
- Physical documents to bring.
- Dress or protective equipment requirements.
- Whether the first day is physical or remote.
- Equipment the candidate should bring.
- Equipment FRAD will provide.
- Contact process if delayed.

## 30.2 Travel and deployment information

Where applicable:

- Travel date.
- Departure point.
- Arrival point.
- Approved travel route.
- Vehicle or flight details.
- Pickup contact.
- Accommodation arrangement.
- Security restrictions.
- Required travel documents.
- Required vaccination or medical clearance.
- Items to bring.
- Communication arrangements.
- Emergency contact.

## 30.3 Required acknowledgement

HR may require confirmation that:

- Reporting instructions were received.
- Duty station is understood.
- Travel arrangements are accepted.
- Security instructions are understood.
- Start date is confirmed.

---

# 31. Meetings and orientation

## 31.1 Meeting types

- Welcome call.
- HR orientation.
- Safeguarding briefing.
- Security briefing.
- Project introduction.
- Supervisor introduction.
- Duty-station orientation.
- Travel briefing.
- Technical orientation.

## 31.2 Meeting record

- Title.
- Description.
- Candidate.
- Facilitator.
- Date.
- Start and end time.
- Time zone.
- Venue.
- Meeting link.
- Materials.
- Candidate confirmation.
- Attendance.
- Notes.
- Mandatory status.

## 31.3 Meeting statuses

```text
SCHEDULED
INVITED
CONFIRMED
ATTENDED
MISSED
RESCHEDULED
CANCELLED
WAIVED
```

The platform does not need a built-in video meeting service. It should store Google Meet, Zoom or Microsoft Teams links.

---

# 32. Candidate and HR messaging

## 32.1 Message categories

- General.
- Document request.
- Course reminder.
- Offer clarification.
- Start date.
- Travel.
- Reporting instructions.
- Preboarding issue.
- Resumption delay.

## 32.2 Message fields

- Sender.
- Recipient.
- Application.
- Subject.
- Message.
- Attachment.
- Date.
- Read status.
- Category.
- Confidential status.

A message may trigger:

- Email.
- SMS.
- In-platform notification.

All messages must remain attached to the candidate's record.

---

# 33. Readiness to resume

## 33.1 Recommended readiness checks

- Offer accepted.
- Start date confirmed.
- Identity document approved.
- Required qualifications approved.
- Professional licence approved where applicable.
- Mandatory forms approved.
- Mandatory policies signed.
- Mandatory pre-resumption courses completed.
- Mandatory tasks completed.
- Required meetings attended.
- Reporting instructions acknowledged.
- Reference check satisfactory.
- Medical clearance complete where required.
- HR final review complete.

## 33.2 Readiness statuses

```text
NOT_READY
PENDING_CANDIDATE
PENDING_HR_REVIEW
CONDITIONALLY_READY
READY_TO_RESUME
ON_HOLD
```

## 33.3 Waivers

An authorized HR manager may waive a requirement. Store:

- Requirement.
- Reason.
- Approver.
- Date.
- Follow-up or expiry date.
- Comment.

## 33.4 Readiness action

Button:

```text
Confirm Candidate Ready to Resume
```

Generate a readiness summary with:

- Candidate details.
- Position.
- Duty station.
- Resumption date.
- Completed requirements.
- Outstanding non-blocking requirements.
- Waivers.
- HR clearance officer.
- Clearance date.

---

# 34. Resumption management

## 34.1 Outcomes

- Resumed.
- Did not resume.
- Resumption postponed.
- Candidate withdrew.
- Offer withdrawn.

## 34.2 Resumption record

- Planned start date.
- Actual start date.
- Reporting location.
- Confirmed by.
- Supervisor confirmation.
- Outstanding items.
- Comment.
- Outcome.

## 34.3 Did not resume workflow

Record:

- Reason.
- Contact attempts.
- Whether a new start date is proposed.
- Whether the offer remains valid.
- Whether a reserve candidate will be considered.

---

# 35. Manual ERP handover

## 35.1 Candidate handover summary

After confirmed resumption, generate a structured summary containing:

- Full legal name.
- Preferred name.
- Email.
- Phone.
- Photograph.
- Residential address.
- Position.
- Department.
- Project.
- Duty station.
- Supervisor.
- Contract type.
- Start date.
- End date.
- Salary or grade.
- Qualifications.
- Professional licence.
- Emergency contact.
- Bank details.
- Pension details.
- Tax information.
- Accepted offer.
- Signed policies and agreements.
- Completed courses.
- Approved documents.
- Readiness summary.
- Actual resumption date.

## 35.2 ERP transfer action

Button:

```text
Mark as Created in ERP
```

Required fields:

- ERP personnel number.
- Date created in ERP.
- Created by.
- Comment.

This action must not call the ERP.

## 35.3 Transfer statuses

```text
NOT_READY
READY_FOR_ERP_ENTRY
CREATED_IN_ERP
TRANSFER_CONFIRMED
ARCHIVED
```

## 35.4 Post-transfer behaviour

- Candidate recruitment and preboarding records become read-only.
- Candidate may retain read-only access to personal records and signed documents if FRAD chooses.
- HR can view and export the final record.
- No ongoing employee activities occur on this platform.
- Corrections require authorized reopening and audit logging.

---

# 36. Dashboards

## 36.1 HR recruitment dashboard

Widgets:

- Open vacancies.
- Vacancies closing soon.
- Applications received.
- Applications awaiting review.
- Candidates awaiting assessment.
- Interviews scheduled.
- References pending.
- Offers awaiting approval.
- Offers awaiting candidate response.
- Active preboarding candidates.
- Candidates resuming within seven days.
- Candidates not ready to resume.
- Candidates ready for ERP entry.
- Overdue items.

## 36.2 Hiring manager dashboard

- Assigned vacancies.
- Applicants awaiting review.
- Interviews requiring scores.
- Recommendations awaiting action.
- Upcoming interviews.

## 36.3 Candidate dashboard

- Active applications.
- Simplified status.
- Upcoming assessments.
- Upcoming interviews.
- Current offer.
- Preboarding progress.
- Outstanding requirements.
- Messages.
- Reporting instructions.

## 36.4 Management dashboard

- Active recruitments.
- Vacancies by project.
- Vacancies by duty station.
- Average time to fill.
- Number of applications.
- Offer acceptance rate.
- Recruitment completion rate.
- Candidates in preboarding.
- Delayed resumptions.
- Candidates transferred to ERP.

---

# 37. Reports

## 37.1 Recruitment reports

- Vacancy report.
- Applicant report.
- Recruitment pipeline report.
- Screening report.
- Assessment report.
- Interview score report.
- Selection report.
- Reference status report.
- Offer status report.
- Recruitment completion report.

## 37.2 Preboarding reports

- Preboarding progress report.
- Missing document report.
- Document verification report.
- Policy signature report.
- Course completion report.
- Task completion report.
- Readiness report.
- Upcoming resumption report.
- Delayed resumption report.
- ERP handover report.

## 37.3 Compliance reports

- Missing conflict-of-interest declarations.
- Missing panel scores.
- Manual score changes.
- Waived requirements.
- Expired professional licences.
- Offers sent without required approval.
- Candidates marked ready with mandatory gaps.
- Records changed after closure.
- Sensitive exports.

## 37.4 Export formats

- CSV.
- XLSX.
- PDF.
- Print view.

Sensitive exports require explicit permission and must be audit logged.

---

# 38. Notifications and reminders

## 38.1 Candidate notifications

- Account verification.
- Application draft reminder.
- Application submission confirmation.
- Assessment invitation.
- Assessment reminder.
- Interview invitation.
- Interview reminder.
- Interview reschedule.
- Request for additional information.
- Offer sent.
- Offer deadline reminder.
- Offer acceptance confirmation.
- Preboarding welcome.
- Form assigned.
- Document request.
- Document rejected.
- Policy assigned.
- Course assigned.
- Course deadline reminder.
- Task overdue.
- Reporting instructions.
- Ready-to-resume confirmation.
- Start-date reminder.

## 38.2 Internal notifications

- Vacancy awaiting approval.
- Vacancy closing soon.
- Applications awaiting review.
- Scorecard incomplete.
- Interview panel incomplete.
- Reference overdue.
- Offer awaiting approval.
- Offer expiring.
- Candidate accepted offer.
- Candidate document awaiting review.
- Candidate course overdue.
- Candidate resuming soon.
- Candidate not ready.
- Candidate ready for ERP entry.

## 38.3 Template variables

```text
{{candidate_name}}
{{job_title}}
{{vacancy_reference}}
{{assessment_date}}
{{interview_date}}
{{offer_deadline}}
{{start_date}}
{{duty_station}}
{{hr_contact}}
{{action_link}}
```

Notification delivery should be retryable and idempotent.

---

# 39. Search and filtering

Global search should support:

- Candidate name.
- Email.
- Phone number.
- Vacancy title.
- Vacancy reference.
- Project.
- Department.
- Duty station.
- ERP personnel number after transfer.

Search results must respect permissions and must not reveal restricted data.

---

# 40. Audit trail

Every sensitive or decision-related action must be logged.

## 40.1 Audit fields

- Actor.
- Role.
- Action.
- Resource type.
- Resource ID.
- Date and time.
- Previous value.
- New value.
- Reason.
- IP address where appropriate.
- Device or session identifier.
- Request ID.

## 40.2 Mandatory audit actions

- Vacancy creation.
- Vacancy publication.
- Deadline extension.
- Vacancy cancellation.
- Candidate stage movement.
- Reviewer assignment.
- Score creation and change.
- Conflict-of-interest declaration.
- Assessment result change.
- Interview panel change.
- Selection decision.
- Ranking override.
- Offer generation and withdrawal.
- Offer acceptance or decline.
- Form review.
- Document review.
- Policy signature.
- Course completion.
- Waiver approval.
- Readiness confirmation.
- Resumption confirmation.
- ERP transfer.
- Sensitive data export.
- Role and permission changes.

Normal users must not be able to delete audit logs.

---

# 41. Data model

The following entities are recommended. Names may be adapted to the chosen ORM, but the separation of concerns should remain.

## 41.1 Identity and permissions

### User

- id
- email
- phone
- password_hash
- email_verified_at
- phone_verified_at
- account_status
- last_login_at
- created_at
- updated_at

### Role

- id
- name
- description

### Permission

- id
- code
- description

### UserRole

- id
- user_id
- role_id
- scope_type
- scope_id
- created_at

## 41.2 Candidate profile

### CandidateProfile

- id
- user_id
- legal_first_name
- middle_name
- last_name
- preferred_name
- nationality
- country_of_residence
- state
- lga
- city
- address
- primary_phone
- alternate_phone
- preferred_contact_method
- willingness_to_relocate
- earliest_start_date
- profile_completion_percentage
- created_at
- updated_at

### CandidateEducation

- id
- candidate_id
- institution
- qualification
- field_of_study
- country
- start_year
- completion_year
- grade
- certificate_file_id
- verification_status
- verified_by
- verified_at

### CandidateEmployment

- id
- candidate_id
- employer
- job_title
- employment_type
- country
- state
- location
- start_date
- end_date
- is_current
- responsibilities
- reason_for_leaving
- supervisor_name
- supervisor_email
- supervisor_phone
- permission_to_contact

### CandidateLicence

- id
- candidate_id
- professional_body
- licence_type
- licence_number
- issue_date
- expiry_date
- evidence_file_id
- verification_status
- verified_by
- verified_at

### CandidateCertification

- id
- candidate_id
- name
- issuing_body
- credential_number
- issue_date
- expiry_date
- file_id

### CandidateSkill

- id
- candidate_id
- name
- category
- proficiency

### CandidateLanguage

- id
- candidate_id
- language
- speaking_level
- reading_level
- writing_level

## 41.3 File storage

### FileAsset

- id
- owner_user_id
- storage_key
- original_name
- mime_type
- size_bytes
- checksum
- virus_scan_status
- encryption_status
- sensitivity_class
- created_at

### CandidateDocument

- id
- candidate_id
- file_asset_id
- document_type
- expiry_date
- status
- verified_by
- verified_at
- rejection_reason
- created_at

## 41.4 Vacancy configuration

### Department

- id
- name
- code
- active

### Project

- id
- name
- code
- active

### DutyStation

- id
- name
- state
- lga
- address
- active

### Vacancy

- id
- reference_number
- title
- department_id
- project_id
- category_id
- duty_station_id
- number_of_positions
- contract_type
- contract_duration
- reporting_line
- summary
- responsibilities
- essential_qualifications
- desirable_qualifications
- minimum_experience_years
- desired_experience
- language_requirements
- technical_skills
- behavioural_competencies
- safeguarding_responsibilities
- travel_requirement
- opening_at
- closing_at
- status
- owner_user_id
- screening_scorecard_template_id
- assessment_id
- interview_scorecard_template_id
- preboarding_package_id
- created_at
- updated_at

### VacancyQuestion

- id
- vacancy_id
- field_type
- label
- help_text
- required
- configuration_json
- condition_json
- display_order

### VacancyRequiredDocument

- id
- vacancy_id
- document_type
- required
- allowed_file_types
- maximum_file_size
- expiry_required

## 41.5 Applications

### Application

- id
- candidate_id
- vacancy_id
- internal_status
- candidate_visible_status
- submitted_at
- assigned_reviewer_id
- eligibility_result
- screening_score
- assessment_score
- interview_score
- final_score
- recommendation
- reference_status
- offer_status
- preboarding_status
- created_at
- updated_at

### ApplicationProfileSnapshot

- id
- application_id
- profile_json
- created_at

This preserves the profile values as they existed when the application was submitted.

### ApplicationAnswer

- id
- application_id
- vacancy_question_id
- answer_json

### ApplicationFile

- id
- application_id
- vacancy_question_id
- file_asset_id

### ApplicationNote

- id
- application_id
- author_user_id
- category
- content
- restricted
- created_at

### ApplicationStageHistory

- id
- application_id
- from_status
- to_status
- changed_by
- reason
- created_at

## 41.6 Scorecards

### ScorecardTemplate

- id
- name
- scorecard_type
- description
- version
- active

### ScorecardCriterion

- id
- scorecard_template_id
- name
- description
- maximum_score
- weight
- required
- minimum_score
- guidance
- comment_required
- display_order

### CandidateScorecard

- id
- application_id
- scorecard_template_id
- reviewer_user_id
- status
- total_score
- submitted_at
- reopened_by
- reopened_at
- reopen_reason

### CandidateCriterionScore

- id
- candidate_scorecard_id
- criterion_id
- score
- comment
- evidence

### ConflictDeclaration

- id
- user_id
- application_id
- conflict_type
- details
- resolution
- resolved_by
- created_at

## 41.7 Assessments

### Assessment

- id
- vacancy_id
- title
- description
- type
- duration_minutes
- opens_at
- closes_at
- pass_mark
- maximum_attempts
- randomize_questions
- auto_submit
- configuration_json

### AssessmentQuestion

- id
- assessment_id
- question_type
- prompt
- options_json
- correct_answer_json
- maximum_score
- display_order

### CandidateAssessment

- id
- application_id
- assessment_id
- status
- invited_at
- started_at
- submitted_at
- auto_submitted
- score
- passed
- marker_user_id
- marker_comment

### CandidateAssessmentAnswer

- id
- candidate_assessment_id
- assessment_question_id
- answer_json
- score
- marker_comment

## 41.8 Interviews

### Interview

- id
- application_id
- title
- scheduled_start
- scheduled_end
- timezone
- venue
- meeting_link
- format
- status
- candidate_response
- candidate_comment
- created_by

### InterviewPanelMember

- id
- interview_id
- user_id
- panel_role
- conflict_status
- conflict_comment

### InterviewQuestion

- id
- interview_id
- question
- competency
- guidance
- expected_evidence
- red_flags
- maximum_score
- comment_required
- display_order

### InterviewScore

- id
- interview_id
- panel_member_id
- interview_question_id
- score
- comment

### InterviewPanelSubmission

- id
- interview_id
- panel_member_id
- total_score
- recommendation
- submitted_at

## 41.9 References

### Referee

- id
- application_id
- name
- organization
- position
- relationship
- email
- phone
- period_known
- permission_to_contact

### ReferenceRequest

- id
- referee_id
- secure_token_hash
- expires_at
- sent_at
- reminder_sent_at
- response_received_at
- status

### ReferenceResponse

- id
- reference_request_id
- answers_json
- outcome
- confidential_comment
- verified_by
- verified_at

## 41.10 Selection and approval

### SelectionDecision

- id
- application_id
- outcome
- rank
- justification
- override_flag
- created_by
- approved_by
- approved_at

### Approval

- id
- resource_type
- resource_id
- stage
- approver_user_id
- decision
- comment
- decided_at

## 41.11 Offers

### OfferTemplate

- id
- name
- candidate_type
- body_template
- active
- version

### Offer

- id
- application_id
- offer_template_id
- position
- duty_station
- contract_type
- contract_duration
- salary
- start_date
- end_date
- probation_period
- reporting_line
- conditions
- acceptance_deadline
- status
- offer_file_id
- signed_file_id
- sent_at
- viewed_at
- accepted_at
- declined_at
- candidate_comment

## 41.12 Preboarding packages

### PreboardingPackage

- id
- name
- description
- candidate_type
- role_category
- version
- active

### CandidatePreboarding

- id
- application_id
- status
- overall_completion_percentage
- readiness_status
- started_at
- ready_at
- completed_at

### CandidatePreboardingPackage

- id
- candidate_preboarding_id
- preboarding_package_id
- assigned_by
- assigned_at

## 41.13 Preboarding forms

### PreboardingFormTemplate

- id
- title
- description
- schema_json
- required
- review_required
- version
- active

### PackageForm

- id
- preboarding_package_id
- form_template_id
- required
- due_offset_days

### CandidatePreboardingForm

- id
- candidate_preboarding_id
- form_template_id
- response_json
- status
- submitted_at
- reviewed_by
- reviewed_at
- return_reason

## 41.14 Required documents

### DocumentRequirement

- id
- name
- description
- document_type
- required
- allowed_file_types
- maximum_file_size
- expiry_required
- review_required
- sensitivity_class
- active

### PackageDocumentRequirement

- id
- preboarding_package_id
- document_requirement_id
- required
- due_offset_days

### CandidateRequiredDocument

- id
- candidate_preboarding_id
- document_requirement_id
- file_asset_id
- expiry_date
- status
- submitted_at
- reviewed_by
- reviewed_at
- rejection_reason
- version_number

## 41.15 Policies and signatures

### PolicyDocument

- id
- title
- category
- version
- effective_date
- file_asset_id
- summary
- acknowledgement_method
- signature_method
- active

### PackagePolicy

- id
- preboarding_package_id
- policy_document_id
- required
- due_offset_days

### CandidatePolicyAcknowledgement

- id
- candidate_preboarding_id
- policy_document_id
- status
- viewed_at
- acknowledged_at
- signed_at
- signature_method
- signature_data
- signed_file_id
- reviewed_by
- reviewed_at

## 41.16 Courses

### Course

- id
- title
- description
- category
- version
- learning_objectives
- estimated_duration_minutes
- pass_mark
- allowed_attempts
- certificate_enabled
- active

### CourseContent

- id
- course_id
- content_type
- title
- content
- file_asset_id
- display_order

### CourseQuizQuestion

- id
- course_id
- question_type
- question
- options_json
- correct_answer_json
- score
- display_order

### PackageCourse

- id
- preboarding_package_id
- course_id
- required
- timing
- due_offset_days

### CandidateCourse

- id
- candidate_preboarding_id
- course_id
- status
- assigned_at
- due_at
- started_at
- completed_at
- score
- attempts
- certificate_file_id

### CandidateCourseAttempt

- id
- candidate_course_id
- attempt_number
- started_at
- submitted_at
- score
- passed
- answers_json

## 41.17 Tasks and information

### PreboardingTaskTemplate

- id
- title
- description
- category
- required
- review_required
- evidence_required
- dependency_json
- active

### PackageTask

- id
- preboarding_package_id
- task_template_id
- required
- due_offset_days

### CandidatePreboardingTask

- id
- candidate_preboarding_id
- task_template_id
- status
- assigned_at
- due_at
- submitted_at
- completed_at
- candidate_comment
- reviewer_comment
- reviewed_by

### CandidateInformationItem

- id
- candidate_preboarding_id
- category
- title
- content
- acknowledgement_required
- acknowledged_at

## 41.18 Meetings

### PreboardingMeeting

- id
- candidate_preboarding_id
- title
- description
- facilitator_user_id
- scheduled_start
- scheduled_end
- timezone
- venue
- meeting_link
- required
- status
- candidate_response
- attendance_comment

## 41.19 Readiness, resumption and ERP transfer

### ReadinessCheck

- id
- candidate_preboarding_id
- check_type
- required
- status
- source_resource_type
- source_resource_id
- waived_by
- waiver_reason
- waived_at
- reviewed_at

### ReadinessConfirmation

- id
- candidate_preboarding_id
- confirmed_by
- confirmed_at
- status
- summary_json
- comment

### ResumptionRecord

- id
- application_id
- planned_start_date
- actual_start_date
- reporting_location
- outcome
- confirmed_by
- supervisor_confirmation
- comment

### ERPTransferRecord

- id
- application_id
- erp_personnel_number
- created_in_erp_at
- recorded_by
- comment
- status

## 41.20 Communication and audit

### MessageThread

- id
- application_id
- subject
- category
- restricted

### Message

- id
- message_thread_id
- sender_user_id
- body
- file_asset_id
- sent_at
- read_at

### Notification

- id
- user_id
- type
- title
- body
- delivery_channels_json
- status
- sent_at
- read_at

### AuditLog

- id
- actor_user_id
- action
- resource_type
- resource_id
- previous_value_json
- new_value_json
- reason
- ip_address
- user_agent
- request_id
- created_at

---

# 42. State transition rules

The backend must validate allowed transitions. Users should not be able to set arbitrary statuses.

## 42.1 Vacancy transitions

```text
DRAFT → PENDING_APPROVAL
DRAFT → SCHEDULED
DRAFT → OPEN
PENDING_APPROVAL → DRAFT
PENDING_APPROVAL → SCHEDULED
PENDING_APPROVAL → OPEN
SCHEDULED → OPEN
OPEN → PAUSED
PAUSED → OPEN
OPEN → CLOSED
PAUSED → CLOSED
DRAFT/SCHEDULED/OPEN/PAUSED → CANCELLED
CLOSED → COMPLETED
COMPLETED → ARCHIVED
```

## 42.2 Application transitions

```text
DRAFT → SUBMITTED
SUBMITTED → UNDER_REVIEW
UNDER_REVIEW → LONGLISTED
UNDER_REVIEW → INELIGIBLE
LONGLISTED → SHORTLISTED
LONGLISTED → NOT_SELECTED
SHORTLISTED → ASSESSMENT_INVITED
SHORTLISTED → INTERVIEW_INVITED
ASSESSMENT_COMPLETED → INTERVIEW_INVITED
INTERVIEW_COMPLETED → REFERENCE_CHECK
INTERVIEW_COMPLETED → NOT_SELECTED
REFERENCE_CHECK → RECOMMENDED
REFERENCE_CHECK → NOT_SELECTED
RECOMMENDED → OFFER_DRAFT
OFFER_SENT → OFFER_ACCEPTED
OFFER_SENT → OFFER_DECLINED
OFFER_SENT → OFFER_EXPIRED
OFFER_ACCEPTED → PREBOARDING
PREBOARDING → READY_TO_RESUME
READY_TO_RESUME → RESUMED
RESUMED → TRANSFERRED_TO_ERP
```

Withdrawal may be allowed from appropriate active stages. A cancelled vacancy should move all active applications to a cancelled outcome without deleting them.

---

# 43. API design

The route names may change, but every capability below must be represented.

## 43.1 Public and authentication

```text
GET    /api/public/vacancies
GET    /api/public/vacancies/:reference
POST   /api/auth/register
POST   /api/auth/verify-email
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

## 43.2 Candidate profile

```text
GET    /api/candidate/profile
PATCH  /api/candidate/profile
POST   /api/candidate/education
PATCH  /api/candidate/education/:id
DELETE /api/candidate/education/:id
POST   /api/candidate/employment
PATCH  /api/candidate/employment/:id
DELETE /api/candidate/employment/:id
POST   /api/candidate/licences
PATCH  /api/candidate/licences/:id
DELETE /api/candidate/licences/:id
POST   /api/candidate/documents
DELETE /api/candidate/documents/:id
```

## 43.3 Candidate applications

```text
POST   /api/vacancies/:id/applications
GET    /api/candidate/applications
GET    /api/candidate/applications/:id
PATCH  /api/candidate/applications/:id
POST   /api/candidate/applications/:id/submit
POST   /api/candidate/applications/:id/withdraw
```

## 43.4 Vacancy management

```text
GET    /api/recruitment/vacancies
POST   /api/recruitment/vacancies
GET    /api/recruitment/vacancies/:id
PATCH  /api/recruitment/vacancies/:id
POST   /api/recruitment/vacancies/:id/submit-for-approval
POST   /api/recruitment/vacancies/:id/approve
POST   /api/recruitment/vacancies/:id/publish
POST   /api/recruitment/vacancies/:id/pause
POST   /api/recruitment/vacancies/:id/resume
POST   /api/recruitment/vacancies/:id/extend
POST   /api/recruitment/vacancies/:id/close
POST   /api/recruitment/vacancies/:id/cancel
POST   /api/recruitment/vacancies/:id/duplicate
```

## 43.5 Application review

```text
GET    /api/recruitment/vacancies/:id/applications
GET    /api/recruitment/applications/:id
POST   /api/recruitment/applications/:id/assign-reviewer
POST   /api/recruitment/applications/:id/change-stage
POST   /api/recruitment/applications/:id/notes
POST   /api/recruitment/applications/bulk-message
POST   /api/recruitment/applications/bulk-stage-change
```

## 43.6 Scorecards

```text
POST   /api/recruitment/applications/:id/conflict-declaration
POST   /api/recruitment/applications/:id/scorecards
GET    /api/recruitment/scorecards/:id
PATCH  /api/recruitment/scorecards/:id
POST   /api/recruitment/scorecards/:id/submit
POST   /api/recruitment/scorecards/:id/reopen
```

## 43.7 Assessments

```text
POST   /api/recruitment/assessments
GET    /api/recruitment/assessments/:id
PATCH  /api/recruitment/assessments/:id
POST   /api/recruitment/assessments/:id/invite
GET    /api/candidate/assessments/:id
POST   /api/candidate/assessments/:id/start
POST   /api/candidate/assessments/:id/answers
POST   /api/candidate/assessments/:id/submit
POST   /api/recruitment/candidate-assessments/:id/mark
```

## 43.8 Interviews

```text
POST   /api/recruitment/interviews
GET    /api/recruitment/interviews/:id
PATCH  /api/recruitment/interviews/:id
POST   /api/recruitment/interviews/:id/invite
POST   /api/candidate/interviews/:id/respond
POST   /api/recruitment/interviews/:id/scores
POST   /api/recruitment/interviews/:id/submit-panel-score
POST   /api/recruitment/interviews/:id/reopen-panel-score
```

## 43.9 References

```text
POST   /api/recruitment/applications/:id/referees
POST   /api/recruitment/referees/:id/send-request
POST   /api/recruitment/referees/:id/send-reminder
POST   /api/public/reference/:token/submit
POST   /api/recruitment/reference-responses/:id/verify
```

## 43.10 Selection and offers

```text
POST   /api/recruitment/applications/:id/selection
POST   /api/recruitment/selections/:id/approve
POST   /api/recruitment/offers
PATCH  /api/recruitment/offers/:id
POST   /api/recruitment/offers/:id/approve
POST   /api/recruitment/offers/:id/send
POST   /api/recruitment/offers/:id/withdraw
GET    /api/candidate/offers/:id
POST   /api/candidate/offers/:id/accept
POST   /api/candidate/offers/:id/decline
POST   /api/candidate/offers/:id/request-clarification
```

## 43.11 Candidate preboarding

```text
GET    /api/candidate/preboarding
GET    /api/candidate/preboarding/forms
POST   /api/candidate/preboarding/forms/:id/save
POST   /api/candidate/preboarding/forms/:id/submit
POST   /api/candidate/preboarding/documents/:id/upload
POST   /api/candidate/preboarding/policies/:id/acknowledge
POST   /api/candidate/preboarding/policies/:id/sign
GET    /api/candidate/preboarding/courses
POST   /api/candidate/preboarding/courses/:id/start
POST   /api/candidate/preboarding/courses/:id/submit-quiz
POST   /api/candidate/preboarding/tasks/:id/submit
POST   /api/candidate/preboarding/information/:id/acknowledge
POST   /api/candidate/preboarding/confirm-start-date
POST   /api/candidate/preboarding/messages
```

## 43.12 HR preboarding management

```text
GET    /api/recruitment/preboarding
GET    /api/recruitment/preboarding/:id
POST   /api/recruitment/preboarding/:id/assign-package
POST   /api/recruitment/preboarding/:id/add-requirement
POST   /api/recruitment/preboarding/forms/:id/review
POST   /api/recruitment/preboarding/documents/:id/review
POST   /api/recruitment/preboarding/policies/:id/review
POST   /api/recruitment/preboarding/tasks/:id/review
POST   /api/recruitment/preboarding/:id/waive
POST   /api/recruitment/preboarding/:id/confirm-ready
POST   /api/recruitment/applications/:id/confirm-resumption
POST   /api/recruitment/applications/:id/mark-created-in-erp
GET    /api/recruitment/applications/:id/handover-summary
```

## 43.13 Administration

```text
CRUD /api/admin/users
CRUD /api/admin/roles
CRUD /api/admin/permissions
CRUD /api/admin/departments
CRUD /api/admin/projects
CRUD /api/admin/duty-stations
CRUD /api/admin/document-types
CRUD /api/admin/templates
CRUD /api/admin/scorecards
CRUD /api/admin/courses
CRUD /api/admin/preboarding-packages
CRUD /api/admin/policies
CRUD /api/admin/tasks
CRUD /api/admin/notification-templates
```

---

# 44. Page map

## 44.1 Public pages

```text
/
/careers
/careers/[reference]
/recruitment-process
/recruitment-faq
/report-recruitment-fraud
/privacy
/terms
/login
/register
/forgot-password
```

## 44.2 Candidate pages

```text
/candidate/dashboard
/candidate/profile
/candidate/profile/personal
/candidate/profile/education
/candidate/profile/employment
/candidate/profile/licences
/candidate/profile/documents
/candidate/applications
/candidate/applications/[id]
/candidate/assessments
/candidate/assessments/[id]
/candidate/interviews
/candidate/offers
/candidate/offers/[id]
/candidate/preboarding
/candidate/preboarding/forms
/candidate/preboarding/documents
/candidate/preboarding/policies
/candidate/preboarding/courses
/candidate/preboarding/tasks
/candidate/preboarding/meetings
/candidate/preboarding/reporting-information
/candidate/messages
/candidate/settings
```

## 44.3 Recruitment pages

```text
/recruitment/dashboard
/recruitment/vacancies
/recruitment/vacancies/new
/recruitment/vacancies/[id]
/recruitment/vacancies/[id]/applications
/recruitment/applications/[id]
/recruitment/assessments
/recruitment/interviews
/recruitment/references
/recruitment/selections
/recruitment/offers
/recruitment/preboarding
/recruitment/preboarding/[id]
/recruitment/reports
/recruitment/audit
```

## 44.4 Administration pages

```text
/admin/users
/admin/roles
/admin/permissions
/admin/departments
/admin/projects
/admin/duty-stations
/admin/contract-types
/admin/document-types
/admin/templates
/admin/scorecards
/admin/assessment-bank
/admin/interview-questions
/admin/preboarding-packages
/admin/forms
/admin/policies
/admin/courses
/admin/tasks
/admin/notification-templates
/admin/system-settings
```

---

# 45. Reusable interface components

The implementation should use shared components instead of creating inconsistent versions on every page.

## 45.1 Navigation components

- Public header.
- Candidate portal sidebar.
- Internal recruitment sidebar.
- Breadcrumbs.
- Mobile navigation drawer.
- User account menu.
- Role switcher where a user has more than one internal role.

## 45.2 Vacancy components

- Vacancy card.
- Vacancy filter panel.
- Vacancy status badge.
- Vacancy timeline.
- Vacancy details section.
- Vacancy preview.
- Vacancy form editor.
- Application question builder.
- Required-document selector.

## 45.3 Candidate components

- Candidate profile card.
- Profile completion meter.
- Education record editor.
- Employment record editor.
- Licence record editor.
- Document uploader.
- Document preview.
- Candidate timeline.
- Candidate status badge.
- Candidate quick summary.

## 45.4 Recruitment components

- Pipeline board.
- Applicant data table.
- Filter builder.
- Saved filter.
- Bulk action toolbar.
- Reviewer assignment dialog.
- Stage-change dialog.
- Scorecard form.
- Weighted score summary.
- Conflict declaration dialog.
- Ranking table.
- Approval panel.

## 45.5 Assessment components

- Assessment builder.
- Question editor.
- Candidate timer.
- Question navigator.
- Auto-save indicator.
- Submission confirmation dialog.
- Manual marking form.
- Offline result form.

## 45.6 Interview components

- Interview scheduler.
- Panel selector.
- Calendar view.
- Candidate response card.
- Interview question list.
- Independent scoring form.
- Panel score comparison.
- Scoring variance alert.

## 45.7 Offer components

- Offer template editor.
- Offer preview.
- Approval timeline.
- Candidate offer viewer.
- Accept-offer dialog.
- Decline-offer dialog.
- Start-date proposal form.

## 45.8 Preboarding components

- Overall progress meter.
- Category progress card.
- Requirement checklist.
- Form renderer.
- File review panel.
- Policy reader.
- Signature capture.
- Course player.
- Quiz player.
- Task card.
- Meeting card.
- Reporting-information card.
- Readiness checklist.
- Waiver dialog.
- Handover summary.

## 45.9 Shared feedback components

- Success notification.
- Error alert.
- Warning alert.
- Empty state.
- Loading skeleton.
- Confirmation dialog.
- Unsaved-changes warning.
- Expiry warning.
- Overdue badge.
- Restricted-information badge.

---

# 46. Validation rules

Validation must exist on the client and server. Server validation is authoritative.

## 46.1 General

- Required fields must be enforced.
- Emails must be normalized and validated.
- Phone numbers should use international format.
- Dates must use a consistent time-zone strategy.
- HTML input must be sanitized.
- Sensitive information must not appear in logs.
- Uploaded files must pass type, size and malware checks.

## 46.2 Vacancy

- Opening date must be earlier than closing date.
- Published vacancies must have a reference number.
- Published vacancies must contain mandatory job details.
- Number of positions must be at least one.
- A closed vacancy cannot receive applications.
- A deadline extension must include a reason.
- Score weights must total 100 percent.

## 46.3 Candidate profile

- Email must be unique.
- A current employment record cannot have an end date.
- An expired professional licence should be visibly flagged.
- Completion year cannot be earlier than start year.
- Duplicate education or employment records should generate a warning.

## 46.4 Application

- One submitted application per candidate per vacancy.
- Submission must occur before the closing time.
- Required questions must have answers.
- Required documents must be attached.
- Candidate declarations must be accepted.
- Submitted applications are immutable to the candidate.

## 46.5 Scorecard

- Mandatory criteria must be scored.
- A score cannot exceed its maximum.
- Negative scores are not allowed.
- Required comments must be present.
- Submitted scores are locked.
- Reopening requires permission and a reason.

## 46.6 Assessment

- Closing time must follow opening time.
- Duration must be positive.
- Pass mark cannot exceed the maximum available score.
- A candidate cannot start before the opening time.
- A candidate cannot start after the closing time.
- An assessment must auto-submit when its time expires if configured.

## 46.7 Interview

- Interview end time must follow start time.
- Required panel roles must be assigned.
- A conflicted panel member cannot submit a score unless an exception is approved.
- All mandatory questions must be scored before submission.

## 46.8 Offer

- An offer cannot be sent without approval.
- Acceptance deadline must be later than the send date.
- Accepted offers cannot be edited.
- A corrected offer must create a new version and supersede the old one.
- An expired offer cannot be accepted unless reopened by an authorized user.

## 46.9 Preboarding

- Preboarding can start only after offer acceptance.
- A rejected document cannot count as complete.
- An expired mandatory document cannot count as approved.
- Failed mandatory courses cannot count as complete.
- Readiness cannot be confirmed when mandatory items remain incomplete unless each has an approved waiver.
- ERP transfer cannot occur before confirmed resumption.

---

# 47. Security requirements

## 47.1 Authentication

- Use modern password hashing such as Argon2id or bcrypt with an appropriate work factor.
- Require email verification.
- Rate-limit login attempts.
- Lock or delay repeated failed attempts.
- Expire sessions.
- Revoke sessions after password reset.
- Support optional MFA for internal users.
- Require stronger authentication for sensitive exports and role changes where feasible.

## 47.2 Authorization

- Enforce permissions on every backend action.
- Enforce record-level access.
- Filter sensitive fields from API responses.
- Use deny-by-default permissions.
- Do not trust role information supplied by the browser.
- Prevent insecure direct object references.

## 47.3 Data protection

- Use HTTPS.
- Encrypt sensitive data at rest.
- Use private file storage.
- Generate time-limited download links.
- Restrict exports.
- Record consent.
- Apply retention rules.
- Allow authorized correction of inaccurate data.

## 47.4 File security

- Allow only approved file types.
- Apply file-size limits.
- Verify MIME type and file signature.
- Scan files for malware.
- Store files outside the public web root.
- Generate random storage keys.
- Prevent executable files.
- Do not expose permanent public URLs.

## 47.5 Security monitoring

Record and review:

- Failed logins.
- Account lockouts.
- Role changes.
- Permission changes.
- Sensitive downloads.
- Bulk exports.
- Repeated access denials.
- Unusual data access.
- Suspicious file uploads.

---

# 48. Privacy and retention

## 48.1 Candidate privacy notice

The platform should explain:

- What data is collected.
- Why it is collected.
- Who can access it.
- How references are handled.
- How successful-candidate data is used for ERP creation.
- How long data is retained.
- How the candidate can request correction.
- How the candidate can withdraw.
- How the candidate can contact FRAD about privacy.

## 48.2 Consent records

Store:

- Consent type.
- Notice version.
- Candidate decision.
- Date and time.
- Withdrawal date where applicable.

## 48.3 Retention schedule

Retention must be configurable and approved by FRAD.

Possible categories:

- Unsubmitted drafts.
- Unsuccessful applications.
- Withdrawn applications.
- Reserve candidates.
- Successful recruitment records.
- References.
- Identity documents.
- Financial information.
- Audit logs.

A new upload must not reset the retention clock for an unrelated old recruitment record.

## 48.4 Data deletion

Deletion should:

- Follow approved retention rules.
- Preserve legally required audit evidence.
- Remove inaccessible file objects.
- Be recorded in a deletion log.
- Require authorization for successful recruitment records.

---

# 49. Accessibility and low-connectivity behaviour

The platform should work well on mobile phones and unstable connections.

Requirements:

- Mobile-first layout.
- Fast initial load.
- Minimal decorative media.
- Auto-save application and form drafts.
- Upload retry.
- Clear progress indicators.
- Plain validation messages.
- Keyboard navigation.
- Screen-reader labels.
- Sufficient colour contrast.
- Large touch targets.
- No essential information conveyed only by colour.
- Reduced-motion support.
- Printable instructions.
- Accessible PDF or HTML alternatives for key documents.
- HR-assisted application entry with full audit history when exceptional support is required.

The candidate should not lose an entire application or form because the connection failed during submission.

---

# 50. Background jobs and schedules

Required jobs include:

- Publish scheduled vacancies.
- Close vacancies at the deadline.
- Send application confirmation.
- Send incomplete-draft reminders where permitted.
- Send assessment invitations and reminders.
- Auto-submit timed assessments.
- Send interview invitations and reminders.
- Send reference requests and reminders.
- Expire reference links.
- Send offer reminders.
- Expire offers.
- Assign preboarding packages after acceptance.
- Send form, document, policy, course and task reminders.
- Check overdue requirements.
- Check expiring licences.
- Alert HR about candidates resuming soon.
- Alert HR about candidates who are not ready.
- Generate scheduled reports.

Every job should be idempotent so that retrying it does not create duplicate messages or records.

---

# 51. Error handling

The platform should:

- Show clear user-facing error messages.
- Log technical details privately.
- Never expose stack traces to end users.
- Retry failed notifications.
- Prevent duplicate submissions.
- Use request IDs for support and debugging.
- Provide upload retry after failure.
- Preserve drafts before session expiry where possible.
- Display a useful empty state instead of a blank page.
- Display a recovery action where possible.

Examples:

- `Your document could not be uploaded. Your form has been saved. Please try the upload again.`
- `This vacancy closed at 11:59 PM on 31 July 2026 and no longer accepts applications.`
- `You have already submitted an application for this vacancy.`

---

# 52. Observability

The production system should include:

- Structured application logs.
- Error monitoring.
- Performance monitoring.
- Background-job monitoring.
- Email delivery tracking.
- SMS delivery tracking where enabled.
- Database health monitoring.
- Storage health monitoring.
- Uptime checks.
- Security event alerts.

Do not log passwords, tokens, bank details, medical data or full identity documents.

---

# 53. Testing strategy

## 53.1 Unit tests

Test:

- Validation rules.
- Scoring calculations.
- Weighted final scores.
- Status transitions.
- Completion percentages.
- Permission checks.
- Offer expiry.
- Readiness rules.
- Waiver logic.
- Course attempt rules.

## 53.2 Integration tests

Test:

- Registration and email verification.
- Vacancy publication.
- Application submission.
- Reviewer assignment.
- Scorecard submission.
- Assessment completion.
- Interview scoring.
- Reference response.
- Selection approval.
- Offer acceptance.
- Preboarding package assignment.
- Document review.
- Policy signing.
- Course completion.
- Readiness confirmation.
- Resumption confirmation.
- ERP transfer recording.

## 53.3 End-to-end tests

Critical full journey:

1. HR creates and publishes a vacancy.
2. Candidate registers and applies.
3. HR reviews and longlists.
4. Reviewer shortlists.
5. Candidate completes assessment.
6. Panel interviews and scores.
7. HR completes reference check.
8. Approver approves selection.
9. HR sends offer.
10. Candidate accepts.
11. Candidate completes forms, documents, policies, courses and tasks.
12. HR reviews requirements.
13. HR confirms readiness.
14. HR confirms actual resumption.
15. HR records ERP personnel number.
16. Recruitment record closes.

## 53.4 Security tests

Test:

- Unauthorized record access.
- Role escalation.
- Broken object-level authorization.
- File upload attacks.
- SQL injection.
- Cross-site scripting.
- CSRF.
- Rate limiting.
- Session fixation.
- Sensitive export permissions.
- Expired reference links.
- Expired offer links.

## 53.5 Accessibility tests

Test:

- Keyboard-only use.
- Screen-reader labels.
- Focus order.
- Error message association.
- Colour contrast.
- Mobile responsiveness.
- Zoom at 200 percent.

---

# 54. Acceptance criteria

## 54.1 Careers portal

- Only published vacancies appear publicly.
- Vacancies can be searched and filtered.
- Closed vacancies cannot receive applications.
- Vacancy pages show required information.
- Public pages work on mobile devices.

## 54.2 Candidate account and profile

- Candidate can register and verify email.
- Candidate can create a reusable profile.
- Candidate can add multiple education and employment records.
- Candidate can upload reusable documents.
- Candidate can save and continue a draft application.
- Candidate can submit only one application per vacancy.
- Candidate can see a simplified status.

## 54.3 Recruitment

- HR can create and publish a vacancy.
- HR can configure questions and required documents.
- HR can view and filter applicants.
- Reviewers can complete scorecards.
- Conflict declarations are enforced.
- Assessments can be assigned and scored.
- Interviews can be scheduled and scored independently.
- References can be requested or manually recorded.
- Selection can be approved.
- Offers can be generated, sent, accepted and declined.

## 54.4 Preboarding

- Offer acceptance creates or activates preboarding.
- HR can assign one or more packages.
- Candidate can complete forms.
- Candidate can upload documents.
- HR can approve, reject and request resubmission.
- Candidate can read and sign policies.
- Candidate can complete courses and quizzes.
- Candidate can complete tasks.
- Candidate can view meetings and reporting information.
- HR can see completion by category.
- Mandatory incomplete items block readiness unless waived.

## 54.5 Resumption and ERP handover

- HR can confirm readiness.
- HR can record actual resumption.
- HR can generate a handover summary.
- HR can enter ERP personnel number manually.
- The platform records who completed the transfer.
- Closed records remain available for authorized audit.

---

# 55. Minimum viable product

The first production release should include:

1. Public careers portal.
2. Candidate registration and profile.
3. Vacancy creation and publication.
4. Application form builder.
5. Application review workspace.
6. Screening scorecards.
7. Basic online and offline assessment records.
8. Interview scheduling and panel scorecards.
9. Reference recording.
10. Selection and approval.
11. Offer generation and acceptance.
12. Preboarding dashboard.
13. Preboarding forms.
14. Document upload and HR review.
15. Policy acknowledgement and signing.
16. Courses and simple quizzes.
17. Pre-resumption tasks.
18. Meetings and reporting instructions.
19. Readiness clearance.
20. Resumption confirmation.
21. Manual ERP handover.
22. Email notifications.
23. Audit trail.
24. Basic reports.

---

# 56. Product extensions and explicit exclusions

The implementation includes the extensions that materially improve recruitment
operations without turning the product into an ERP:

- Accountable “My Work” and team queues.
- Workflow versions, stage gates, maker-checker approvals, SLA policies, and
  overdue escalation.
- Vacancy workspaces, Candidate 360, candidate action centre, and preboarding
  control tower.
- Decision-quality calibration, scoring variance, ranking-override evidence,
  and drill-through to source records.
- Governed in-platform and email communications.
- Consent-led talent pools and non-destructive possible-duplicate warnings.
- Candidate-controlled accommodation requests with restricted HR handling.
- Calendar files for interview invitations.
- Controlled configuration changes requiring an independent administrator.
- Typed electronic signatures, reference automation, complaint case management,
  privacy exports/deletion, legal holds, retention evidence, and audit-chain
  verification.

The following features are intentionally not part of this platform:

- WhatsApp delivery.
- Multilingual candidate pages.
- Candidate import tools.
- Advanced question banks.
- Advanced or remote proctoring.
- AI-generated or AI-assisted summaries.

Internal vacancies are not implemented because staff accounts are not candidate
profiles and the platform must remain separate from the ERP. A future internal
mobility process should be added only with an approved identity and HR-master-data
boundary. External job-board publishing, provider-backed e-signature, and SMS
remain integration-adapter choices; the core workflow does not depend on them.

---

# 57. Seed data

## 57.1 Departments

- Programmes.
- Health.
- Nutrition.
- WASH.
- MEAL.
- Finance.
- Procurement.
- Human Resources.
- Operations.
- Security.
- Communications.
- Information Technology.

## 57.2 Contract types

- Permanent.
- Fixed term.
- Temporary.
- Consultant.
- Intern.
- Volunteer.
- Casual worker.
- Enumerator.
- Community worker.

## 57.3 Vacancy categories

- Programme.
- Technical.
- Operations.
- Finance.
- Human resources.
- MEAL.
- Security.
- Communications.
- Information technology.
- Consultancy.
- Internship.
- Volunteer.

## 57.4 Default preboarding package

- Personal information form.
- Emergency contact form.
- Next-of-kin form.
- Bank details form.
- Identity document requirement.
- Passport photograph requirement.
- Academic certificate requirement.
- Signed offer requirement.
- Code of conduct.
- Safeguarding policy.
- PSEA policy.
- Confidentiality agreement.
- Introduction to FRAD course.
- Safeguarding course.
- Security awareness course.
- Confirm start date task.
- Confirm reporting instructions task.

## 57.5 Default scorecard

- Qualification: 10.
- Relevant experience: 25.
- Humanitarian or NGO experience: 15.
- Technical experience: 20.
- Duty-location experience: 10.
- Communication quality: 10.
- Additional skills: 10.

---

# 58. Environment configuration

Example environment variables:

```env
NODE_ENV=
DATABASE_URL=
APP_URL=
AUTH_SECRET=
SESSION_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMS_PROVIDER=
SMS_API_KEY=
STORAGE_ENDPOINT=
STORAGE_REGION=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
VIRUS_SCAN_ENDPOINT=
QUEUE_URL=
ERROR_MONITORING_DSN=
TRUSTED_CLIENT_IP_HEADER=x-real-ip
```

Secrets must never be committed to source control.

---

# 59. Deployment requirements

Production should include:

- HTTPS.
- Managed PostgreSQL.
- Private object storage.
- Automated backups.
- Separate development, staging and production environments.
- CI/CD pipeline.
- Controlled database migrations.
- Error monitoring.
- Uptime monitoring.
- Centralized logs.
- Backup restoration tests.
- Disaster recovery procedure.
- Environment-specific secrets.

## 59.1 Deployment checklist

- Database migrated.
- Seed data loaded.
- Storage bucket private.
- Email sending verified.
- Background worker active.
- Scheduled jobs active.
- Admin user created securely.
- Error monitoring active.
- Backups active.
- Privacy pages published.
- Security headers enabled.
- Rate limits enabled.

---

# 60. AI agent implementation instructions

The build agent should follow these rules:

1. Do not add payroll, leave, attendance, performance or other ERP modules.
2. Do not build automatic ERP synchronization.
3. Keep candidate and internal user experiences separate.
4. Use explicit server-side authorization.
5. Use state machines or validated transition functions for statuses.
6. Preserve submitted application snapshots.
7. Preserve document and policy versions.
8. Audit every material decision and override.
9. Treat reference, financial, medical and identity information as restricted.
10. Build mobile-first candidate pages.
11. Make all long forms saveable as drafts.
12. Make mandatory and optional requirements clearly different.
13. Do not mark a candidate ready based only on a percentage. Evaluate each mandatory readiness check.
14. Do not delete old scores or files when corrected. Create versions and retain history.
15. Do not expose internal comments or scores to candidates.
16. Do not permit direct editing of accepted offers.
17. Do not permit ERP transfer before actual resumption.
18. Use human approval for selection, offer issuance, requirement waiver and readiness confirmation.
19. Write tests for all status transitions and permission boundaries.
20. Keep the interface simple even though the underlying controls are robust.

---

# 61. Suggested delivery sequence

## Phase 1: Foundation

- Project setup.
- Authentication.
- Roles and permissions.
- Database schema.
- File storage.
- Audit logging.
- Admin reference data.

## Phase 2: Vacancy and application

- Careers portal.
- Vacancy management.
- Candidate profile.
- Application builder.
- Application submission.
- HR review workspace.

## Phase 3: Selection

- Screening scorecards.
- Conflict declarations.
- Assessments.
- Interviews.
- References.
- Final ranking and approval.

## Phase 4: Offer

- Offer templates.
- Offer approval.
- Candidate offer portal.
- Acceptance and decline.
- Start-date confirmation.

## Phase 5: Preboarding

- Packages.
- Forms.
- Required documents.
- Policy signatures.
- Courses and quizzes.
- Tasks.
- Meetings.
- Reporting information.
- Messaging.

## Phase 6: Clearance and handover

- Readiness checks.
- Waivers.
- Resumption confirmation.
- Handover summary.
- Manual ERP transfer tracking.

## Phase 7: Reporting and hardening

- Dashboards.
- Reports.
- Accessibility.
- Security review.
- Performance testing.
- End-to-end testing.
- Production deployment.

---

# 62. Definition of done

A feature is complete only when:

- Business requirements are implemented.
- Permissions are enforced on the server.
- Frontend and backend validation exist.
- Audit logging exists where required.
- Notifications work where applicable.
- Mobile layout works.
- Accessibility has been reviewed.
- Error and empty states are handled.
- Unit and integration tests pass.
- Relevant end-to-end tests pass.
- Documentation is updated.
- Product owner acceptance is complete.

---

# 63. Final system boundary

The recruitment and preboarding platform owns:

- Vacancies.
- Candidates.
- Applications.
- Screening.
- Assessments.
- Interviews.
- References.
- Selection.
- Offers.
- Preboarding forms.
- Preboarding documents.
- Policy signatures.
- Compulsory pre-resumption courses.
- Tasks.
- Meetings.
- Reporting instructions.
- Readiness.
- Resumption confirmation.
- Manual ERP handover record.

The FRAD ERP owns:

- Official personnel records.
- Payroll.
- Leave.
- Attendance.
- Timesheets.
- Performance.
- Ongoing training.
- Assets.
- Staff movement.
- Exit management.

The core product journey must remain:

```text
Vacancy
→ Application
→ Review
→ Assessment
→ Interview
→ Reference Check
→ Selection
→ Offer
→ Offer Acceptance
→ Preboarding
→ Ready to Resume
→ Resumed
→ Manually Created in ERP
→ Recruitment Record Closed
```

---

# 64. Implemented recruitment operating system

The application implements the specification as an operational platform, not
only as a collection of forms and status pages.

## 64.1 Work, ownership, and service levels

- `/recruitment/work` is the primary staff command centre.
- Work is materialised from authoritative application, approval, offer,
  reference, and preboarding records.
- Items have an owner or accountable role, priority, due time, blocking reason,
  optimistic lock, escalation level, and completion evidence.
- The scheduler closes stale derived work and escalates overdue work.
- SLA changes are governed configuration changes; they are not silent edits.

## 64.2 Governed decisions

- Vacancy, selection, offer, readiness, resumption, and ERP handover transitions
  enforce server-side gates.
- Selection rank is computed by the server. A client cannot set its own rank or
  override flag.
- Material approvals are assigned to an independent approver and use
  maker-checker and optimistic concurrency.
- Panel scoring remains independent and is locked after submission unless a
  reasoned reopening is authorized.
- Decision-quality views link back to the underlying interview or application.

## 64.3 Candidate experience

- `/candidate/tasks` consolidates assessments, interview responses, offer
  decisions, and preboarding actions by deadline.
- `/candidate/accommodations` provides a confidential, diagnosis-free adjustment
  workflow that is not exposed to selectors or panels.
- Candidates control talent-pool consent from account settings.
- Interview invitations provide a standards-based `.ics` calendar download.
- Privacy exports include the candidate’s own information but exclude internal
  deliberations, confidential references, security metadata, and restricted
  threads.

## 64.4 Preboarding and ERP boundary

- Assigned package configuration is snapshotted so later template edits do not
  change an active candidate’s requirements or quiz grading.
- The control tower exposes completion, overdue actions, and readiness blockers.
- Final clearance requires all mandatory readiness checks or a recorded,
  authorized waiver.
- Supervisor confirmation is explicit; the UI cannot silently submit it.
- ERP personnel numbers are unique, the transfer is idempotent and transactional,
  and a terminal transfer record cannot be rewritten.

## 64.5 Reliability and security

- Authentication includes verified email, password-reset revocation, current
  role reload, session revocation on access changes, OIDC nonce/issuer/subject
  binding, and production HTTPS requirements.
- Distributed rate limits, file quotas, private file authorization, malware-scan
  fail-closed behavior, encrypted outbox payloads, lease-fenced jobs, legal
  holds, retention evidence, and a serialized audit-chain head are implemented.
- Critical workflow writes use transactions, idempotency keys, unique database
  constraints, or optimistic compare-and-swap as appropriate.
- Local development uses SQLite. Production uses the generated PostgreSQL schema
  and requires the infrastructure controls in the production runbook.

## 64.6 Verification boundary

Repository verification consists of Prisma formatting and generation,
TypeScript compilation, ESLint, unit tests, database integration tests, migration
tests, and a production build. Production release still requires FRAD sign-off,
infrastructure evidence, accessibility testing with assistive technologies,
load testing at expected volumes, backup restoration evidence, and an online
dependency/advisory scan.
