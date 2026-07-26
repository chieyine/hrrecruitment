import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import TalentPoolManager from '@/components/admin/TalentPoolManager'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { hasStaffRole } from '@/lib/roles'

export default async function TalentPoolsPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')
  if (!await hasPermission(user.userId, 'application.read.all')) redirect('/recruitment/dashboard')
  const [pools, candidates] = await Promise.all([
    prisma.talentPool.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.candidateProfile.findMany({
      where: { consentRecords: { some: { consentType: 'TALENT_POOL', decision: true, withdrawnAt: null } }, user: { accountStatus: 'ACTIVE' } },
      select: {
        id: true, legalFirstName: true, lastName: true, primaryPhone: true,
        user: { select: { email: true } },
        skills: { select: { name: true }, take: 10 },
        applications: {
          where: { internalStatus: { in: ['RESERVE', 'NOT_SELECTED', 'INTERVIEW_COMPLETED', 'REFERENCE_CHECK'] } },
          select: { id: true, vacancy: { select: { title: true, referenceNumber: true } } },
          orderBy: { updatedAt: 'desc' }, take: 3,
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
    possibleDuplicate: Boolean(candidate.primaryPhone && (phoneCounts.get(candidate.primaryPhone.replace(/\D/g, '')) || 0) > 1),
  }))
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="mx-auto max-w-6xl space-y-6 px-4">
          <div className="rounded-3xl bg-slate-900 p-7 text-white shadow-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Rediscovery and future opportunities</p>
            <h1 className="mt-2 text-3xl font-extrabold">Talent pools</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Build searchable, consent-led pools from strong candidates without importing shadow records or bypassing recruitment governance.</p>
          </div>
          <TalentPoolManager pools={pools} candidates={viewCandidates} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
