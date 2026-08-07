# 3. Staffing requests and funding

Every vacancy starts here. There is no way to create a publishable vacancy without an approved staffing request behind it.

## 3.1 What a request captures

A request records twenty-five fields across five groups. The grouping matters because different people own different parts.

| Group | Fields |
| --- | --- |
| Position and structure | Position title, department, project or grant, duty station, number of positions, replacement or new, previous holder, reason for recruitment, proposed reporting line |
| Contract and timing | Contract type, proposed duration, expected start date, job grade, urgency |
| Funding (proposed) | Budget line, funding source, funding end date, proposed salary ceiling, donor restrictions |
| Requirements | Job description attachment, required qualifications, required experience, required languages, safeguarding sensitivity, proposed assessment method, proposed panel |
| Requester | Hiring manager name, email, phone |

Two validation rules run at entry:

- A replacement must name the previous holder, otherwise the establishment record cannot be reconciled.
- A grant-funded position must carry a funding end date, and that date must fall after the expected start — a post funded only up to the day it starts is not funded.

## 3.2 The lifecycle

```
DRAFT
  |  submit (job description required)
  v
AWAITING_FUNDING_CONFIRMATION  ---- rejected ---->  FUNDING_REJECTED
  |  Budget Holder confirms                              |
  v                                                       | revise
FUNDING_CONFIRMED                                         v
  |                                             RETURNED_FOR_CORRECTION
  v                                                       |  resubmit
AWAITING_HR_REVIEW  <-------------------------------------+
  |  HR approves
  v
HR_APPROVED
  |                    \  policy requires escalation
  |                     v
  |            AWAITING_EXECUTIVE_APPROVAL
  |                     |  approved
  v                     v
APPROVED_FOR_VACANCY  <-+
```

^ Figure 2. Twelve statuses. The transition table refuses anything not drawn here — a request cannot reach approval without passing through funding.

The ordering is the point. Funding is confirmed *before* HR spends time reviewing the substance, because a request nobody will pay for should not consume HR's attention.

## 3.3 Submission

Submitting requires an attached job description. The platform blocks submission without one, because the job description is what HR, the panel and the eventual scorecard all recruit against — reconstructing it later from the request narrative produces a different job.

On submission the requester signs. The signature covers the position title, number of positions, budget line and grade, so a later quiet edit to any of those is detectable.

## 3.4 Automatic escalation

The platform decides whether an executive must be involved, rather than leaving it to whoever is handling the request.

| Trigger | Reason shown |
| --- | --- |
| Job grade begins D, E, SM or EX | Senior management grade |
| Urgency is Emergency | Emergency recruitment |
| Not a replacement, and three or more positions | New establishment of three or more positions |

A routine single replacement at a junior grade does not escalate. When escalation does apply, the approval is routed to an approver who is independent of both the requester and the HR reviewer, and the reason is displayed alongside the request so nobody has to guess why it stalled.

## 3.5 The funding decision

This is the Budget Holder's screen, and it is deliberately narrow — it contains no candidate information whatsoever.

A confirmation records the budget line, funding source, funding start and end, the salary or consultancy ceiling with its currency, the maximum recruitment cost, whether the post is grant-funded, whether donor approval is required and its reference, and a free-text comment.

Confirming requires the budget line, the ceiling and the funding end date. A confirmation without them is not a confirmation — it is an opinion. Rejecting or returning requires a reason.

```note
**Only one confirmation is ever current.** Recording a new one supersedes the previous, which is retained for audit. This means the question "what is the approved ceiling for this post?" always has exactly one answer, and the history of how it changed is still available.
```

The decision is signed by the Budget Holder, and the signature is written in the same database transaction as the confirmation itself. If the signature cannot be written, no funding decision is recorded at all — there is no state in which an approved envelope exists without a signatory.

On confirmation the request moves straight to HR review, and the confirmed budget line and funding end date are copied onto the request so the vacancy inherits the real figures rather than the proposed ones.

## 3.6 Offer variations

When an offer is later prepared above the confirmed ceiling, it is flagged and returned to the Budget Holder for re-confirmation before the HR Manager may approve it. These appear on the Budget Holder's dashboard as a distinct queue.

## 3.7 The Budget Holder dashboard

Four sections, and nothing else:

- Staffing requests awaiting a funding decision, with emergency requests highlighted
- Offers that exceed a confirmed ceiling and need re-confirmation
- The Budget Holder's own decision history, including superseded ones
- Funding ending within three months, so a post is not filled against money about to expire

## 3.8 Creating the vacancy

A vacancy may be linked to a staffing request at any point while it is a draft, but the link is validated: only a request in `APPROVED_FOR_VACANCY` may be used. Publication then checks both the link and the funding behind it.
