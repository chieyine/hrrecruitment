# 5. Candidates and applying

## 5.1 The reusable profile

A candidate maintains one profile and reuses it across every application. It holds personal and contact details, work authorisation and availability, and repeating records for education, employment, licences, certifications, skills and languages, plus a document library.

Each employment entry carries employer, job title, employment type, country, dates, responsibilities, reason for leaving and supervisor contact — including whether the candidate permits that supervisor to be contacted, which the reference stage respects.

Licences carry a verification status. This matters at longlisting: an unverified licence is treated as *unclear* rather than as a failure, so a genuine professional is not rejected because HR has not yet checked their certificate.

## 5.2 CV parsing

When a candidate uploads a CV the platform extracts what it can: name, email, phone, education entries with qualification, field of study and year, employment entries with dates and current-role detection, skills, certifications, languages, professional memberships, and an estimate of total experience that merges overlapping roles rather than adding them up.

Two rules govern the parser:

- **It only organises information.** It never scores, ranks or judges suitability.
- **The candidate reviews and corrects everything** before the application is submitted. What the parser produces is a draft.

The parser is deliberately conservative. Where a line is ambiguous it omits the field rather than guessing, because a wrong value the candidate has to notice and correct is worse than a blank one they expect to fill. A CV with no recognisable structure yields nothing and reports low confidence, rather than inventing entries.

## 5.3 Making an application

The application combines profile data with vacancy-specific answers. Candidates may save a draft repeatedly and return to it; drafts auto-save and recover locally if a connection drops mid-form.

Submission requires:

- A verified email address
- Every mandatory question answered, with conditional questions evaluated server-side
- Every mandatory document supplied
- The declarations accepted: conflict of interest, relationship to NGO staff, safeguarding, data-processing consent, and accuracy

One application per candidate per vacancy is enforced by a database constraint, not by a check that could race.

On submission the platform takes a **profile snapshot**. This is what the rest of the process assesses. A candidate who edits their profile afterwards does not change the basis on which their application was judged, and a longlisting run repeated months later produces the same result.

## 5.4 What the candidate sees afterwards

A dashboard listing their applications with a plain-language status, what it means, what they should do, and what happens next. Alongside it: tasks, messages, interview invitations, assessment invitations, document requests, offers and preboarding.

Every status carries specific guidance rather than a generic placeholder. "Under review" tells them no action is needed; "Incomplete" tells them exactly what is missing and that the deadline still applies.

## 5.5 Accessibility and low connectivity

- Keyboard-navigable throughout, with landmarks and accessible names
- Reduced-motion respected
- Responsive layouts down to small screens
- Print styles for offline reference
- Plain-language errors, never raw validation codes
- Auto-save, local draft recovery, retryable uploads
- HR-assisted entry for candidates who cannot apply online, recorded as assisted and audited

## 5.6 Complaints and appeals

An applicant may raise a complaint or request a review of the process. The platform records the vacancy, the candidate, the nature of the complaint, the date received, supporting documents, the assigned reviewer, a conflict check on that reviewer, findings, the decision, the communication sent and the closure date.

The appeal process never exposes information about other candidates.

## 5.7 Privacy rights

Candidates may export their data and request correction or deletion. Deletion requests are reviewed rather than executed blindly, because a recruitment record under legal hold or within a statutory retention window cannot simply be erased — the platform records the decision and its basis either way.
