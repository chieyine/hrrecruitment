# 10. Controls, audit and signatures

## 10.1 The audit log

Every consequential action writes an entry recording the actor, the action, the resource, the previous and new values, a reason where one was supplied, the IP address, the user agent and the timestamp.

The log is **hash-chained**. Each entry includes the hash of the one before it, and the chain head is stored separately. Verification walks the whole chain and reports one of several specific failures rather than a generic invalid:

| Result | Meaning |
| --- | --- |
| Hash mismatch | An entry's content no longer matches its own hash — it was edited |
| Missing previous entry | An entry was deleted from the middle |
| Chain branch or missing head | More than one entry claims to be the head |
| Chain cycle | The chain loops |
| Disconnected chain | Entries exist outside the chain |
| Head pointer mismatch | The stored head does not match the computed one |

Writing is retried on contention, and a persistent failure raises a critical operational event rather than passing silently.

## 10.2 Electronic signatures

Sixteen document classes can be signed: staffing requests, vacancy approvals, conflict declarations, shortlist approvals, longlist approvals, interview scorecards, selection recommendations, reference forms, funding confirmations, offer approvals, conditional offers, final offers, candidate acceptances, pre-employment declarations, ERP transfer approvals, and recruitment closures.

Each signature records the signatory, their role, the method, how they were authenticated, the document version, a hash of exactly what was approved, the status, the IP address, the user agent and the timestamp.

### Why the hash matters

The signature is taken over a canonical hash of the approved content. Canonical means key order does not affect the result, so the same logical payload always hashes identically — but any actual change does not:

- Changing a value changes the hash
- Adding a field changes the hash
- A null and an absent field hash differently
- Array order is significant
- The number 1 and the string "1" hash differently

This is what makes a silent change *detectable* rather than merely discouraged. Re-verifying a signature against the current record answers "is what was signed still what is there?"

### Critical signatures are blocking

Thirteen of the sixteen classes are **critical** — those that confer legal, financial or safeguarding authority. For these the signature *is* the record of authority, so:

- The signature is written **inside the same database transaction** as the state change it attests
- If it cannot be written, the entire transaction rolls back
- The caller receives a specific error saying nothing was saved and the action should be retried

There is no state in which a funding confirmation, longlist confirmation, offer approval, candidate acceptance or ERP transfer approval exists without a signature behind it.

The three non-critical classes — conflict declarations, reference forms and pre-employment declarations — degrade gracefully instead, logging a high-severity operational event, because an informational acknowledgement should not take down the action it accompanies.

### Amendments

A signature is never deleted. Superseding one marks the original as amended, links it forward to its replacement, and records the reason.

## 10.3 What the platform prevents

| Prevented | Mechanism |
| --- | --- |
| Self-approval | Independent approver selection excludes the requester, and route handlers re-check |
| Silent score changes | Scores lock on submission; reopening needs a permission and a reason; versions retained |
| Silent rule changes | Publication locks rules; changes become approvable diffs with fairness review |
| Deletion of submitted applications | No deletion path exists; withdrawal and archiving are the available outcomes |
| Panel members seeing each other's scores | Enforced server-side before submission is complete |
| Technical administrators making recruitment decisions | System-admin accounts hold three technical permissions and cannot inherit others |
| Unapproved ERP transfer | Recording a personnel number requires a prior signed approval |
| Unauthorised export | Report access is permission-scoped; every export is audited |
| A vacancy advertised without funding | Publication gate |
| An offer above the approved ceiling | Flagged and returned to the Budget Holder |

## 10.4 Versioning and reconstruction

Beyond the audit log, the platform retains every vacancy version, rule version, score version, approval, override, status change, document version, communication, export and transfer attempt, plus every role and permission change.

Optimistic concurrency guards records that two people may work simultaneously: each carries a lock version, and a stale write is refused with a message telling the user to reload rather than silently overwriting a colleague's decision.

Together these make it possible to reconstruct the complete recruitment process from beginning to end.

## 10.5 Approvals and conditions

An approval carries a resource type and id, a stage, the assigned approver, the requester, the decision, a comment and a timestamp. Decisions are approve, approve with conditions, return for clarification, or reject.

Approving with conditions creates trackable condition records, each with a description, an owner, a due date, a status, and space for evidence — so a conditional approval is a commitment with follow-through rather than a note in a comment box.

## 10.6 Work items and service standards

Configurable service standards define expected timelines for staffing request review, budget confirmation, vacancy approval, advertising, longlisting, shortlisting, assessment, interview, reference checking, offer approval, pre-employment clearance, ERP transfer and closure.

From those the platform derives due dates, reminders, escalations, overdue indicators, service-standard reports and delay reasons. Work items surface on each user's queue, scoped to what they can actually action.
