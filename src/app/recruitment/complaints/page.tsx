import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import ComplaintCaseManager from '@/components/admin/ComplaintCaseManager'
import { canMakeHrManagerDecision } from '@/lib/recruitment-role-policy'

export default async function RecruitmentComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>
}) {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!(await hasPermission(user.userId, 'complaint.manage'))) redirect('/recruitment/dashboard')
  const query = await searchParams
  const view = query.view === 'closed' ? 'closed' : 'open'
  const search = query.q?.trim().slice(0, 200) || ''
  const rawCases = await prisma.complaintCase.findMany({
    where: {
      ...(view === 'closed' ? { status: 'CLOSED' } : { status: { not: 'CLOSED' } }),
      ...(search
        ? {
            OR: [
              { referenceNumber: { contains: search, mode: 'insensitive' } },
              { subject: { contains: search, mode: 'insensitive' } },
              { reporterEmail: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      comments: { orderBy: { createdAt: 'asc' } },
      attachments: true,
      application: {
        select: {
          id: true,
          candidate: { select: { legalFirstName: true, lastName: true } },
          vacancy: { select: { referenceNumber: true, title: true } },
        },
      },
    },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
    take: 250,
  })
  const severity = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as Record<string, number>
  const cases = rawCases.sort((left, right) => (severity[left.priority] ?? 9) - (severity[right.priority] ?? 9))
  const users = await prisma.user.findMany({
    where: {
      accountStatus: 'ACTIVE',
      AND: [
        { userRoles: { some: { role: { name: { in: ['RECRUITMENT_OFFICER', 'HR_MANAGER'] } } } } },
        { userRoles: { none: { role: { name: 'SYSTEM_ADMIN' } } } },
      ],
    },
    select: { id: true, email: true },
  })
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <ComplaintCaseManager
          initialCases={cases}
          users={users}
          canClose={canMakeHrManagerDecision(user.roles)}
          currentUserId={user.userId}
          view={view}
          search={search}
        />
      </main>
      <Footer />
    </div>
  )
}
