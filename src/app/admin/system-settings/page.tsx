import { redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Clock3, Database, HardDrive, Mail, ShieldCheck, Workflow } from 'lucide-react'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

type Readiness = 'READY' | 'DEVELOPMENT' | 'MISSING' | 'OPTIONAL'

function readiness(value: boolean, development = false, optional = false): Readiness {
  return value ? (development ? 'DEVELOPMENT' : 'READY') : optional ? 'OPTIONAL' : 'MISSING'
}

const statusCopy: Record<Readiness, { label: string; classes: string }> = {
  READY: { label: 'Configured', classes: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  DEVELOPMENT: { label: 'Development setup', classes: 'border-amber-200 bg-amber-50 text-amber-800' },
  MISSING: { label: 'Needs configuration', classes: 'border-rose-200 bg-rose-50 text-rose-800' },
  OPTIONAL: { label: 'Not enabled', classes: 'border-stone-200 bg-stone-50 text-stone-600' },
}

export default async function AdminSystemSettingsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('SYSTEM_ADMIN')) redirect('/recruitment/dashboard')

  const databaseUrl = process.env.DATABASE_URL || ''
  const virusDriver = process.env.VIRUS_SCAN_DRIVER || ''
  const checks = [
    {
      icon: Database,
      name: 'Production database',
      description: 'PostgreSQL runtime and migration connections',
      status: readiness(/^postgres(?:ql)?:/.test(databaseUrl), databaseUrl.startsWith('file:')),
      required: true,
    },
    {
      icon: HardDrive,
      name: 'Private file storage',
      description: 'S3-compatible bucket for candidate documents',
      status: readiness(
        process.env.STORAGE_DRIVER === 's3' && Boolean(process.env.S3_BUCKET && process.env.S3_REGION),
        process.env.STORAGE_DRIVER !== 's3'
      ),
      required: true,
    },
    {
      icon: ShieldCheck,
      name: 'Malware scanning',
      description: 'ClamAV scanning before a file is released',
      status: readiness(virusDriver === 'clamav' && Boolean(process.env.CLAMAV_HOST), virusDriver === 'development'),
      required: true,
    },
    {
      icon: Mail,
      name: 'Email delivery',
      description: 'Authenticated SMTP transport and sender address',
      status: readiness(Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM)),
      required: true,
    },
    {
      icon: ShieldCheck,
      name: 'Encryption and signing',
      description: 'Separate keys for sessions, stored files and queued messages',
      status: readiness(
        Boolean(
          (process.env.SESSION_SECRET || process.env.JWT_SECRET) &&
            process.env.STORAGE_ENCRYPTION_KEY &&
            process.env.OUTBOX_ENCRYPTION_KEY
        ),
        process.env.NODE_ENV !== 'production'
      ),
      required: true,
    },
    {
      icon: ShieldCheck,
      name: 'Staff single sign-on',
      description: 'OpenID Connect issuer, client and callback',
      status: readiness(
        Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET),
        false,
        true
      ),
      required: false,
    },
    {
      icon: Workflow,
      name: 'Scheduled worker',
      description: 'Protected scheduler for reminders, expiry and reports',
      status: readiness(Boolean(process.env.CRON_SECRET)),
      required: true,
    },
  ]
  const [outboxGroups, lastJob, recentFailures, retentionSettings] = await Promise.all([
    prisma.outboxMessage.groupBy({ by: ['status'], _count: true }),
    prisma.jobRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    prisma.outboxMessage.findMany({
      where: { status: { in: ['FAILED', 'DEAD_LETTER'] } },
      select: {
        id: true,
        channel: true,
        subject: true,
        status: true,
        attempts: true,
        lastError: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'RETENTION_UNSUBMITTED_DRAFT_DAYS',
            'RETENTION_NOTIFICATION_DAYS',
            'RETENTION_EXPIRED_REFERENCE_DAYS',
            'RETENTION_DELIVERED_OUTBOX_DAYS',
          ],
        },
      },
      orderBy: { key: 'asc' },
    }),
  ])
  const outbox = Object.fromEntries(outboxGroups.map((group) => [group.status, group._count]))
  const requiredChecks = checks.filter((check) => check.required)
  const readyCount = requiredChecks.filter((check) => check.status === 'READY').length
  const retentionByKey = new Map(retentionSettings.map((setting) => [setting.key, setting]))
  const retentionRows = [
    {
      key: 'RETENTION_UNSUBMITTED_DRAFT_DAYS',
      name: 'Unsubmitted applications',
      description: 'Abandoned application drafts',
      fallback: 90,
    },
    {
      key: 'RETENTION_NOTIFICATION_DAYS',
      name: 'Read notifications',
      description: 'Notifications a user has already read',
      fallback: 90,
    },
    {
      key: 'RETENTION_EXPIRED_REFERENCE_DAYS',
      name: 'Expired reference links',
      description: 'Expired referee request tokens',
      fallback: 365,
    },
    {
      key: 'RETENTION_DELIVERED_OUTBOX_DAYS',
      name: 'Delivered messages',
      description: 'Successfully delivered outbox records',
      fallback: 30,
    },
  ]

  return (
    <div className="space-y-8">
      <header className="page-intro">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Service administration</p>
        <h1 className="page-title mt-2">System readiness</h1>
        <p className="page-summary">
          A safe summary of the services this deployment depends on. Secret values are never displayed.
        </p>
      </header>

      <section aria-labelledby="readiness-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 id="readiness-heading" className="section-heading">
              Deployment checks
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              {readyCount} of {requiredChecks.length} required production services configured
            </p>
          </div>
          <span
            className={`status-chip ${readyCount === requiredChecks.length ? statusCopy.READY.classes : statusCopy.MISSING.classes}`}
          >
            {readyCount === requiredChecks.length ? 'Production configuration complete' : 'Not ready for production data'}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {checks.map((check) => {
            const copy = statusCopy[check.status]
            return (
              <article key={check.name} className="section-panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <check.icon className="h-5 w-5 text-stone-500" />
                  <span className={`status-chip ${copy.classes}`}>{copy.label}</span>
                </div>
                <h3 className="mt-4 text-sm font-bold text-stone-900">{check.name}</h3>
                <p className="mt-1 text-xs leading-5 text-stone-500">{check.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="delivery-heading" className="section-panel p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-stone-200 pb-4 sm:flex-row sm:items-end">
          <div>
            <h2 id="delivery-heading" className="section-heading">
              Message delivery
            </h2>
            <p className="mt-1 text-sm text-stone-600">Current queue health for email and webhook messages.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="status-chip border-stone-200 bg-stone-50 text-stone-700">
              {outbox.PENDING || 0} pending
            </span>
            <span className="status-chip border-emerald-200 bg-emerald-50 text-emerald-800">
              {outbox.DELIVERED || 0} delivered
            </span>
            <span className="status-chip border-rose-200 bg-rose-50 text-rose-800">
              {(outbox.FAILED || 0) + (outbox.DEAD_LETTER || 0)} need attention
            </span>
          </div>
        </div>
        {recentFailures.length === 0 ? (
          <div className="flex items-center gap-3 py-6 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5" /> No failed messages need attention.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[680px]">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Last update</th>
                </tr>
              </thead>
              <tbody>
                {recentFailures.map((message) => (
                  <tr key={message.id}>
                    <td>{message.channel}</td>
                    <td>
                      <span className="font-semibold text-stone-900">{message.subject || 'Untitled message'}</span>
                      {message.lastError && (
                        <span className="mt-1 block max-w-md text-xs text-rose-700">{message.lastError}</span>
                      )}
                    </td>
                    <td>
                      <span className="status-chip border-rose-200 bg-rose-50 text-rose-800">{message.status}</span>
                    </td>
                    <td>{message.attempts}</td>
                    <td>{formatDate(message.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section-panel flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          {lastJob?.status === 'COMPLETED' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
          ) : lastJob ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
          ) : (
            <Clock3 className="mt-0.5 h-5 w-5 text-stone-500" />
          )}
          <div>
            <h2 className="text-sm font-bold text-stone-900">Scheduled processing</h2>
            <p className="mt-1 text-xs text-stone-600">
              {lastJob
                ? `${lastJob.jobName} last ran ${formatDate(lastJob.startedAt)} with status ${lastJob.status.toLowerCase()}.`
                : 'No scheduled job run has been recorded in this environment.'}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="retention-heading" className="overflow-hidden section-panel">
        <div className="border-b border-stone-200 px-5 py-5 sm:px-6">
          <h2 id="retention-heading" className="section-heading">
            Short-lived records
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Current deletion intervals used by the scheduled retention job. Active legal holds always take priority.
          </p>
        </div>
        <div className="divide-y divide-stone-200">
          {retentionRows.map((row) => {
            const setting = retentionByKey.get(row.key)
            const configured = Number(setting?.valueJson)
            const days = Number.isFinite(configured) && configured > 0 ? configured : row.fallback
            return (
              <div key={row.key} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_8rem] sm:px-6">
                <div>
                  <h3 className="text-sm font-semibold text-navy-950">{row.name}</h3>
                  <p className="mt-1 text-xs text-stone-500">{row.description}</p>
                </div>
                <p className="text-sm font-semibold text-navy-950 sm:text-right">
                  {days} days
                  <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-stone-500">
                    {setting ? 'Policy setting' : 'Product default'}
                  </span>
                </p>
              </div>
            )
          })}
        </div>
        <p className="border-t border-stone-200 bg-stone-50 px-5 py-3 text-xs leading-5 text-stone-500 sm:px-6">
          Retention periods implement an approved information-governance policy. They are not edited as arbitrary
          system keys.
        </p>
      </section>
    </div>
  )
}
