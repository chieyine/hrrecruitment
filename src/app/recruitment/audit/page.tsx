import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { EmptyState } from '@/components/ui/PageElements'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDateTime } from '@/lib/utils'
import { hasPermission } from '@/lib/rbac'

const PAGE_SIZE = 50
const SECRET_KEY = /(password|secret|token|credential|recovery|mfa|hash|private.?key|security.?answer)/i

function readable(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase())
}

function validDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function boundedValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[additional detail omitted]'
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => boundedValue(item, depth + 1))
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 60)
        .map(([key, item]) => [key, SECRET_KEY.test(key) ? '[redacted]' : boundedValue(item, depth + 1)])
    )
  if (typeof value === 'string' && value.length > 2_000) return `${value.slice(0, 2_000)}…`
  return value
}

function auditJson(value?: string | null) {
  if (!value) return null
  try {
    return JSON.stringify(boundedValue(JSON.parse(value)), null, 2)
  } catch {
    return value.length > 2_000 ? `${value.slice(0, 2_000)}…` : value
  }
}

type SearchValues = {
  resourceId?: string
  resourceType?: string
  action?: string
  actor?: string
  from?: string
  to?: string
  page?: string
}

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login?returnTo=/recruitment/audit')
  if (user.roles.includes('SYSTEM_ADMIN')) redirect('/admin/governance')
  if (!(await hasPermission(user.userId, 'audit.read'))) redirect('/recruitment/dashboard')

  const query = await searchParams
  const resourceId = query.resourceId?.trim().slice(0, 200) || ''
  const resourceType = query.resourceType?.trim().slice(0, 100) || ''
  const action = query.action?.trim().slice(0, 100) || ''
  const actor = query.actor?.trim().slice(0, 200) || ''
  const from = validDate(query.from)
  const to = validDate(query.to)
  if (to) to.setUTCHours(23, 59, 59, 999)
  const page = Math.max(1, Math.min(10_000, Number.parseInt(query.page || '1', 10) || 1))

  const where = {
    ...(resourceId ? { resourceId } : {}),
    ...(resourceType ? { resourceType: { contains: resourceType, mode: 'insensitive' as const } } : {}),
    ...(action ? { action: { contains: action, mode: 'insensitive' as const } } : {}),
    ...(actor ? { actor: { email: { contains: actor, mode: 'insensitive' as const } } } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  }

  const total = await prisma.auditLog.count({ where })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const logs = await prisma.auditLog.findMany({
    where,
    take: PAGE_SIZE,
    skip: (currentPage - 1) * PAGE_SIZE,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      action: true,
      resourceType: true,
      resourceId: true,
      reason: true,
      previousValueJson: true,
      newValueJson: true,
      createdAt: true,
      actor: { select: { email: true } },
    },
  })
  const hasFilters = Boolean(resourceId || resourceType || action || actor || query.from || query.to)
  const pageHref = (target: number) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (key !== 'page' && value) params.set(key, value)
    }
    params.set('page', String(target))
    return `/recruitment/audit?${params.toString()}`
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8 sm:py-10">
        <div className="page-shell space-y-6">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Recruitment
          </Link>

          <header className="border-b border-stone-300 pb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Audit log</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Find who changed a recruitment record, when it changed and the reason that was recorded.
            </p>
          </header>

          <form className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium text-stone-800">
                Record ID
                <input name="resourceId" defaultValue={resourceId} className="field-control mt-2 font-mono" />
              </label>
              <label className="text-sm font-medium text-stone-800">
                Record type
                <input
                  name="resourceType"
                  defaultValue={resourceType}
                  placeholder="Application, offer, vacancy…"
                  className="field-control mt-2"
                />
              </label>
              <label className="text-sm font-medium text-stone-800">
                Action
                <input
                  name="action"
                  defaultValue={action}
                  placeholder="Stage changed…"
                  className="field-control mt-2"
                />
              </label>
              <label className="text-sm font-medium text-stone-800">
                Actor email
                <input name="actor" type="search" defaultValue={actor} className="field-control mt-2" />
              </label>
              <label className="text-sm font-medium text-stone-800">
                From
                <input name="from" type="date" defaultValue={query.from || ''} className="field-control mt-2" />
              </label>
              <label className="text-sm font-medium text-stone-800">
                To
                <input name="to" type="date" defaultValue={query.to || ''} className="field-control mt-2" />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="btn-primary">
                <Search className="h-4 w-4" />
                Search
              </button>
              {hasFilters && (
                <Link href="/recruitment/audit" className="btn-secondary">
                  Clear filters
                </Link>
              )}
            </div>
          </form>

          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-950">
                  {hasFilters ? 'Matching entries' : 'Recent entries'}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {total} {total === 1 ? 'entry' : 'entries'}
                  {total > PAGE_SIZE ? ` · page ${currentPage} of ${totalPages}` : ''}
                </p>
              </div>
            </div>

            {logs.length === 0 ? (
              <EmptyState
                title="No matching entries"
                description="Try a different record, actor, action or date range."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date and time</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Record</th>
                      <th>Reason and change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const before = auditJson(log.previousValueJson)
                      const after = auditJson(log.newValueJson)
                      return (
                        <tr key={log.id}>
                          <td className="whitespace-nowrap text-stone-600">{formatDateTime(log.createdAt)}</td>
                          <td className="font-medium text-stone-900">{log.actor?.email || 'System process'}</td>
                          <td>
                            <span className="status-chip bg-brand-50 text-brand-800">{readable(log.action)}</span>
                          </td>
                          <td>
                            <span className="block font-medium text-stone-900">{readable(log.resourceType)}</span>
                            <span className="font-mono text-xs text-stone-500">{log.resourceId}</span>
                          </td>
                          <td className="min-w-72 max-w-xl">
                            <p className="text-sm text-stone-700">{log.reason || '—'}</p>
                            {(before || after) && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs font-semibold text-brand-800">
                                  View recorded change
                                </summary>
                                <div className="mt-2 grid gap-2">
                                  {before && (
                                    <div>
                                      <p className="text-xs font-medium text-stone-500">Before</p>
                                      <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-stone-950 p-3 text-xs text-stone-100">
                                        {before}
                                      </pre>
                                    </div>
                                  )}
                                  {after && (
                                    <div>
                                      <p className="text-xs font-medium text-stone-500">After</p>
                                      <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-stone-950 p-3 text-xs text-stone-100">
                                        {after}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <nav
                className="flex items-center justify-between border-t border-stone-200 px-5 py-4"
                aria-label="Audit log pages"
              >
                {currentPage > 1 ? (
                  <Link href={pageHref(currentPage - 1)} className="btn-secondary">
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-sm text-stone-600">
                  Page {currentPage} of {totalPages}
                </span>
                {currentPage < totalPages ? (
                  <Link href={pageHref(currentPage + 1)} className="btn-secondary">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
