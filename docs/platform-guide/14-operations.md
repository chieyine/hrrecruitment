# 14. Configuration, integrations and operations

## 14.1 No-code configuration

The HR Manager configures routine settings without software development:

Recruitment stages; vacancy approval routes; candidate statuses; longlisting rule templates; shortlisting templates; interview scorecards; assessment templates; offer approval routes; communication templates; recruitment timelines; mandatory documents; ERP transfer requirements.

Reference data — departments, projects, duty stations, vacancy categories, contract types, document types — is administered through dedicated screens.

Configuration changes that affect governance route through a change-request workflow: proposed, reviewed, approved and released, with the proposal and the decision both recorded. Technical configuration affecting security, infrastructure or integrations remains with the technical administrator.

## 14.2 Integrations

| Integration | Status |
| --- | --- |
| Microsoft Outlook and Teams | OAuth with PKCE; calendar events, free/busy, Teams meeting links |
| Google Calendar and Meet | OAuth with PKCE; calendar events, free/busy, Meet links |
| Zoom | OAuth with PKCE; meeting creation with waiting room enabled |
| SMTP | Transactional email through the outbox |
| S3-compatible storage | Encrypted object storage for all uploads |
| ClamAV | Virus scanning on upload |
| OIDC | Optional single sign-on |
| ERP | Manual by design — a generated PDF handover pack, not an API |

Calendar providers self-report as unavailable until credentials are configured. Required environment variables:

```
APP_BASE_URL=
MICROSOFT_CLIENT_ID=      MICROSOFT_CLIENT_SECRET=
GOOGLE_CLIENT_ID=         GOOGLE_CLIENT_SECRET=
ZOOM_CLIENT_ID=           ZOOM_CLIENT_SECRET=
STORAGE_ENCRYPTION_KEY=
INTERNAL_EMAIL_DOMAINS=fradfoundation.org
```

Redirect URI per provider:
`{APP_BASE_URL}/api/integrations/calendar/callback/{microsoft|google|zoom}`

## 14.3 Scheduled work

A scheduler drives recurring jobs: vacancy opening and closing, offer expiry, assessment expiry, interview reminders, reference reminders, scheduled report delivery, outbox retries, retention runs, escalations for overdue work items, and daily notification digests.

Each run is recorded with its outcome. Long-running jobs take a lease so two workers cannot process the same batch, and a failed run raises an operational event.

## 14.4 Technology

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16, React 18, TypeScript |
| Database | PostgreSQL via Prisma |
| Styling | Tailwind CSS |
| Authentication | JWT sessions with jose, bcrypt hashing, TOTP MFA |
| Storage | S3-compatible |
| Email | Nodemailer over SMTP |
| Testing | Vitest for units, Playwright for end-to-end |

## 14.5 Deployment

```
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

The demo seed is disabled when `NODE_ENV=production`; production uses a controlled bootstrap that creates a single administrator with an explicitly supplied password.

Deployment tasks that sit outside the application: provisioning PostgreSQL, configuring SMTP and verifying sender reputation, registering the SSO provider, configuring object storage and virus scanning, arranging worker execution and monitoring, backups, accessibility testing with assistive-technology users, load testing, security and privacy approvals, and disaster-recovery exercises.

## 14.6 Quality gates

| Gate | Command |
| --- | --- |
| Type checking | `npx tsc --noEmit` |
| Linting | `npm run lint` |
| Unit tests | `npm test` |
| Integration tests | `npm run test:integration` |
| End-to-end tests | `npm run test:e2e` |
| Schema integrity | `npm run check:schema` |
| Backend-to-frontend coverage | `npm run audit:frontend-coverage` |
| Production build | `npm run build` |

`check:schema` runs two static analysers written for this codebase. The first verifies that every Prisma relation is declared on both sides and that no relation points at a model that does not exist. The second parses every `select` and `include` in the application and confirms each field actually exists on the model being queried. Both run without a database or a generated client, which makes them usable in environments where the Prisma engine cannot be downloaded — and both have caught real defects that type checking alone would have missed until runtime.
