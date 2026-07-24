import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import CandidateMergeManager from '@/components/admin/CandidateMergeManager'

export default async function RecruitmentQualityPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!await hasPermission(user.userId, 'report.export')) redirect('/recruitment/dashboard')
  const now = new Date()
  const [
    scorecards, submissions, overrides, reopenedScorecards, candidates,
    missingContacts, unassignedApplications, vacanciesWithoutScorecards,
    interviewPanels, inconsistentAssessments, offerCandidates,
    overduePreboarding, erpMissing,
  ] = await Promise.all([
    prisma.candidateScorecard.findMany({ where: { status: 'SUBMITTED' }, select: { reviewerUserId: true, totalScore: true, scorecardTemplate: { select: { criteria: { select: { maximumScore: true, weight: true } } } }, reviewer: { select: { email: true } } } }),
    prisma.interviewPanelSubmission.findMany({ include: { panelMember: { include: { user: { select: { email: true } } } }, interview: { select: { id: true, title: true } } } }),
    prisma.selectionDecision.findMany({ where: { overrideFlag: true }, include: { application: { include: { vacancy: true } } }, orderBy: { approvedAt: 'desc' } }),
    prisma.candidateScorecard.count({ where: { reopenedAt: { not: null } } }),
    prisma.candidateProfile.findMany({ select: { id: true, legalFirstName: true, lastName: true, primaryPhone: true, user: { select: { email: true } }, applications: { select: { id: true }, take: 1 } }, orderBy: { createdAt: 'desc' }, take: 2000 }),
    prisma.candidateProfile.count({ where: { primaryPhone: null, user: { phone: null } } }),
    prisma.application.count({ where: { assignedReviewerId: null, internalStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
    prisma.vacancy.count({ where: { status: { in: ['OPEN', 'APPROVED'] }, OR: [{ screeningScorecardTemplateId: null }, { interviewScorecardTemplateId: null }] } }),
    prisma.interview.findMany({ where: { status: { not: 'CANCELLED' } }, select: { id: true, _count: { select: { panelMembers: true } } }, take: 5000 }),
    prisma.candidateAssessment.count({ where: { OR: [{ status: { in: ['PASSED', 'FAILED'] }, score: null }, { status: 'MARKED', passed: null }] } }),
    prisma.offer.findMany({ where: { status: { in: ['DRAFT', 'PENDING_APPROVAL'] } }, select: { id: true }, take: 5000 }),
    prisma.candidatePreboarding.count({ where: { OR: [{ forms: { some: { dueAt: { lt: now }, status: { notIn: ['APPROVED', 'WAIVED'] } } } }, { documents: { some: { dueAt: { lt: now }, status: { notIn: ['APPROVED', 'WAIVED'] } } } }, { courses: { some: { dueAt: { lt: now }, status: { notIn: ['COMPLETED', 'WAIVED'] } } } }, { tasks: { some: { dueAt: { lt: now }, status: { notIn: ['COMPLETED', 'APPROVED', 'WAIVED'] } } } }] } }),
    prisma.application.count({ where: { internalStatus: 'TRANSFERRED_TO_ERP', erpTransferRecord: null } }),
  ])
  const approvedOffers = offerCandidates.length
    ? await prisma.approval.findMany({ where: { resourceType: 'OFFER', resourceId: { in: offerCandidates.map((item) => item.id) }, decision: { in: ['PENDING', 'APPROVED', 'APPROVED_WITH_CONDITIONS'] } }, select: { resourceId: true } })
    : []
  const operationalChecks = [
    ['Candidates missing contact information', missingContacts, '/recruitment/search'],
    ['Applications without an owner', unassignedApplications, '/recruitment/applications'],
    ['Active vacancies missing a scorecard', vacanciesWithoutScorecards, '/recruitment/vacancies'],
    ['Interviews without a full panel', interviewPanels.filter((item) => item._count.panelMembers < 2).length, '/recruitment/interviews'],
    ['Inconsistent assessment outcomes', inconsistentAssessments, '/recruitment/assessments'],
    ['Offers missing approval records', offerCandidates.length - new Set(approvedOffers.map((item) => item.resourceId)).size, '/recruitment/offers'],
    ['Preboarding cases with overdue mandatory items', overduePreboarding, '/recruitment/preboarding'],
    ['ERP transfers missing a personnel number', erpMissing, '/recruitment/preboarding'],
  ] as const

  const reviewers = new Map<string, { email: string; count: number; totalPct: number }>()
  for (const item of scorecards) {
    const maximum = item.scorecardTemplate.criteria.reduce((sum, criterion) => sum + criterion.maximumScore * criterion.weight, 0) || 1
    const current = reviewers.get(item.reviewerUserId) || { email: item.reviewer.email, count: 0, totalPct: 0 }
    current.count++
    current.totalPct += item.totalScore / maximum * 100
    reviewers.set(item.reviewerUserId, current)
  }
  const interviewGroups = new Map<string, typeof submissions>()
  for (const item of submissions) {
    const group = interviewGroups.get(item.interviewId) || []
    group.push(item)
    interviewGroups.set(item.interviewId, group)
  }
  const variances = [...interviewGroups.values()].map((items) => {
    const scores = items.map((item) => item.totalScore)
    return { id: items[0].interview.id, title: items[0].interview.title, count: items.length, min: Math.min(...scores), max: Math.max(...scores), spread: Math.max(...scores) - Math.min(...scores) }
  }).filter((item) => item.count > 1).sort((a, b) => b.spread - a.spread)
  const duplicateKeys = new Map<string, typeof candidates>()
  for (const candidate of candidates) {
    const phone = candidate.primaryPhone?.replace(/\D/g, '')
    const key = phone && phone.length >= 8 ? `phone:${phone.slice(-10)}` : `name:${candidate.legalFirstName.trim().toLowerCase()}|${candidate.lastName.trim().toLowerCase()}`
    const group = duplicateKeys.get(key) || []
    group.push(candidate)
    duplicateKeys.set(key, group)
  }
  const potentialDuplicates = [...duplicateKeys.entries()].filter(([, group]) => group.length > 1)

  return <div className="flex min-h-screen flex-col bg-slate-50">
    <Header currentUser={user}/>
    <main id="main-content" className="flex-1 py-10">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <div><h1 className="text-2xl font-extrabold">Recruitment decision quality</h1><p className="text-sm text-slate-600">Operational issues for human review. These signals do not make recruitment decisions.</p></div>
        <div className="grid gap-4 md:grid-cols-4">
          {[['Submitted reviews', scorecards.length], ['Reopened scorecards', reopenedScorecards], ['Ranking overrides', overrides.length], ['Possible duplicates', potentialDuplicates.length]].map(([label, value]) => <div key={String(label)} className="section-panel p-5"><p className="text-xs font-bold uppercase">{label}</p><p className="text-3xl font-extrabold">{value}</p></div>)}
        </div>
        <section className="section-panel">
          <h2 className="font-bold">Operational data-quality checks</h2><p className="mt-1 text-xs text-slate-500">Open a check to review and correct the underlying records.</p>
          <div className="mt-4 grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">{operationalChecks.map(([label, count, href]) => <Link key={label} href={href} className={`bg-white p-4 hover:bg-slate-50 ${count ? 'text-amber-900' : 'text-slate-700'}`}><span className="text-xs font-semibold">{label}</span><span className="mt-1 block text-2xl font-bold">{count}</span></Link>)}</div>
        </section>
        <section className="section-panel p-5">
          <h2 className="font-bold">Possible duplicate candidate accounts</h2><p className="mt-1 text-xs leading-5 text-slate-500">Matches use normalized phone numbers, or names where no usable phone exists. A match is not proof of duplication.</p>
          {potentialDuplicates.map(([key, group]) => <div key={key} className="mt-3 border-t pt-3"><p className="text-xs font-bold text-amber-800">{key.startsWith('phone:') ? 'Matching phone number' : 'Matching name'}</p>{group.map((candidate) => <p key={candidate.id} className="mt-1 text-sm"><Link href={candidate.applications[0] ? `/recruitment/applications/${candidate.applications[0].id}` : `/recruitment/search?q=${encodeURIComponent(candidate.user.email)}`} className="font-semibold text-brand-800 underline">{candidate.legalFirstName} {candidate.lastName}</Link> <span className="text-slate-500">· {candidate.user.email}</span></p>)}</div>)}
          {!potentialDuplicates.length && <p className="mt-3 text-sm text-emerald-700">No possible duplicate accounts found in the current review set.</p>}
        </section>
        <CandidateMergeManager userId={user.userId} candidates={candidates.map((candidate) => ({ id: candidate.id, name: `${candidate.legalFirstName} ${candidate.lastName}`, email: candidate.user.email }))}/>
        <section className="section-panel p-5"><h2 className="font-bold">Reviewer calibration</h2><table className="mt-3 data-table"><thead><tr><th>Reviewer</th><th>Reviews</th><th>Average normalized score</th></tr></thead><tbody>{[...reviewers.values()].map((item) => <tr key={item.email}><td>{item.email}</td><td>{item.count}</td><td>{(item.totalPct / item.count).toFixed(1)}%</td></tr>)}</tbody></table><p className="mt-3 text-xs text-slate-500">Differences may reflect assigned candidate pools. Investigate underlying records; do not infer bias from averages alone.</p></section>
        <section className="section-panel p-5"><h2 className="font-bold">Panel scoring variance</h2>{variances.map((item) => <p key={item.id} className={`mt-2 border-t pt-2 text-sm ${item.spread >= 20 ? 'font-bold text-amber-800' : ''}`}><Link href={`/recruitment/interviews/${item.id}`} className="hover:underline">{item.title}: {item.min.toFixed(1)}–{item.max.toFixed(1)} ({item.spread.toFixed(1)} spread, {item.count} panelists)</Link></p>)}{!variances.length && <p className="mt-2 text-sm text-slate-500">No multi-panel submissions yet.</p>}</section>
        <section className="section-panel p-5"><h2 className="font-bold">Documented ranking overrides</h2>{overrides.map((item) => <p key={item.id} className="mt-2 border-t pt-2 text-sm"><Link href={`/recruitment/applications/${item.applicationId}`} className="font-bold text-blue-700 hover:underline">{item.application.vacancy.title}</Link> — {item.outcome}: {item.justification}</p>)}{!overrides.length && <p className="mt-2 text-sm text-slate-500">No overrides recorded.</p>}</section>
      </div>
    </main>
    <Footer/>
  </div>
}
