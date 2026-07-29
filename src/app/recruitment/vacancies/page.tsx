import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BriefcaseBusiness, Plus, Search } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDate, getStatusBadgeClass } from '@/lib/utils'
import { hasPermission } from '@/lib/rbac'
import { hasStaffRole } from '@/lib/roles'

const vacancyStatuses = [
  'DRAFT',
  'PENDING_APPROVAL',
  'SCHEDULED',
  'OPEN',
  'PAUSED',
  'CLOSED',
  'CANCELLED',
  'COMPLETED',
  'ARCHIVED',
]

export default async function RecruitmentVacanciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const query = await searchParams
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')

  const [readAll, readAssigned, canCreate] = await Promise.all([
    hasPermission(user.userId, 'vacancy.read.all'),
    hasPermission(user.userId, 'vacancy.read.assigned'),
    hasPermission(user.userId, 'vacancy.create.all'),
  ])
  if (!readAll && !readAssigned) redirect('/recruitment/dashboard')

  const scopeWhere = readAll ? {} : { ownerUserId: user.userId }
  const search = (query.q || '').trim().slice(0, 100)
  const status = vacancyStatuses.includes(query.status || '') ? query.status : ''
  const filteredWhere = {
    AND: [
      scopeWhere,
      ...(status ? [{ status }] : []),
      ...(search
        ? [
            {
              OR: [
                { title: { contains: search, mode: 'insensitive' as const } },
                { referenceNumber: { contains: search, mode: 'insensitive' as const } },
                { department: { name: { contains: search, mode: 'insensitive' as const } } },
              ],
            },
          ]
        : []),
    ],
  }
  const [vacancies, groupedStatuses, applicants] = await Promise.all([
    prisma.vacancy.findMany({
      where: filteredWhere,
      include: {
        department: true,
        dutyStation: true,
        _count: { select: { applications: { where: { internalStatus: { not: 'DRAFT' } } } } },
      },
      orderBy: [{ status: 'asc' }, { closingAt: 'asc' }],
      take: 500,
    }),
    prisma.vacancy.groupBy({ by: ['status'], where: scopeWhere, _count: true }),
    prisma.application.count({
      where: { internalStatus: { not: 'DRAFT' }, vacancy: scopeWhere },
    }),
  ])
  const statusCounts = Object.fromEntries(groupedStatuses.map((item) => [item.status, item._count]))
  const open = statusCounts.OPEN || 0
  const draft = statusCounts.DRAFT || 0

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell space-y-7">
          <PageIntro
            eyebrow="Recruitment"
            title="Vacancies"
            description="Create and track roles from draft through closing."
            actions={
              canCreate ? (
                <Link href="/recruitment/vacancies/new" className="btn-primary">
                  <Plus className="h-4 w-4" />
                  Create vacancy
                </Link>
              ) : undefined
            }
          />

          <form method="get" className="section-panel grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
            <label className="field-label">
              Find a vacancy
              <input
                name="q"
                defaultValue={search}
                placeholder="Title, reference or department"
                className="field-control"
              />
            </label>
            <label className="field-label">
              Status
              <select name="status" defaultValue={status} className="field-control">
                <option value="">All statuses</option>
                {vacancyStatuses.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll('_', ' ').toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn-secondary">
              <Search className="h-4 w-4" /> Apply
            </button>
          </form>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Open', open, 'Accepting applications'],
              ['Draft', draft, 'Still being prepared'],
              ['Applications', applicants, 'Across every vacancy'],
            ].map(([label, value, detail]) => (
              <div key={String(label)} className="metric-card">
                <p className="text-[10px] font-bold uppercase tracking-[.11em] text-stone-500">{label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-.04em] text-navy-900">{value}</p>
                <p className="mt-1 text-xs text-stone-500">{detail}</p>
              </div>
            ))}
          </div>

          <section className="section-panel">
            <div className="section-heading">
              <div>
                <h2 className="text-lg font-semibold text-navy-900">Vacancy register</h2>
                <p className="mt-1 text-sm text-stone-600">
                  {vacancies.length} matching record{vacancies.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {vacancies.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={BriefcaseBusiness}
                  title="No vacancies in your workspace"
                  description={
                    canCreate
                      ? 'Create the first vacancy when the hiring request is ready.'
                      : 'Vacancies assigned to you will appear here.'
                  }
                  action={canCreate ? { href: '/recruitment/vacancies/new', label: 'Create vacancy' } : undefined}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[880px]">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Role</th>
                      <th>Team and location</th>
                      <th>Applications</th>
                      <th>Status</th>
                      <th>Closing date</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vacancies.map((vacancy) => (
                      <tr key={vacancy.id}>
                        <td>
                          <Link
                            href={`/recruitment/vacancies/${vacancy.id}`}
                            className="font-mono text-xs font-bold text-brand-800 hover:underline"
                          >
                            {vacancy.referenceNumber}
                          </Link>
                        </td>
                        <td>
                          <Link
                            href={`/recruitment/vacancies/${vacancy.id}`}
                            className="font-semibold text-navy-900 hover:text-brand-800"
                          >
                            {vacancy.title}
                          </Link>
                        </td>
                        <td>
                          <span className="font-medium text-stone-700">{vacancy.department.name}</span>
                          <span className="mt-1 block text-xs text-stone-500">{vacancy.dutyStation.name}</span>
                        </td>
                        <td>
                          <Link
                            href={`/recruitment/vacancies/${vacancy.id}/applications`}
                            className="font-bold text-navy-900 hover:text-brand-800"
                          >
                            {vacancy._count.applications}
                          </Link>
                        </td>
                        <td>
                          <span className={`status-chip ${getStatusBadgeClass(vacancy.status)}`}>
                            {vacancy.status.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">{formatDate(vacancy.closingAt)}</td>
                        <td className="text-right">
                          <Link
                            href={`/recruitment/vacancies/${vacancy.id}`}
                            className="text-xs font-bold text-brand-800 hover:underline"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
