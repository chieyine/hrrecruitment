import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BriefcaseBusiness, Plus } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDate, getStatusBadgeClass } from '@/lib/utils'
import { hasPermission } from '@/lib/rbac'
import { hasStaffRole } from '@/lib/roles'

export default async function RecruitmentVacanciesPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')

  const [readAll, readAssigned, canCreate] = await Promise.all([
    hasPermission(user.userId, 'vacancy.read.all'),
    hasPermission(user.userId, 'vacancy.read.assigned'),
    hasPermission(user.userId, 'vacancy.create.all'),
  ])
  if (!readAll && !readAssigned) redirect('/recruitment/dashboard')

  const vacancies = await prisma.vacancy.findMany({
    where: readAll ? {} : { ownerUserId: user.userId },
    include: {
      department: true,
      dutyStation: true,
      _count: { select: { applications: true } },
    },
    orderBy: [{ status: 'asc' }, { closingAt: 'asc' }],
    take: 500,
  })

  const open = vacancies.filter((vacancy) => vacancy.status === 'OPEN').length
  const draft = vacancies.filter((vacancy) => vacancy.status === 'DRAFT').length
  const applicants = vacancies.reduce((sum, vacancy) => sum + vacancy._count.applications, 0)

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell space-y-7">
          <PageIntro
            eyebrow="Recruitment"
            title="Vacancies"
            description="Build, approve and publish roles, then follow application volumes through closing."
            actions={
              canCreate ? (
                <Link href="/recruitment/vacancies/new" className="btn-primary">
                  <Plus className="h-4 w-4" />
                  Create vacancy
                </Link>
              ) : undefined
            }
          />

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
                  {vacancies.length} record{vacancies.length === 1 ? '' : 's'} in your scope
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
