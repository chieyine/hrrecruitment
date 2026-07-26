# FRAD production runbook

## Release gate

Do not load real candidate data until all items in `RELEASE_ACCEPTANCE.md` are
signed off. Production uses PostgreSQL, private object storage, ClamAV, SMTP,
HTTPS and an OpenID Connect identity provider for staff. SQLite and the local
log mailer are development facilities only.

## Deploy

1. Copy `.env.production.example` to the secret manager and replace every
   placeholder. Do not store the completed file in source control.
2. Build with `docker compose -f docker-compose.production.yml build`.
3. Take and verify a database backup before upgrading an existing environment.
4. Start with `docker compose -f docker-compose.production.yml up -d`.
   The application entrypoint applies checked-in PostgreSQL migrations before
   starting Next.js using the mandatory, separate `DATABASE_MIGRATION_URL`.
   A failed migration prevents the application from starting.
5. On a new database only, run the one-time administrator bootstrap using
   `BOOTSTRAP_ADMIN_EMAIL`, a secret-manager supplied
   `BOOTSTRAP_ADMIN_PASSWORD`, and `npm run db:bootstrap-admin`. The command
   refuses to run when a global system administrator already exists. Clear the
   password immediately.
6. Check `/api/health` and, from an authorized monitoring system, supply
   `x-health-secret` for dependency detail.
7. Run the release smoke tests: public vacancy list, staff SSO, candidate login,
   draft application, private upload/download, notification delivery and a
   read-only report.

Never run the SQLite migration set against PostgreSQL. The generated production
schema and migrations live under `prisma/postgresql` and are validated in CI.

## Upgrade preflight

Migration `0002_operating_system` adds uniqueness constraints that convert
workflow assumptions into database invariants. Before deploying it to an
existing database, run these read-only checks with the migration role. Every
query must return zero rows; investigate and merge duplicates through an
approved, audited data-correction procedure rather than deleting blindly.

```sql
SELECT "applicationId", "scorecardTemplateId", "reviewerUserId", COUNT(*)
FROM "CandidateScorecard"
GROUP BY 1,2,3 HAVING COUNT(*) > 1;

SELECT "candidateScorecardId", "criterionId", COUNT(*)
FROM "CandidateCriterionScore"
GROUP BY 1,2 HAVING COUNT(*) > 1;

SELECT "applicationId", "assessmentId", COUNT(*)
FROM "CandidateAssessment"
GROUP BY 1,2 HAVING COUNT(*) > 1;

SELECT "interviewId", "userId", COUNT(*)
FROM "InterviewPanelMember"
GROUP BY 1,2 HAVING COUNT(*) > 1;

SELECT "panelMemberId", "interviewQuestionId", COUNT(*)
FROM "InterviewScore"
GROUP BY 1,2 HAVING COUNT(*) > 1;

SELECT "candidatePreboardingId", "formTemplateId", COUNT(*)
FROM "CandidatePreboardingForm"
GROUP BY 1,2 HAVING COUNT(*) > 1;

SELECT "candidatePreboardingId", "documentRequirementId", COUNT(*)
FROM "CandidateRequiredDocument"
GROUP BY 1,2 HAVING COUNT(*) > 1;

SELECT "candidatePreboardingId", "courseId", COUNT(*)
FROM "CandidateCourse"
GROUP BY 1,2 HAVING COUNT(*) > 1;

SELECT "candidatePreboardingId", "checkType", COUNT(*)
FROM "ReadinessCheck"
GROUP BY 1,2 HAVING COUNT(*) > 1;

SELECT "erpPersonnelNumber", COUNT(*)
FROM "ERPTransferRecord"
GROUP BY 1 HAVING COUNT(*) > 1;
```

Use separate PostgreSQL principals:

- The deployment principal owns the schema and can apply checked-in migrations.
- The runtime principal can read/write application tables and sequences but
  cannot create, alter, or drop schema objects.
- Backup and monitoring principals receive only the permissions their tools
  require.

Never expose the deployment principal through the running web application.
The application listener is bound to host loopback. The TLS ingress must
overwrite the header named by `TRUSTED_CLIENT_IP_HEADER`; never accept that
header directly from an internet client.

## Scheduled work and alerting

The production Compose scheduler calls `POST /api/cron/process-schedules` with
`x-cron-secret` every minute. For another deployment platform, configure an
equivalent scheduler at least every five minutes. Alert when the endpoint fails,
a `JobRun` fails or is absent for 15
minutes, an outbox message reaches `DEAD_LETTER`, an `OperationalEvent` is
critical, database/storage health fails, or certificate/disk capacity is near
its limit. The Operations and Governance pages provide the application view.

## Backup and restore

Run `scripts/backup-postgres.sh /secure/backup/location` at least daily and copy
encrypted backups to a separate account/region. Retain backups according to the
approved data-retention schedule. Quarterly, restore the newest backup into an
isolated non-production database using:

```bash
CONFIRM_FRAD_RESTORE=yes scripts/restore-postgres.sh /secure/path/backup.dump
```

Record the restore duration, checksum result and application smoke-test result.
The restore command verifies the selected archive checksum and uses
`--single-transaction --exit-on-error`. It still replaces the target database;
verify `DATABASE_URL` twice.

## Incident response

1. Contain: disable affected credentials, block exposed routes or isolate the
   service without deleting evidence.
2. Preserve: place legal holds on affected records, capture audit-chain status,
   logs, job runs and infrastructure events.
3. Assess: determine affected people, data classes, time window and attack path.
4. Notify FRAD privacy/security leadership and follow the applicable legal and
   contractual notification deadlines.
5. Recover from a known-good image and backup, rotate affected secrets, verify
   audit integrity and perform the release smoke tests.
6. Record corrective actions without adding sensitive incident material to
   ordinary application logs.

## Secret and key rotation

Rotate SMTP, OIDC, database, S3 and monitoring credentials through the secret
manager. Rotating `JWT_SECRET` invalidates verification/reset tokens; rotating
`SESSION_SECRET` invalidates sessions and signed download URLs. Rotating
`STORAGE_ENCRYPTION_KEY` requires a controlled decrypt/re-encrypt migration of
stored objects—never replace it in place while old objects remain.

## Rollback

Prefer a forward fix after a database migration. If application rollback is
necessary, stop traffic, confirm the older image understands the current schema,
and restore only when the migration is known to be backward-incompatible. Never
edit the migration history of an environment that has already applied it.
