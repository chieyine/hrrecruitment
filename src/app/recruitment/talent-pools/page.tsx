import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import TalentPoolManager from '@/components/admin/TalentPoolManager'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { hasStaffRole } from '@/lib/roles'
import { PageIntro } from '@/components/ui/PageElements'
import { canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'

export default async function TalentPoolsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = searchParams ? await searchParams : {}
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')
  if (!canRunRecruitmentOperations(user.roles) || !(await hasPermission(user.userId, 'application.read.all')))
    redirect('/recruitment/dashboard')
  const [pools, candidates] = await Promise.all([
    prisma.talentPool.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        description: true,
        poolType: true,
        members: {
          where: { status: { not: 'REMOVED' } },
          orderBy: { addedAt: 'desc' },
          select: {
            id: true,
            status: true,
            tagsJson: true,
            notes: true,
            sourceApplicationId: true,
            addedAt: true,
            candidate: {
              select: {
                id: true,
                legalFirstName: true,
                lastName: true,
                user: { select: { email: true } },
                skills: { select: { name: true }, take: 10 },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.candidateProfile.findMany({
      where: {
        consentRecords: { some: { consentType: 'TALENT_POOL', decision: true, withdrawnAt: null } },
        user: { accountStatus: 'ACTIVE' },
        applications: {
          some: { internalStatus: { in: ['RESERVE', 'NOT_SELECTED', 'INTERVIEW_COMPLETED', 'REFERENCE_CHECK'] } },
        },
      },
      select: {
        id: true,
        legalFirstName: true,
        lastName: true,
        primaryPhone: true,
        user: { select: { email: true } },
        skills: { select: { name: true }, take: 10 },
        applications: {
          where: { internalStatus: { in: ['RESERVE', 'NOT_SELECTED', 'INTERVIEW_COMPLETED', 'REFERENCE_CHECK'] } },
          select: { id: true, vacancy: { select: { title: true, referenceNumber: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 3,
        },
      },
      orderBy: [{ lastName: 'asc' }, { legalFirstName: 'asc' }],
      take: 500,
    }),
  ])
  const phoneCounts = new Map<string, number>()
  candidates.forEach((candidate) => {
    const phone = candidate.primaryPhone?.replace(/\D/g, '')
    if (phone) phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1)
  })
  const viewCandidates = candidates.map((candidate) => ({
    ...candidate,
    possibleDuplicate: Boolean(
      candidate.primaryPhone && (phoneCounts.get(candidate.primaryPhone.replace(/\D/g, '')) || 0) > 1
    ),
  }))
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell max-w-6xl space-y-7">
          <PageIntro
            title="Talent pools"
            description="Keep suitable past candidates organised for future vacancies when they have agreed to be contacted."
          />
          <TalentPoolManager
            pools={pools}
            candidates={viewCandidates}
            initialPoolId={typeof query.pool === 'string' ? query.pool : ''}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
