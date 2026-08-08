# 4. Vacancies

## 4.1 What a vacancy record holds

| Group | Fields |
| --- | --- |
| Identity | Reference number (unique, auto-assigned), title, department, project, category, duty station |
| Establishment | Number of openings, reporting line, grade, contract type, contract duration |
| Content | Summary, responsibilities, essential criteria, desirable criteria, desired experience, language requirements, technical skills, behavioural competencies, safeguarding responsibilities, travel requirement |
| Timing | Opening date, closing date, time zone |
| Pay | Salary disclosure setting, range minimum and maximum, currency |
| Governance | Safeguarding classification, recruitment contact name and email, originating staffing request, owner |
| Assessment | Application questions, required documents, screening scorecard, interview scorecard, preboarding package |
| Special routes | Audience, emergency flag and justification, anonymised review policy |
| Locking | Timestamp at which longlisting rules locked |

Salary disclosure has three settings — hidden, range, or exact. Choosing *range* requires both bounds, and the maximum may not fall below the minimum.

## 4.2 Audience: public and internal vacancies

Every vacancy is `PUBLIC`, `INTERNAL` or `BOTH`.

An internal vacancy is visible only to a verified member of staff. This is enforced in four places, not one:

- The careers page filters by audience against the viewer's identity
- The public vacancy list endpoint does the same
- The public vacancy detail endpoint does the same, so an internal reference number cannot be resolved by guessing it
- The application endpoint blocks submission *and* draft saving, so nobody can start an application against a role they are not eligible for and submit it later

Where a member of staff is selected for an internal vacancy, the result still produces the standard handover pack, flagged as a transfer or promotion action rather than a new hire.

## 4.3 Application questions

Ten question types are available: text, long text, number, date, yes/no, single select, multi select, file upload, declaration, and conditional questions that appear only when an earlier answer requires them. Conditions are enforced on the server, so a hidden question cannot be answered by manipulating the form.

Selection questions require at least two options. Every question requires a label. A vacancy may hold at most one hundred questions.

## 4.4 Required documents

Each required document specifies its type, whether it is mandatory, the accepted file extensions, a maximum size, and whether an expiry date must be supplied. Document types are configured centrally, so a vacancy cannot request a type the organisation does not recognise, and each type may be requested only once.

## 4.5 Approval and publication

A recruitment-officer vacancy moves `DRAFT` to `PENDING_APPROVAL`, then to approved and published. Submitting routes it to the HR Manager. If the sole HR Manager owns and submits the vacancy, the platform records an automatic approval and moves it directly to `APPROVED`; there is no extra approval tier. Publication remains a separate action and all gates below still apply.

Publication is gated. The platform refuses to publish until every one of these is true:

| Check | Why |
| --- | --- |
| A staffing request is linked | A vacancy with no origin has no justification |
| That request is approved for vacancy preparation | An unapproved request is still a proposal |
| Budget Holder funding is confirmed | Nothing is advertised that is not funded |
| At least one mandatory longlisting rule exists | Otherwise automatic longlisting can decide nothing |
| A screening scorecard is chosen | Shortlisting criteria must exist before applications arrive |
| An interview scorecard is chosen | The assessment structure must be settled in advance |
| At least one application question exists | |
| Safeguarding classification is set | It determines which due-diligence checks apply |
| A recruitment contact email is recorded | Applicants need a real person to ask |
| Mandatory content is complete | Reference, title, summary, responsibilities, essential criteria, positions, valid dates |
| Screening scorecard weights total 100 | A matrix that does not sum is not a matrix |

When the vacancy is emergency-classified, three further checks apply — see chapter 12.

The response lists every unmet condition at once rather than reporting them one at a time.

```note
**Publication locks the longlisting rules.** From that moment a rule change is no longer an edit; it is a proposal requiring HR Manager approval, carrying a before-and-after record, and triggering a fairness review if applications have already been received. See chapter 6.
```

## 4.6 Vacancy statuses

```
DRAFT -> PENDING_APPROVAL -> APPROVED -> SCHEDULED -> OPEN
                |                                      |
                v                                      v
       RETURNED_FOR_CORRECTION                       PAUSED
                                                       |
                                                       v
                                                     CLOSED
                                                       |
                        LONGLISTING -> SHORTLISTING -> ASSESSMENT
                                                       |
                              INTERVIEW -> DUE_DILIGENCE -> OFFER
                                                       |
                                                     FILLED -> COMPLETED -> ARCHIVED
```

^ Figure 3. The vacancy tracks which recruitment stage it has reached, so a portfolio view shows where each exercise actually is.

A vacancy may be paused with a reason, extended with a later closing date and a reason, cancelled by an HR Manager with a reason, or duplicated to seed a new draft — the duplicate copies content, questions and document requirements but never the approval, the applications or the lock.

## 4.7 The careers portal

Public pages list open vacancies with search and filtering by department, category and duty station. Search terms are capped at one hundred characters, because the parameter is untrusted and drives multiple pattern comparisons.

Each vacancy page shows the summary, responsibilities, criteria, duty station, closing date and recruitment contact, and — where disclosure allows — the salary range. It also carries the privacy notice and the fraud warning: FRAD never charges a fee at any stage of recruitment.

The portal is mobile-responsive, works on low bandwidth, saves incomplete applications, and states deadlines in the vacancy's own time zone.
