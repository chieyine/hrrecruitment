import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import LonglistingWorkspace from '@/components/recruitment/LonglistingWorkspace'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { hasStaffRole } from '@/lib/roles'
import { PageIntro } from '@/components/ui/PageElements'

/**
 * §11 Longlisting.
 *
 * One screen covers the whole of §11: define the rules, run them, read the
 * summary, and confirm the longlist. The exception queue lives on its own page
 * because it is worked by a different person, often at a different time.
 */
export default async function LonglistingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = searchParams ? await searchParams : {}
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')

  const [canManageRules, canRun, canConfirm, canOverride] = await Promise.all([
    hasPermission(user.userId, 'longlist.rule.manage'),
    hasPermission(user.userId, 'longlist.run'),
    hasPermission(user.userId, 'longlist.confirm'),
    hasPermission(user.userId, 'longlist.override'),
  ])
  if (!canManageRules && !canRun) redirect('/recruitment/dashboard')

  // Longlisting only makes sense for vacancies that exist to be assessed.
  const vacancies = await prisma.vacancy.findMany({
    where: { status: { notIn: ['CANCELLED', 'ARCHIVED'] } },
    orderBy: [{ closingAt: 'desc' }],
    take: 200,
    select: {
      id: true,
      title: true,
      referenceNumber: true,
      status: true,
      closingAt: true,
      longlistingRulesLockedAt: true,
      anonymisedReview: true,
      _count: { select: { applications: { where: { internalStatus: { not: 'DRAFT' } } } } },
    },
  })

  const initialVacancyId = typeof query.vacancy === 'string' ? query.vacancy : vacancies[0]?.id || ''

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell max-w-6xl space-y-7">
          <PageIntro
            eyebrow="Screen and shortlist"
            title="Longlisting"
            description="Rules decide basic eligibility automatically so reviewers only spend time on the applications the system could not settle."
          />
          <LonglistingWorkspace
            vacancies={vacancies.map((vacancy) => ({
              ...vacancy,
              closingAt: vacancy.closingAt.toISOString(),
              longlistingRulesLockedAt: vacancy.longlistingRulesLockedAt?.toISOString() ?? null,
              applicationCount: vacancy._count.applications,
            }))}
            initialVacancyId={initialVacancyId}
            capabilities={{ manageRules: canManageRules, run: canRun, confirm: canConfirm, override: canOverride }}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
