import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import StaffingRequestWorkspace from '@/components/recruitment/StaffingRequestWorkspace'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { hasStaffRole } from '@/lib/roles'
import { PageIntro } from '@/components/ui/PageElements'

/**
 * §5 Staffing requests.
 *
 * The same screen serves the hiring department raising a request, HR reviewing
 * it and the Budget Holder confirming the money — each sees only the actions
 * their role allows, resolved on the server.
 */
export default async function StaffingRequestsPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')

  const [canReadAll, canReadAssigned, canCreate, canReview, canApprove, canConfirmFunding] = await Promise.all([
    hasPermission(user.userId, 'staffing.request.read.all'),
    hasPermission(user.userId, 'staffing.request.read.assigned'),
    hasPermission(user.userId, 'staffing.request.create'),
    hasPermission(user.userId, 'staffing.request.review'),
    hasPermission(user.userId, 'staffing.request.approve'),
    hasPermission(user.userId, 'funding.confirm'),
  ])
  if (!canReadAll && !canReadAssigned) redirect('/recruitment/dashboard')

  const [departments, dutyStations, projects, contractTypes] = await Promise.all([
    prisma.department.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.dutyStation.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, state: true },
    }),
    prisma.project.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    }),
    prisma.contractType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    }),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell max-w-6xl space-y-7">
          <PageIntro
            eyebrow="Plan and fund"
            title="Staffing requests"
            description="Every vacancy begins here. A department sets out the need, the Budget Holder confirms the money, then HR prepares the vacancy."
          />
          <StaffingRequestWorkspace
            currentUserId={user.userId}
            currentUserEmail={user.email}
            capabilities={{
              create: canCreate,
              review: canReview,
              approve: canApprove,
              confirmFunding: canConfirmFunding,
            }}
            options={{ departments, dutyStations, projects, contractTypes }}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
