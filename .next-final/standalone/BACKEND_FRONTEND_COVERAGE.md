# Backend-to-frontend coverage

Every user-operable API route must have a mounted page or component. The
lightweight coverage check is:

```bash
npm run audit:frontend-coverage
```

It fails when a new operational route has no frontend reference. CI runs the
same check.

The only approved screenless routes are:

- `/api/health` — deployment health/readiness probe.
- `/api/cron/process-schedules` — authenticated scheduler and operations
  trigger.

`/api/public/vacancies/[reference]` is represented by the server-rendered
`/careers/[reference]` page. The referee reminder route is called through the
reference action component’s variable action path; both are declared explicitly
in the check so this deliberate indirection remains reviewable.

Candidate imports, WhatsApp delivery, multilingual pages, advanced question
banks, remote proctoring, and AI-generated summaries are intentionally outside
this platform’s scope. A hidden API is not an acceptable substitute for any of
these excluded features.
