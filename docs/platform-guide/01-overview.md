# 1. What this platform is

The FRAD Recruitment Platform manages one NGO's hiring from the moment a department realises it needs someone, to the moment the successful candidate is handed over to the organisation's existing ERP as a member of staff. It does nothing after that point.

That boundary is deliberate and it is enforced in the code, not just described in policy. The platform holds no payroll, no leave, no attendance, no performance records, no staff self-service. Once a person is transferred, their recruitment file becomes read-only and every subsequent employment matter belongs to the ERP.

## The problem it solves

Recruitment in an NGO fails in predictable ways. A vacancy is advertised before anyone confirmed the money exists. Eligibility is judged inconsistently because three different officers read three hundred CVs on three different days. A criterion quietly changes halfway through. Nobody can reconstruct, a year later, why one candidate progressed and another did not.

The platform addresses each of those directly:

- **Nothing is advertised until it is funded.** A vacancy cannot be published without an approved staffing request and a Budget Holder's confirmation behind it.
- **Basic eligibility is decided by rule, not by reading.** Approved rules run automatically against every application, and reviewers only see the ones the rules could not settle.
- **The bar cannot move silently.** Longlisting rules lock at publication; changing one afterwards is an approvable proposal with a before-and-after record and, once applications exist, a fairness review.
- **Every decision has a signatory.** Approvals that confer authority are signed, and the signature is taken over a hash of exactly what was approved — so a later edit is detectable.

## The shape of the process

```
Hiring department raises a staffing request
        v
Budget Holder confirms funding, budget line and ceiling
        v
HR prepares the vacancy and its longlisting rules
        v
HR Manager approves; publication locks the rules
        v
Applicants apply through the careers portal
        v
Rules run automatically; applicants are grouped
        v
HR works only the exception queue
        v
HR Manager confirms the longlist  (signed)
        v
Reviewers shortlist competitively against a weighted matrix
        v
Assessments and panel interviews; scores locked on submission
        v
Scores consolidated; preferred and reserve recommended
        v
References and due-diligence checks completed
        v
Budget Holder re-confirms if the offer exceeds the ceiling
        v
HR Manager approves the offer  (signed)
        v
Candidate accepts  (signed)
        v
Pre-employment requirements completed and cleared
        v
HR Manager approves ERP transfer  (signed)
        v
Handover pack issued; recruitment file closed and archived
```

^ Figure 1. The end-to-end flow. Every arrow is a state transition the platform will refuse to make out of order.

## Design principles

These are the commitments the rest of this document elaborates on.

| Principle | How it shows up in the platform |
| --- | --- |
| Built for one organisation | No multi-tenancy, no cross-organisation sharing; configuration is organisational, not per-client |
| Ends at ERP transfer | No staff-management modules; the record goes read-only after handover |
| HR Manager owns the process | Configuration, approvals and exceptions sit with HR, not with a technical administrator |
| Budget Holders own the money | Finance receives information but is never the business approver for recruitment funding |
| Longlisting is automatic and transparent | Rules are vacancy-specific, versioned, locked at publication, and every outcome names the rule that decided it |
| Humans handle exceptions and competition | Reviewers spend their time on unclear cases and on shortlisting, not on mechanical filtering |
| Everything important is traceable | A hash-chained audit log, entity versioning, and signatures over approved content |
| Nobody approves their own work | Separation of duties is enforced at every approval point |
| Applicant data is protected | Role-based access, restricted findings, retention rules, and anonymised early review |

## How to read this guide

Chapters 2 and 3 describe who uses the platform and what each of them may do. Chapters 4 to 12 walk the recruitment process in order, one stage per chapter. Chapters 10, 11, 13 and 14 cover the cross-cutting machinery: controls, data security, integrations, reporting and operations. Chapter 15 is a component index — every screen, endpoint and module, listed.

If you are implementing or administering the platform, read chapters 2, 3, 11 and 14 first. If you are an auditor, chapters 3, 10, 11 and 13 carry most of what you need.
