# Single-NGO End-to-End Recruitment Platform
## Functional Requirements and Product Specification

**Document purpose:** Define the complete requirements for a recruitment platform used by one NGO to manage applicants from vacancy preparation to final selection and transfer of the successful candidate to the organisation's existing ERP.

**System boundary:** This platform is not an ERP, HRIS, payroll system, attendance system, leave system, performance system, or staff self-service portal. It manages recruitment only.

---

# 1. Platform Objective

The platform should provide one controlled recruitment process for the NGO, beginning with vacancy preparation and ending when a successful applicant is transferred to the existing ERP as a new staff member.

The platform should:

- Manage public and internal vacancy advertisements.
- Receive and organise applications.
- Apply vacancy-specific eligibility rules automatically.
- Produce a transparent longlist.
- Support human shortlisting, testing, interviews, references, background checks, selection, and offers.
- Maintain a complete recruitment record for audit purposes.
- Protect applicant data.
- Prevent unauthorised changes to scores, decisions, and approvals.
- Transfer only the required details of successful candidates to the ERP.
- Remain separate from staff management after recruitment is completed.

---

# 2. What the Platform Must Not Become

The platform should not contain modules for:

- Payroll
- Leave
- Attendance
- Staff performance
- Staff training
- Staff promotion
- Staff disciplinary management
- Staff grievance management
- Staff travel
- Staff assets
- Staff medical records
- Staff benefits
- Staff scheduling
- Employee self-service

These functions remain in the organisation's existing ERP.

The recruitment platform should only retain recruitment records and the candidate information required by policy, law, and audit requirements.

---

# 3. Main Users

The platform should have the following user categories.

## 3.1 Applicants

Applicants are external or internal candidates who apply for advertised positions.

Applicants should be able to:

- Create an account.
- Verify their email address or phone number.
- Create and update a candidate profile.
- Upload a CV and required documents.
- View current vacancies.
- Search and filter vacancies.
- Apply for a vacancy.
- Save an incomplete application.
- Submit an application.
- Receive application confirmation.
- View the status of an application where permitted.
- Receive invitations for tests and interviews.
- Upload requested documents.
- Provide referee details.
- Accept or reject an offer.
- Withdraw an application.
- Request correction or deletion of their personal data where applicable.

Applicants should not have access to:

- Internal recruitment notes
- Screening scores
- Panel comments
- Other candidates
- Internal salary deliberations
- Reference responses
- Background-check findings
- Safeguarding findings

---

## 3.2 HR Assistant or HR Support User

This is the lowest operational HR role.

The user may:

- Create draft vacancies.
- Enter vacancy details.
- Upload approved job descriptions.
- Configure applicant questions.
- Configure longlisting rules.
- Prepare advertisement text.
- Review application completeness.
- Send approved candidate communications.
- Schedule tests and interviews.
- Upload recruitment documents.
- Prepare reports.

The user may not:

- Publish an unapproved vacancy.
- Approve their own vacancy.
- change approved eligibility rules after applications have opened without approval.
- Approve final selection.
- Approve salary or offer terms.
- Delete recruitment records.
- Modify submitted interview scores.
- Access restricted safeguarding information unless separately authorised.

---

## 3.3 HR Officer

The HR Officer should have all HR Assistant functions and may additionally:

- Review draft vacancies.
- manage candidate stages.
- Validate automatically generated longlists.
- Assign applications to shortlisting reviewers.
- Configure tests and interviews.
- Review panel score completion.
- Prepare selection documentation.
- Prepare conditional offer documents.
- Initiate reference and background checks.
- Recommend closure of a recruitment exercise.

The HR Officer still cannot approve a vacancy they created or publish it without the required HR Manager approval.

---

## 3.4 Senior HR Officer or HR Lead

The Senior HR Officer should have all HR Officer functions and may:

- Review complex vacancies.
- Supervise lower-level HR users.
- Review longlisting exceptions.
- Review disputed eligibility decisions.
- approve routine candidate communications.
- Validate shortlisting and assessment records.
- Review recruitment compliance before final recommendation.
- Recommend offers to the HR Manager.
- Reopen a recruitment stage subject to approval.

The Senior HR Officer cannot approve a vacancy they created if the organisation requires HR Manager approval.

---

## 3.5 HR Manager

The HR Manager is the principal business owner of the recruitment platform.

The HR Manager should control most recruitment configuration and approvals that might otherwise be incorrectly assigned to a technical system administrator.

The HR Manager should be able to:

- Create vacancies.
- Approve vacancies created by lower HR levels.
- Approve or reject requisitions submitted by hiring departments.
- Approve vacancy wording.
- Approve eligibility and longlisting rules.
- Approve shortlisting criteria.
- Approve assessment and interview structures.
- Approve panel composition.
- Approve changes to an active recruitment process.
- Approve recruitment exceptions.
- Approve final selection recommendations within delegated authority.
- Approve conditional offers.
- Approve rejection or cancellation of a recruitment exercise.
- Approve transfer of a successful candidate to the ERP.
- Configure recruitment workflows.
- Configure candidate statuses.
- Configure standard templates.
- Configure screening and scoring templates.
- Configure approval thresholds.
- Configure recruitment service timelines.
- manage recruitment reports.
- manage operational access for HR users.
- freeze or reopen recruitment stages.
- view all non-restricted recruitment records.

### Vacancy Approval Rule

The system should enforce the following rule:

- A vacancy created by an HR Assistant, HR Officer, Senior HR Officer, or other authorised HR user must be approved by the HR Manager before publication.
- A vacancy created directly by the HR Manager should not require the HR Manager to approve their own work.
- Where organisational policy requires a second approval for HR Manager-created vacancies, the system should route it to the designated executive or authorised alternate.
- The approval route must be configurable but should never permit self-approval where policy forbids it.

---

## 3.6 Hiring Department Representative

This may be the programme manager, department head, technical lead, or supervisor of the position.

The user may:

- Submit a staffing request.
- Provide the technical justification.
- Provide or confirm the job description.
- Recommend technical eligibility criteria.
- Recommend technical longlisting criteria.
- Review applicants assigned by HR.
- Participate in shortlisting.
- Participate in interviews.
- Submit independent scores.
- Recommend candidates.
- Provide technical comments.

The user may not:

- Publish vacancies.
- Edit applicant records.
- access confidential reference or safeguarding findings.
- change HR-approved longlisting rules.
- issue offers.
- change other panel members' scores.
- approve money unless the user is also the designated Budget Holder.

---

## 3.7 Budget Holder

The Budget Holder, not Finance, should determine and confirm the funding available for the position.

The Budget Holder should be the person with authority over the relevant project, grant, department, or budget line.

The Budget Holder should be able to:

- Confirm that the position is funded.
- Confirm the applicable budget line.
- Confirm the maximum approved recruitment cost.
- Confirm the salary or consultancy ceiling.
- Confirm the funding period.
- Confirm whether the position is grant-funded or unrestricted.
- Confirm whether donor approval is required.
- Approve any proposed offer above the initial approved amount, subject to delegation limits.
- Reject or return an unfunded vacancy request.

Finance may receive information or reports if required, but Finance should not be the business approver for recruitment funding unless the NGO expressly assigns that responsibility.

---

## 3.8 Interview Panel Member

A panel member should be able to:

- Access only assigned vacancies and candidates.
- Review the approved candidate pack.
- Declare conflicts of interest.
- View approved interview questions.
- Enter scores independently.
- Enter evidence-based comments.
- Submit a recommendation.
- Sign or confirm the completed scorecard.

A panel member should not be able to:

- View another panel member's score before submitting their own.
- change another panel member's score.
- access unrelated vacancies.
- view salary details unless authorised.
- view confidential background or safeguarding records.
- alter the final ranking.

---

## 3.9 Executive Approver

The Executive Approver may be the Executive Director, Country Director, or another delegated senior officer.

The Executive Approver should only be involved where required by policy, such as:

- Senior management recruitment.
- HR Manager-created vacancies requiring second-level approval.
- Recruitment outside approved structure.
- Exceptional salary proposals.
- Policy waivers.
- Direct appointments.
- Recruitment cancellations after advanced stages.
- Final approval for sensitive or high-risk roles.

---

## 3.10 Technical System Administrator

The technical administrator should manage the technology, not the recruitment process.

The technical administrator may:

- Create and disable user accounts.
- Assign technical roles based on approved instructions.
- Configure authentication.
- manage backups.
- manage integrations.
- manage email delivery settings.
- monitor system availability.
- manage security settings.
- troubleshoot errors.
- manage software updates.
- restore data from backup where authorised.

The technical administrator should not ordinarily:

- Approve vacancies.
- Approve candidates.
- alter scores.
- change selection decisions.
- view restricted candidate content without authorised support access.
- issue offers.
- approve funding.
- change recruitment outcomes.

All technical administrator access to recruitment data should be logged.

---

# 4. Recruitment Process Overview

The standard recruitment flow should be:

1. Staffing request created.
2. Hiring need reviewed.
3. Budget Holder confirms funding.
4. HR prepares the vacancy.
5. HR Manager approves the vacancy.
6. Vacancy is published.
7. Applicants submit applications.
8. System applies vacancy-specific longlisting rules.
9. HR reviews exceptions and confirms the longlist.
10. Human reviewers complete shortlisting.
11. Selected candidates complete tests where applicable.
12. Interviews are conducted.
13. Scores are consolidated.
14. Preferred and reserve candidates are recommended.
15. References and required background checks are completed.
16. Budget Holder confirms final financial terms where required.
17. HR Manager approves the offer.
18. Candidate accepts the offer.
19. Required pre-employment documents are completed.
20. Successful candidate data is transferred to the ERP.
21. Remaining candidates are notified.
22. Recruitment file is closed and archived.

---

# 5. Staffing Request and Vacancy Initiation

## 5.1 Staffing Request Form

The hiring department should submit:

- Position title
- Department
- Unit or project
- Duty station
- Number of positions
- New position or replacement
- Reason for recruitment
- Name of previous holder where applicable
- Proposed reporting line
- Contract type
- Proposed contract duration
- Expected start date
- Job grade
- Budget line
- Funding source
- Funding end date
- Proposed salary ceiling
- Donor restrictions
- Urgency
- Job description
- Required technical qualifications
- Required experience
- Required language
- Safeguarding sensitivity
- Proposed assessment method
- Proposed interview panel
- Hiring manager details

## 5.2 Staffing Request Statuses

- Draft
- Submitted
- Returned for correction
- Awaiting Budget Holder confirmation
- Funding confirmed
- Funding rejected
- Awaiting HR review
- HR approved
- Awaiting executive approval
- Approved for vacancy preparation
- Rejected
- Cancelled

---

# 6. Vacancy Creation

A vacancy should be created from an approved staffing request.

The vacancy record should contain:

- Vacancy reference number
- Job title
- Department
- Unit or project
- Duty station
- Number of openings
- Reporting line
- Employment type
- Contract type
- Contract duration
- Grade
- Salary disclosure setting
- Opening date
- Closing date
- Time zone
- Job summary
- Responsibilities
- Essential criteria
- Desirable criteria
- Application questions
- Longlisting rules
- Shortlisting criteria
- Assessment stages
- Interview structure
- Required documents
- Safeguarding classification
- Recruitment contact
- Advertisement channels
- Approval history
- Vacancy owner

---

# 7. Vacancy Approval and Publication

## 7.1 Approval Logic

Before publication, the system should confirm:

- Staffing request is approved.
- Budget Holder has confirmed funding.
- Job description is attached.
- Essential criteria are defined.
- Longlisting rules are defined.
- Shortlisting criteria are defined.
- Application questions are complete.
- Closing date is valid.
- Interview and assessment stages are identified.
- Safeguarding classification is complete.
- HR Manager approval is recorded.

## 7.2 Publication Controls

Only an approved vacancy may be published.

The system should allow publication to:

- The NGO's careers page
- Selected external job boards
- Approved social media channels
- Internal notice channels
- Email distribution lists

The platform should record:

- Publication channel
- Publication date
- Advertisement link
- Closing date
- Cost where applicable
- Person who published
- Version of advertisement published

---

# 8. Applicant Portal

The applicant portal should be public-facing and separate from the staff ERP.

It should include:

- Current vacancies
- Vacancy search
- Filters
- Applicant registration
- Candidate profile
- Saved jobs
- Draft applications
- Submitted applications
- Test invitations
- Interview invitations
- Document requests
- Offer response
- Privacy notice
- Fraud warning
- Support contact

The portal should be:

- Mobile responsive
- Accessible
- Simple to use
- Suitable for low-bandwidth environments
- Secure
- Clear about application deadlines
- Able to save incomplete applications

---

# 9. Candidate Profile

A candidate should create one reusable profile.

The profile may contain:

- Full name
- Email
- Phone number
- Address
- Nationality
- Current location
- Work authorisation
- Availability
- Education
- Employment history
- Technical skills
- NGO experience
- Humanitarian experience
- Languages
- Professional certifications
- Referees
- CV
- Cover letter
- Supporting documents

The candidate should still answer vacancy-specific questions for each application.

---

# 10. Vacancy-Specific Application Form

Each vacancy should allow HR to define:

- Mandatory questions
- Optional questions
- Yes or no questions
- Multiple-choice questions
- Numeric questions
- Date questions
- Free-text questions
- File uploads
- Conditional questions
- Declaration questions

The application should include:

- Candidate profile information
- Vacancy-specific experience
- Relevant qualifications
- Technical questions
- Availability
- Duty-station acceptance
- Salary expectation where required
- Conflict-of-interest declaration
- Relationship to NGO staff declaration
- Safeguarding declaration
- Data-processing consent
- Accuracy declaration
- Electronic confirmation

---

# 11. Seamless Rule-Based Longlisting

Longlisting should be one of the strongest features of the platform.

It should not depend on HR manually reading every application before basic eligibility is determined.

## 11.1 Vacancy-Specific Longlisting Rules

Every vacancy should have predefined rules approved before publication.

Rules may include:

- Minimum academic qualification
- Required field of study
- Minimum years of experience
- Minimum years of NGO experience
- Minimum years of technical experience
- Required professional licence
- Required certification
- Required language
- Required duty-station acceptance
- Required work authorisation
- Required computer skill
- Required sector experience
- Required management experience
- Availability before a defined date
- Willingness to travel
- Submission of mandatory document
- Completion of mandatory application question

## 11.2 Rule Types

Each rule should be marked as:

- Mandatory knockout rule
- Scored rule
- Preferred rule
- Informational rule

## 11.3 Automatic Longlisting Process

When the deadline closes, or as applications arrive if configured, the system should:

1. Validate that the application is complete.
2. Evaluate every application against the approved mandatory rules.
3. Mark each rule as met, not met, unclear, or not applicable.
4. calculate any approved eligibility score.
5. Place clearly eligible applicants in the proposed longlist.
6. Place clearly ineligible applicants in the proposed not-longlisted group.
7. Place ambiguous applications in an exception-review queue.
8. Record the exact rule that affected each decision.
9. Produce a longlisting summary.
10. Prevent silent alteration of results.

## 11.4 Longlisting Outcomes

- Automatically eligible
- Automatically ineligible
- Requires HR review
- Duplicate application
- Incomplete application
- Withdrawn

## 11.5 Human Review of Exceptions

HR should only need to review:

- Unclear qualifications
- Equivalent qualifications
- Conflicting answers
- Missing but potentially recoverable information
- Candidate requests for reasonable accommodation
- Suspected duplicates
- System parsing errors
- Approved exceptions

This makes longlisting fast without removing human oversight.

## 11.6 Longlisting Override Controls

An authorised HR user may override an automated outcome only by:

- Selecting an approved override reason.
- Entering a written justification.
- Attaching supporting evidence where required.
- Submitting the change for approval where configured.
- Allowing the system to preserve the original result.
- Recording the person, time, and reason in the audit log.

## 11.7 Rule Locking

Once the vacancy is published:

- Longlisting rules should be locked.
- Changes should require HR Manager approval.
- The system should record the previous and new rule.
- Material changes after applications have been received should trigger a fairness review.
- The platform should not retroactively manipulate applicant outcomes without an auditable approved process.

## 11.8 Longlisting Output

The system should generate:

- Total applications
- Complete applications
- Automatically eligible applicants
- Automatically ineligible applicants
- Applications requiring review
- Reason distribution
- Final confirmed longlist
- Longlisting approval record

---

# 12. Shortlisting

Longlisting confirms minimum eligibility. Shortlisting should compare eligible applicants competitively.

## 12.1 Shortlisting Criteria

Criteria may include:

- Depth of relevant experience
- Similar role experience
- Sector experience
- Context experience
- Technical competence
- Management responsibility
- Achievement evidence
- Language proficiency
- Relevant training
- Experience in the duty location
- Experience with donors or grants
- Quality of motivation statement

## 12.2 Shortlisting Matrix

Each criterion should have:

- Definition
- Evidence expected
- Weight
- Maximum score
- Minimum acceptable score
- Reviewer score
- Reviewer comment

## 12.3 Reviewer Process

The system should support:

- One or more reviewers
- Independent scoring
- Blind scoring where required
- Candidate assignment
- Reviewer deadlines
- Conflict-of-interest declaration
- Score variance alerts
- Consolidated score
- Final shortlist approval

## 12.4 Shortlisting Controls

- Reviewers should not change longlisting rules.
- Reviewers should score only eligible candidates.
- Scores should be locked after submission.
- Changes should require justification.
- The platform should preserve all versions.
- Final shortlist should be approved by authorised HR.

---

# 13. Tests and Assessments

The platform should support:

- Written tests
- Technical tests
- Case studies
- Presentations
- Practical tests
- Computer tests
- Language tests
- Driving tests
- Data exercises
- Clinical scenarios

The platform should allow:

- Test instructions
- Time limits
- Candidate-specific links
- Question banks
- File uploads
- Automatic scoring
- Manual scoring
- Pass marks
- Reviewer assignment
- Score locking
- Late-submission rules
- Accommodation settings
- Test result approval

---

# 14. Interview Management

The platform should support:

- Panel interviews
- Technical interviews
- Competency interviews
- Final interviews
- Remote interviews
- Physical interviews

It should include:

- Panel nomination
- Panel approval
- Conflict declarations
- Candidate scheduling
- Calendar invitations
- Interview reminders
- Interview guide
- Standard questions
- Technical questions
- Competency questions
- Safeguarding question
- Scoring rubric
- Independent scoring
- Consolidated result
- Panel recommendation

Panel members should not see one another's scores until all required scores are submitted.

---

# 15. Candidate Ranking and Recommendation

The system should combine approved recruitment-stage scores.

Example:

- Shortlisting: 20%
- Written test: 30%
- Interview: 50%

The system should show:

- Candidate name
- Stage scores
- Weighted total
- Rank
- Pass or fail status
- Panel recommendation
- Preferred candidate
- Reserve candidate
- Disqualification reason where applicable

The system should require justification where the highest-ranked candidate is not recommended.

---

# 16. References and Background Checks

The platform should support:

- Structured reference requests
- Secure referee links
- Employment verification
- Qualification verification
- Professional licence verification
- Identity verification
- Criminal-record checks where lawful
- Safeguarding checks
- Sanctions screening where required
- Work-authorisation checks
- Driving-licence checks for driver roles

Sensitive findings should be restricted.

Ordinary interview panel members should not have access to confidential check details.

---

# 17. Offer and Financial Approval

The Budget Holder should confirm:

- Approved salary ceiling
- Approved consultancy fee ceiling
- Funding period
- Funding source
- Budget line
- Any donor restriction

HR should prepare:

- Proposed grade
- Proposed step
- Salary or fee
- Contract duration
- Start date
- Conditions of offer

The HR Manager should approve the offer within delegated authority.

Exceptional offers should be routed to the authorised executive and, where required, the Budget Holder.

Finance should not replace the Budget Holder in this workflow.

---

# 18. Pre-Employment Requirements

Before ERP transfer, the platform should confirm completion of required items such as:

- Accepted offer
- Signed contract
- Identification
- Academic certificates
- Professional licence
- References
- Background checks
- Safeguarding clearance
- Work permit
- Medical fitness where lawful and job-related
- Bank details
- Tax details
- Pension details
- Emergency contact
- Next of kin
- Code of conduct
- PSEA declaration
- Conflict-of-interest declaration
- Confidentiality agreement

Each item should have a status:

- Not requested
- Requested
- Submitted
- Under review
- Verified
- Rejected
- Waived with approval
- Not applicable

---

# 19. Transition to the Existing ERP

The recruitment platform should stop managing the person as an applicant once the person is formally hired and transferred.

## 19.1 ERP Transfer Trigger

Transfer should occur only when:

- Final offer is accepted.
- Mandatory checks are complete.
- Pre-employment requirements are complete.
- HR Manager approves the transfer.
- Start date is confirmed.

## 19.2 Data to Transfer

Only required data should be transferred, including:

- Full name
- Contact details
- Date of birth where required
- Gender where required
- Address
- Nationality
- Emergency contact
- Next of kin
- Department
- Position
- Grade
- Supervisor
- Duty station
- Contract type
- Contract dates
- Start date
- Salary details
- Budget or project code
- Bank details
- Tax details
- Pension details
- Required identity documents
- Required certificates
- Signed offer
- Signed contract
- Recruitment reference number

## 19.3 Transfer Method

The platform should support:

- API transfer
- Secure file export
- Approved manual transfer
- Transfer confirmation
- Error reporting
- Duplicate employee check
- Retry after failure

## 19.4 Post-Transfer Status

After successful transfer:

- Candidate status becomes Hired and Transferred to ERP.
- ERP employee ID is returned to the recruitment platform.
- Recruitment record becomes read-only except for authorised closure actions.
- Ongoing staff management occurs only in the ERP.
- The recruitment platform retains the recruitment file according to retention policy.

---

# 20. Candidate Communication

The platform should have templates for:

- Application confirmation
- Incomplete application
- Test invitation
- Interview invitation
- Interview rescheduling
- Document request
- Reference request
- Conditional offer
- Final offer
- Regret notification
- Vacancy cancellation
- Recruitment delay
- Talent-pool consent

All communications should be logged.

Bulk communication should not expose candidate email addresses to one another.

---

# 21. Vacancy and Candidate Statuses

## 21.1 Vacancy Statuses

- Draft
- Awaiting HR Manager approval
- Returned for correction
- Approved
- Scheduled
- Open
- Closed to applications
- Longlisting
- Shortlisting
- Assessment
- Interview
- Due diligence
- Offer
- Filled
- Cancelled
- Archived

## 21.2 Candidate Statuses

- Draft application
- Submitted
- Incomplete
- Automatically eligible
- Automatically ineligible
- Exception review
- Longlisted
- Not longlisted
- Shortlisted
- Not shortlisted
- Invited for assessment
- Assessment completed
- Assessment passed
- Assessment failed
- Invited for interview
- Interview completed
- Recommended
- Reserve candidate
- Reference check
- Background check
- Conditional offer
- Offer accepted
- Offer declined
- Pre-employment clearance
- Ready for ERP transfer
- Transferred to ERP
- Withdrawn
- Rejected
- Archived

---

# 22. Dashboards

## 22.1 HR Dashboard

The HR dashboard should show:

- Vacancies awaiting approval
- Open vacancies
- Applications received
- Longlisting progress
- Exception-review queue
- Shortlisting progress
- Upcoming assessments
- Upcoming interviews
- Pending panel scores
- Pending references
- Pending background checks
- Offers awaiting approval
- Candidates awaiting ERP transfer
- Overdue recruitment actions
- Time-to-fill

## 22.2 HR Manager Dashboard

The HR Manager should see:

- Vacancies awaiting approval
- Longlisting rule changes awaiting approval
- Recruitment exceptions
- Vacancies outside service timelines
- Final recommendations awaiting approval
- Offers awaiting approval
- ERP transfers awaiting approval
- Recruitment compliance gaps
- Vacancy ageing
- Recruitment performance by HR user

## 22.3 Budget Holder Dashboard

The Budget Holder should see:

- Staffing requests awaiting funding confirmation
- Positions by budget line
- Proposed salary ceilings
- Offer variations awaiting approval
- Funding end dates
- Recruitment linked to their projects or budgets

## 22.4 Hiring Department Dashboard

The hiring department should see:

- Submitted staffing requests
- Recruitment progress
- Applications assigned for review
- Pending shortlisting
- Upcoming interviews
- Pending scorecards
- Final recommendations

---

# 23. Reports

The platform should generate:

- Staffing request report
- Vacancy report
- Application report
- Longlisting report
- Longlisting exception report
- Shortlisting report
- Assessment result report
- Interview result report
- Candidate ranking report
- Selection report
- Reference status report
- Background-check status report
- Offer report
- Recruitment closure report
- ERP transfer report
- Recruitment timeline report
- Time-to-fill report
- Source-of-application report
- Source-of-hire report
- Diversity report where lawful
- Recruitment compliance report
- Audit report

---

# 24. Audit and Integrity Controls

The platform should record:

- Who created a vacancy
- Who approved it
- Who changed eligibility rules
- Who reviewed an application
- Original automated longlisting result
- Any override
- Reason for override
- Shortlisting scores
- Score changes
- Interview scores
- Final recommendation
- Offer approval
- Candidate acceptance
- ERP transfer
- Record export
- Record deletion or archiving
- User permission changes

The system should prevent:

- Self-approval where prohibited
- Silent score changes
- Silent rule changes
- Deletion of submitted applications
- Unauthorised exports
- Panel members viewing one another's scores before submission
- Technical administrators making recruitment decisions
- Unapproved ERP transfer

---

# 25. Permissions Model

Permissions should be based on:

- Role
- Vacancy assignment
- Recruitment stage
- Department
- Sensitivity
- Approval authority

Examples:

- An HR Assistant may draft but not publish.
- An HR Officer may manage candidates but not approve their own vacancy.
- The HR Manager may approve vacancies and recruitment exceptions.
- A Budget Holder may approve funding but not interview scores.
- A panel member may score assigned candidates only.
- A technical administrator may maintain the system but not make recruitment decisions.
- A safeguarding user may access restricted clearance information.
- An applicant may access only their own information.

---

# 26. Data Protection

The platform should provide:

- Candidate privacy notice
- Consent records
- Data minimisation
- Role-based access
- Encryption
- Secure file upload
- Retention schedule
- Candidate data correction
- Candidate data deletion where applicable
- Secure archive
- Automatic anonymisation where configured
- Legal hold
- Breach logging
- Restricted export

---

# 27. Minimum Viable Product

The first version should include:

1. User and role management
2. Staffing request
3. Budget Holder confirmation
4. Vacancy creation
5. HR Manager approval
6. Public applicant portal
7. Candidate profile
8. Vacancy-specific application form
9. Rule-based automatic longlisting
10. Exception-review queue
11. Human shortlisting
12. Interview scheduling
13. Interview scorecards
14. Candidate ranking
15. References
16. Offer approval
17. Pre-employment checklist
18. ERP transfer
19. Candidate communication
20. Reports
21. Audit log

---

# 28. Advanced Features

The full version of the platform should include the following advanced capabilities.

## 28.1 Structured CV Parsing

The platform should extract structured information from uploaded CVs, including:

- Candidate name
- Contact information
- Education
- Employment history
- Job titles
- Employers
- Employment dates
- Years of experience
- Technical skills
- Certifications
- Languages
- Professional memberships

CV parsing should only organise information. It should not independently decide whether a candidate is suitable.

Candidates should be able to review and correct extracted information before submitting an application.

## 28.2 Duplicate Candidate Detection

The platform should detect possible duplicate candidate accounts or applications using:

- Email address
- Phone number
- Identification number where lawfully collected
- Similar names
- Similar employment history
- Repeated CV uploads
- Device or account indicators where lawful

Possible duplicates should be placed in a review queue rather than deleted automatically.

## 28.3 Anonymised Longlisting and Shortlisting

The platform should allow HR to hide unnecessary personal information during early review stages, including:

- Name
- Photograph
- Gender
- Age
- Address
- Nationality
- Religion
- Marital status
- Other non-essential identifiers

HR should be able to determine which fields remain visible for each vacancy.

## 28.4 Online Assessment Centre

The platform should support:

- Timed written tests
- Multiple-choice questions
- Essay questions
- File-upload tasks
- Case studies
- Technical exercises
- Presentation submissions
- Automatic saving
- Candidate-specific assessment links
- Pass marks
- Manual scoring
- Automatic scoring for objective questions
- Assessment attendance
- Submission timestamps
- Late-submission controls
- Accommodation settings
- Assessment result approval

## 28.5 Question and Assessment Bank

HR should maintain a controlled bank of:

- Eligibility questions
- Longlisting questions
- Technical test questions
- Competency questions
- Safeguarding questions
- Interview questions
- Scoring guides
- Model answers

The system should support:

- Categories
- Difficulty levels
- Job families
- Version control
- Restricted access
- Random question selection
- Reuse across vacancies
- Review and expiry dates

## 28.6 Talent Pools and Recruitment Rosters

The platform should maintain approved talent pools for:

- Emergency response
- Consultants
- Enumerators
- Drivers
- Community mobilisers
- Health personnel
- Nutrition personnel
- WASH personnel
- Protection personnel
- MEAL personnel
- Finance and operations roles
- Interns and volunteers
- Reserve candidates

Each roster record should show:

- Technical category
- Preferred location
- Availability
- Expected rate or grade
- Previous assessment results
- Reference status
- Background-check status
- Roster expiry date
- Last verification date
- Deployment or hiring history

Candidates should provide consent before being placed in a talent pool.

## 28.7 Emergency Recruitment Workflow

The system should provide a controlled accelerated process for emergency hiring.

This should include:

- Emergency vacancy classification
- Shortened approval route
- Pre-approved job descriptions
- Pre-approved assessment templates
- Use of existing rosters
- Rapid candidate availability checks
- Bulk SMS and email communication
- Same-day or next-day assessment scheduling
- Remote interviews
- Expedited offer preparation
- Mandatory identity, reference, and safeguarding controls
- Approved exception record
- Post-recruitment compliance review

Emergency recruitment should be faster, but essential controls should not be removed.

## 28.8 Internal Vacancy Portal

Although the platform is not a staff-management system, it may provide a restricted internal vacancy page connected to the ERP.

The internal portal should allow current staff to:

- View internal vacancies
- Apply using an ERP-linked identity
- Import approved profile information from the ERP
- Submit vacancy-specific information
- Track their application
- Receive internal recruitment communications

The recruitment process should remain inside the recruitment platform.

Where an internal candidate is selected, the result should be sent back to the ERP for the applicable transfer, promotion, or contract action.

## 28.9 Job Board and Careers Page Integration

The platform should support controlled vacancy publishing to:

- The NGO's website
- ReliefWeb
- LinkedIn
- Devex
- Impactpool
- Jobberman
- Approved national job boards
- University career portals
- Professional association platforms
- Social media channels

The system should track:

- Publication date
- Publication channel
- Vacancy link
- Advertisement cost
- Number of applicants by source
- Number of eligible applicants by source
- Shortlisted candidates by source
- Hires by source
- Cost per qualified applicant
- Cost per hire

## 28.10 Digital Signatures and Electronic Approvals

The platform should support secure electronic approval and signature for:

- Staffing requests
- Vacancy approvals
- Conflict-of-interest declarations
- Shortlisting approval
- Interview scorecards
- Selection recommendations
- Reference forms
- Offer approvals
- Conditional offers
- Final offers
- Candidate acceptance
- Pre-employment declarations
- ERP transfer approval
- Recruitment closure

The system should record:

- Signatory
- Date and time
- Document version
- Approval or signature status
- Authentication method
- Any subsequent amendment

## 28.11 Background-Check Integration

The platform should connect with approved third-party providers for:

- Identity verification
- Qualification verification
- Employment verification
- Professional licence verification
- Criminal-record checks where lawful
- Sanctions screening
- Safeguarding checks
- Work-authorisation checks
- Driving-licence verification

The system should transmit only necessary information and should restrict access to returned results.

## 28.12 Advanced Recruitment Analytics

The platform should provide detailed analytics on:

- Vacancy volume
- Application volume
- Qualified application rate
- Longlisting rejection reasons
- Shortlisting conversion
- Assessment pass rate
- Interview pass rate
- Offer acceptance
- Candidate withdrawal
- Recruitment duration
- Recruitment cost
- Source effectiveness
- Diversity at each stage where lawfully monitored
- Performance of recruitment teams
- Panel participation
- Delayed stages
- Failed recruitments
- Repeatedly difficult-to-fill roles
- ERP transfer success and failure

Dashboards should allow filtering by:

- Date
- Department
- Project
- Duty station
- Job family
- Grade
- Contract type
- HR user
- Budget Holder
- Vacancy status

## 28.13 Multilingual Applicant Portal

The public portal should support multiple languages configured by the NGO.

This should include:

- Vacancy pages
- Application forms
- Instructions
- Consent notices
- Email templates
- SMS templates
- Applicant dashboard
- Help content

The platform should preserve the official recruitment record in the organisation's designated working language.

## 28.14 SMS and WhatsApp Notifications

Where legally and operationally approved, the platform should send:

- Application confirmations
- Deadline reminders
- Assessment invitations
- Interview invitations
- Schedule changes
- Document requests
- Offer notifications
- Recruitment cancellation notices

The candidate should be able to select communication preferences.

Sensitive recruitment information should not be included in unsecured messages.

## 28.15 Calendar and Video-Meeting Integration

The platform should integrate with:

- Microsoft Outlook
- Microsoft Teams
- Google Calendar
- Google Meet
- Zoom

This should support:

- Panel availability
- Candidate scheduling
- Calendar invitations
- Interview reminders
- Meeting links
- Time-zone conversion
- Rescheduling
- Attendance confirmation

## 28.16 Bulk Recruitment Tools

For high-volume recruitment, the system should support:

- Bulk application review
- Bulk status changes
- Bulk candidate communication
- Bulk interview scheduling
- Multiple interview panels
- Assessment-centre management
- Candidate grouping
- Attendance lists
- Batch score upload
- Batch document requests
- Batch reference requests
- Batch ERP transfer after final approval

## 28.17 Offline and Low-Connectivity Recruitment

For field locations with weak internet, the platform should support:

- Lightweight applicant pages
- Low-data mode
- Save and continue later
- Offline assessment packs
- Downloadable candidate lists
- Offline score collection
- Controlled score upload
- SMS-based notifications
- Mobile-friendly forms
- Resumption after connection failure

## 28.18 Candidate Document Verification

The platform should support:

- Document authenticity status
- Verification notes
- Expiry dates
- Verification source
- Verified-by record
- Date verified
- Rejected-document reason
- Replacement request
- Restricted document access
- Version history

## 28.19 Configurable Recruitment Service Standards

The HR Manager should configure expected timelines for:

- Staffing request review
- Budget confirmation
- Vacancy approval
- Advertising period
- Longlisting
- Shortlisting
- Assessment
- Interview
- Reference checking
- Offer approval
- Pre-employment clearance
- ERP transfer
- Recruitment closure

The system should provide:

- Due dates
- Reminders
- Escalations
- Overdue indicators
- Service-standard reports
- Delay reasons

## 28.20 Candidate Appeal and Review Process

Where permitted by policy, applicants should be able to raise a recruitment-process complaint or request review.

The platform should record:

- Vacancy
- Candidate
- Nature of complaint
- Date received
- Supporting documents
- Assigned reviewer
- Conflict check
- Review findings
- Decision
- Communication to candidate
- Closure date

The appeal process should not allow an applicant to view confidential information about other candidates.

## 28.21 Recruitment Document Pack Generation

The platform should generate complete recruitment packs, including:

- Vacancy approval pack
- Longlisting pack
- Shortlisting pack
- Assessment pack
- Interview panel pack
- Selection pack
- Offer pack
- Recruitment closure pack
- Audit pack

Each generated pack should use the approved version of every relevant record.

## 28.22 ERP Integration Monitoring

The platform should include an integration dashboard showing:

- Candidates awaiting transfer
- Transfer in progress
- Successful transfer
- Failed transfer
- Duplicate employee warning
- Missing required field
- ERP employee number
- Retry status
- Transfer date
- User who approved transfer

## 28.23 Configuration and No-Code Workflow Management

The HR Manager should be able to configure routine recruitment settings without software development, including:

- Recruitment stages
- Vacancy approval routes
- Candidate statuses
- Longlisting rule templates
- Shortlisting templates
- Interview scorecards
- Assessment templates
- Offer approval routes
- Communication templates
- Recruitment timelines
- Mandatory documents
- ERP transfer requirements

Technical configuration affecting security, infrastructure, or integrations should remain under the technical administrator.

## 28.24 Full Audit and Version History

Advanced audit functionality should preserve:

- Every vacancy version
- Every rule version
- Every score version
- Every approval
- Every override
- Every status change
- Every document version
- Every communication
- Every export
- Every ERP transfer attempt
- Every role or permission change

The platform should make it possible to reconstruct the complete recruitment process from beginning to end.

---

# 29. Core Design Principles

The final platform should follow these principles:

- It is built for one NGO.
- It is built primarily around applicants and recruitment teams.
- It ends at transfer to the existing ERP.
- It does not duplicate staff-management functions.
- HR Manager is the operational owner of the recruitment system.
- Technical administrators manage technology, not recruitment decisions.
- Budget Holders confirm money and funding authority.
- Longlisting is rule-based, fast, transparent, and vacancy-specific.
- Human review is focused on exceptions and competitive shortlisting.
- Every important action is traceable.
- No user approves their own action where policy prohibits it.
- Applicant information is protected.
- Recruitment decisions are evidence-based.
- The complete recruitment file remains audit-ready.

---

# 30. Final End-to-End Flow

```text
Hiring Department creates staffing request
        ↓
Budget Holder confirms funding and ceiling
        ↓
HR prepares vacancy and longlisting rules
        ↓
HR Manager approves vacancy
        ↓
Vacancy is published
        ↓
Applicants submit applications
        ↓
System applies predefined longlisting rules
        ↓
HR reviews only exceptions
        ↓
Confirmed longlist is produced
        ↓
Human shortlisting is completed
        ↓
Tests and interviews are conducted
        ↓
Scores are consolidated
        ↓
Preferred and reserve candidates are recommended
        ↓
References and background checks are completed
        ↓
Budget Holder confirms final financial terms where required
        ↓
HR Manager approves offer
        ↓
Candidate accepts and completes pre-employment requirements
        ↓
HR Manager approves ERP transfer
        ↓
Successful candidate is created in ERP
        ↓
Recruitment is closed and archived
```
