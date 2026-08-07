# 13. Dashboards, reporting and communication

## 13.1 Dashboards

Each role lands on a workspace scoped to what it can actually action.

**HR and recruitment officers** see vacancies awaiting approval, open vacancies, applications received, the pipeline by stage, longlisting progress, the exception queue, shortlisting progress, upcoming assessments and interviews, pending panel scores, pending references, pending background checks, offers awaiting approval, candidates awaiting ERP transfer, overdue actions and time-to-fill.

**HR Managers** additionally see longlisting rule changes awaiting approval, longlists awaiting confirmation, recruitment exceptions, vacancies outside service timelines, final recommendations awaiting approval, ERP transfers awaiting approval, compliance gaps, vacancy ageing and recruitment performance by user.

**Budget Holders** see staffing requests awaiting funding, positions by budget line, proposed salary ceilings, offer variations awaiting approval, funding end dates approaching, and recruitment linked to their projects — and nothing about candidates.

**Hiring departments** see their submitted requests, recruitment progress, applications assigned for review, pending shortlisting, upcoming interviews, pending scorecards and final recommendations.

Queue counts are only computed for users who hold the permission to act on them, so a dashboard does not run aggregates it will then hide.

## 13.2 Reports

Thirty-five reports across five groups. Each exports as CSV, PDF or as part of a complete ZIP pack.

| Group | Reports |
| --- | --- |
| Plan and fund | Staffing requests; funding confirmations |
| Recruitment | Vacancy pipeline; candidate stage history; longlisting summary; longlisting exceptions and overrides; shortlisting scores; assessment outcomes; interview activity; candidate ranking; selection decisions; reference checks; background-check status |
| Offer and start | Offer outcomes; pre-start completion; outstanding pre-start items; course completion; readiness checks; start outcomes; ERP handovers; recruitment closure |
| Governance | Waiver audit; approval decisions; recruitment compliance; electronic signature register; system audit trail; complaint and appeal register; privacy and deletion requests; configuration change approvals |
| Operations | Time to fill; source of application and hire; work queue and service history; communication register; message delivery and failures; data-quality exceptions |

Three deserve particular attention:

**Recruitment compliance** is a control-by-control view across every vacancy: is a staffing request linked, is it approved, is funding confirmed, is the vacancy approved, are mandatory rules defined, are rules locked, is the longlist confirmed, are shortlisting criteria set, is safeguarding classified, is a recruitment contact recorded. It answers an auditor's first question in one export.

**Time to fill** measures from the staffing request, not from advertising — that is the interval the department actually experiences. It reports both.

**Longlisting exceptions and overrides** shows, for every exception, the automatic outcome, the human decision, the reason code, the justification, whether evidence was attached and whether approval was required. This is where a pattern of overrides becomes visible.

Access is permission-scoped: financial reports require funding authority, due-diligence reports require check-management authority, and restricted content is excluded from exports the requester is not entitled to.

Reports can be scheduled for recurring delivery by email, with the recurrence and every delivery recorded.

## 13.3 Communication

Templates exist for application confirmation, incomplete application, test invitation, interview invitation, interview rescheduling, document request, reference request, conditional offer, final offer, regret notification, vacancy cancellation, recruitment delay and talent-pool consent.

All communication is logged. **Bulk communication never exposes one candidate's address to another.**

Delivery uses a transactional outbox: a message is written in the same transaction as the action that triggered it, then dispatched by a worker with retries and a dead-letter queue. A failed send is visible in the delivery report rather than silently lost, and an action never half-commits because email was down.

Notifications are idempotent on a daily key, so a reminder job that runs twice does not send twice.

## 13.4 Analytics

Detailed analytics cover vacancy volume, application volume, qualified application rate, longlisting rejection reasons, shortlisting conversion, assessment and interview pass rates, offer acceptance, candidate withdrawal, recruitment duration, recruitment cost, source effectiveness, diversity at each stage where lawfully monitored, recruitment team performance, panel participation, delayed stages, failed recruitments, repeatedly difficult-to-fill roles, and ERP transfer success and failure.

Dashboards filter by date, department, project, duty station, job family, grade, contract type, HR user, budget holder and vacancy status.

## 13.5 Search

Permission-aware global search across candidates, contacts, vacancies, projects, departments, duty stations and ERP personnel numbers. Results are filtered to what the searcher may see — a search never confirms the existence of a record the user could not otherwise reach.
