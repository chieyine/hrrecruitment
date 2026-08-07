# 8. References and due diligence

## 8.1 References

Referees are nominated by the candidate and contacted through a secure, single-use, expiring link. A referee never holds an account and never sees anything except the questions.

The platform supports structured reference requests, reminders, verification of the response, records of referees who could not be contacted, manager-authorised waivers, and HR-recorded manual references where a referee replied by phone or letter. A manual entry requires evidence and must resolve to one of the canonical outcomes — satisfactory, concerns raised, or unsatisfactory — so it cannot be recorded as an ambiguous note.

Reference responses may carry a confidential comment visible only to authorised HR. Panel members never see reference content.

## 8.2 Background and due-diligence checks

Nine check types are supported:

Identity verification, qualification verification, employment verification, professional licence verification, criminal-record check, sanctions screening, safeguarding check, work-authorisation check, and driving-licence verification.

### Which checks apply

The required set is derived from the vacancy rather than chosen ad hoc:

| Condition | Checks added |
| --- | --- |
| Every vacancy | Identity, qualification, employment, work authorisation |
| Safeguarding classification elevated or high | Safeguarding, criminal record |
| Safeguarding classification high | Sanctions screening |
| Title indicates a driving role | Driving licence |
| Title indicates a clinical role | Professional licence |

### Lawful basis

Criminal-record, safeguarding and sanctions checks are only lawful in particular circumstances. The platform requires a written lawful basis to be recorded **before** such a check may be requested — not afterwards as documentation.

### Data minimisation

Each check type declares the minimum field set it needs, and only those fields are transmitted to a provider.

| Check | Fields shared |
| --- | --- |
| Identity | Full name, date of birth, identity document number |
| Qualification | Full name, institution, qualification, completion year |
| Employment | Full name, employer, job title, start and end dates |
| Professional licence | Full name, professional body, licence number |
| Criminal record | Full name, date of birth, identity document number |
| Sanctions screening | Full name, date of birth, nationality |
| Safeguarding | Full name, date of birth |
| Work authorisation | Full name, nationality, permit number |
| Driving licence | Full name, licence number, licence class |

The audit log records **which fields were shared**, never their values.

### Restricted findings

Findings for criminal-record, safeguarding and sanctions checks are restricted. Everyone managing the process can see that such a check exists and what state it is in — otherwise the process could not be managed — but the finding text, restricted notes and evidence file are removed **on the server** for anyone without the restricted-read permission.

Writing a finding on a restricted check requires the same authority as reading one; read and write are not separable here.

Recording *concerns raised* requires a written summary of the concern. A status alone is not a finding.

### Waivers

A required check may be waived, but only by an HR Manager, and only with a reason of at least fifteen characters. Waivers appear in their own report.

### Check states

| State | Meaning |
| --- | --- |
| Not requested | Identified as required, not yet initiated |
| Requested | Sent to the provider or internal team |
| In progress | Provider acknowledged |
| Response received | Returned, not yet reviewed |
| Cleared | No adverse finding |
| Concerns raised | Adverse or ambiguous; requires a written summary |
| Failed | Adverse and disqualifying |
| Waived | Explicitly waived by an HR Manager with a reason |
| Not applicable | Determined not to apply |

Anything other than cleared, waived or not-applicable blocks the offer.

## 8.3 Document verification

Documents supplied by candidates carry an authenticity status, verification notes, expiry dates, the verification source, who verified them and when, a rejection reason where applicable, a replacement request, restricted access, and full version history — so a re-uploaded certificate does not erase the record of the one it replaced.
