# 9. Offers, preboarding and ERP handover

## 9.1 Offers

An offer records the position, duty station, contract type and duration, proposed grade and step, salary amount with currency and period or a consultancy fee, budget line, funding source and end date, donor restriction, start and end dates, probation, reporting line, conditions, and the acceptance deadline.

HR prepares it. The **Budget Holder** confirms the financial envelope. The **HR Manager** approves within delegated authority. Where the proposed amount exceeds the confirmed ceiling the offer is flagged and returned to the Budget Holder for re-confirmation before HR Manager approval is possible.

Finance does not replace the Budget Holder in this workflow at any point.

Offers are versioned. A revised offer supersedes its predecessor, and both are retained.

### The candidate's side

The candidate can view and download the offer as a PDF, request clarification, propose a different start date, accept by typing their full legal name as an electronic signature, or download, sign and upload the countersigned PDF. Both acceptance paths require confirmation that the terms were read. The candidate may also decline. Unanswered offers expire at the deadline.

Acceptance captures the chosen signature method, the typed name where used, the signed file where used, the IP address and the user agent. It is a critical signature, so an acceptance that cannot be signed is not recorded at all.

## 9.2 Preboarding

Once an offer is accepted the candidate receives a preboarding package: a versioned bundle of forms, document requirements, policies, courses, tasks and meetings, materialised as a snapshot so a later change to the template does not alter what an in-flight candidate was asked to do.

| Component | What it covers |
| --- | --- |
| Forms | Dynamic forms with auto-save, submission, HR review, approval, return or waiver |
| Documents | Versioned uploads with verification, expiry and rejection reasons |
| Policies | Acknowledgement by tick, typed name, drawn signature or signed PDF |
| Courses | Versioned internal or external learning links, quizzes, attempts, reasoned resets and grading; an external provider certificate can be uploaded for HR review and completion |
| Tasks | Assigned pre-start actions with due dates |
| Meetings | Scheduled orientation with attendance confirmation |
| Information items | Reporting instructions and travel details |

Pre-employment requirements cover accepted offer, signed contract, identification, academic certificates, professional licence, references, background checks, safeguarding clearance, work permit, medical fitness where lawful and job-related, bank details, tax details, pension details, emergency contact, next of kin, code of conduct, PSEA declaration, conflict-of-interest declaration and confidentiality agreement.

Each item carries one of eight states: not requested, requested, submitted, under review, verified, rejected, waived with approval, or not applicable.

Readiness checks run against the mandatory set. A waiver requires a reason. Clearance is the gate that precedes readiness to start, and it is an HR Manager act.

## 9.3 Resumption

HR records the confirmed start date, the reporting location, and afterwards the actual outcome — resumed, did not resume, postponed or withdrawn — with the actual start date.

## 9.4 ERP handover

Transfer is **manual by design**. The platform does not write to the ERP. What it produces is a single authoritative document containing exactly the data the ERP needs, so the person keying it in has one accurate source and the recruitment file records precisely what was handed over.

### Readiness

Approval is refused until every one of these holds:

- An accepted offer exists
- Preboarding was assigned
- Pre-employment clearance was issued
- Every mandatory background check is cleared, waived or not applicable
- A confirmed start date exists

Where actual resumption has not been recorded the platform warns rather than blocks, and the pack shows the planned start date instead.

### Duplicate employee check

Before approval, the platform looks for an existing employee who may be the same person. It compares only against people who **actually hold an ERP number** — a transfer still in flight is not a duplicate, and matching against one would flag every candidate against themselves.

Identity, email address and phone number each block on their own. A shared full name is reported as context but does **not** force an override, because common surnames would otherwise produce constant false positives and the written override would become a formality people click past.

Where a blocking match is found, approval requires both an explicit acknowledgement and a written explanation.

### Approval

The HR Manager approves. The approval record, the stage change and the signature are written in one transaction — an unsigned ERP transfer approval cannot exist.

### The handover pack

A branded PDF containing:

| Section | Contents |
| --- | --- |
| Transfer authorisation | ERP number or a statement that one is to be assigned, recruitment and vacancy references, approver, approval date, generation timestamp, duplicate-check outcome |
| Personal details | Full name, preferred name, email, phones, address, nationality |
| Position and contract | Department, position, grade, step, supervisor, duty station, contract type, start and end dates, budget or project code |
| Remuneration | Salary with currency, period, budget line, funding source |
| Statutory and payroll | Bank, tax, pension, emergency contact, next of kin |
| Clearance evidence | Offer acceptance date and signature, clearance date, every check with its status and outcome |

Statutory data is drawn from the preboarding form **explicitly designated** to supply it, through a configured purpose code — never by matching a form title, because renaming a form would then silently empty the pack.

The pack distinguishes three states that would otherwise all read as blank:

- **Not collected** — no form is configured to collect this at all
- **Outstanding** — a form exists but the candidate has not submitted it
- **Error** — the stored response could not be read

These require different responses from HR, and the gaps are surfaced on the approval screen before the pack is issued rather than discovered by payroll afterwards.

Every download is audited, and the transferred dataset is snapshotted so the handover can be reconstructed later.

### Recording the transfer

Once the ERP issues a personnel number, HR records it. The field holds only a real number — it is null until then, and workflow state lives in a separate status. Recording requires prior approval and is idempotent, so a retried request cannot create a second transfer.

### After transfer

The candidate's status becomes transferred to ERP. The recruitment record becomes read-only except for authorised closure actions. All ongoing staff management happens in the ERP. The recruitment file is retained according to the retention policy.
