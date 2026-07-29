# Security and governance operations

## Access model

- `SYSTEM_ADMIN` manages the technical platform, user access and controlled
  configuration releases. It cannot make recruitment decisions or read
  recruitment case queues merely because it is an administrator.
- `RECRUITMENT_OFFICER` runs the daily recruitment operation: vacancies,
  applications, interviews, candidate communication, routine preboarding,
  adjustment fulfilment, complaint and fraud triage, duplicate-record requests,
  resumption confirmation and ERP handover.
- `HR_MANAGER` supervises the operation and owns accountable decisions:
  vacancy approval, offer and selection approval where assigned, adjustment
  decisions, waivers, conflict exceptions, candidate-merge approval, offer or
  vacancy cancellation, and final complaint or fraud-case closure.
- `HIRING_MANAGER`, `PANEL_MEMBER` and `APPROVER` receive only the scoped records
  and actions required for their duties.
- `CANDIDATE` can access only their profile, applications and related records.
- `COURSE_ADMIN` manages course delivery; `AUDITOR` receives read-only audit and
  report access.

Run access reviews quarterly and immediately after role changes or departures.
Use the Governance page to capture the role snapshot, reviewer and decision.
Require upstream MFA in the staff OIDC provider and disable local staff password
access in the deployment identity policy once SSO acceptance testing passes.

## Retention and legal holds

The scheduled retention job removes old unsubmitted drafts, read notifications,
expired reference requests, delivered outbox records, idempotency records and
rate-limit buckets. Durations are controlled by `RETENTION_*` system settings.
Each run stores a summary and SHA-256 evidence hash.

Before deletion, check for active legal holds. Holds can target USER,
APPLICATION, REFERENCE_REQUEST or another explicit resource type/id. Candidate
account deletion is refused when the user, candidate or an application is held.
Only release a hold on written authority and preserve the release reason.

## Decision quality

Eligibility rules produce decision support, never automatic rejection. A human
must record the final eligibility decision and reason. Use the Quality page to
review panel variance, reopened scorecards, reviewer calibration and justified
ranking overrides. Assigned scorecards and preboarding items retain snapshots so
later template edits cannot rewrite historical decision evidence.

## Complaints and safeguarding

Public and signed-in users can submit a complaint, appeal, safeguarding concern,
fraud report, accommodation request or privacy concern. Safeguarding cases have
the shortest response target. Internal comments are never returned to the
reporter. Restrict case access to `complaint.manage`, avoid copying case content
into email, and escalate critical cases under FRAD safeguarding procedures.
