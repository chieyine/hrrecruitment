import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { getStatusBadgeClass, formatDate } from '@/lib/utils'
import { Briefcase, Users, FileCheck, Award, ShieldAlert } from 'lucide-react'
import { hasPermission } from '@/lib/rbac'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { hasStaffRole } from '@/lib/roles'

export default async function RecruitmentDashboardPage() {
  const user = await getVerifiedUser()

  if (!user || !hasStaffRole(user.roles)) {
    redirect('/auth/login')
  }
  if (user.roles.includes('APPROVER') && !user.roles.includes('HR_MANAGER')) redirect('/recruitment/approvals')
  if (user.roles.includes('PANEL_MEMBER') && user.roles.every((role) => role === 'PANEL_MEMBER')) redirect('/recruitment/interviews')
  if (user.roles.includes('COURSE_ADMIN') && user.roles.every((role) => role === 'COURSE_ADMIN')) redirect('/admin/courses')
  const readAll = await hasPermission(user.userId, 'vacancy.read.all')
  const readAssigned = await hasPermission(user.userId, 'vacancy.read.assigned')
  if (!readAll && !readAssigned) redirect('/')
  const vacancyWhere = readAll ? {} : { ownerUserId: user.userId }
  const applicationWhere = readAll ? {} : {
    OR: [
      { assignedReviewerId: user.userId },
      { vacancy: { ownerUserId: user.userId } },
      { interviews: { some: { panelMembers: { some: { userId: user.userId } } } } },
    ],
  }

  const totalVacancies = await prisma.vacancy.count({ where: vacancyWhere })
  const openVacancies = await prisma.vacancy.count({ where: { ...vacancyWhere, status: 'OPEN' } })
  const totalApplications = await prisma.application.count({ where: applicationWhere })
  const pendingReview = await prisma.application.count({ where: { AND: [applicationWhere, { internalStatus: 'SUBMITTED' }] } })
  const preboardingActive = readAll ? await prisma.candidatePreboarding.count({ where: { status: 'IN_PROGRESS' } }) : 0
  const readyForErp = readAll ? await prisma.application.count({ where: { internalStatus: 'READY_TO_RESUME' } }) : 0
  const createdInErp = readAll ? await prisma.application.count({ where: { internalStatus: 'TRANSFERRED_TO_ERP' } }) : 0

  const recentApplications = await prisma.application.findMany({
    where: applicationWhere,
    take: 10,
    orderBy: { updatedAt: 'desc' },
    include: {
      candidate: {
        include: { user: { select: { email: true } } },
      },
      vacancy: {
        include: { department: true, dutyStation: true },
      },
      erpTransferRecord: true,
    },
  })

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <PageIntro
            eyebrow="Recruitment"
            title="Recruitment overview"
            description="Open your assigned work first, then use this page to check current volumes and recent candidate activity."
            actions={<><Link href="/recruitment/work" className="btn-primary"><Users className="mr-2 h-4 w-4" />My work</Link><Link href="/recruitment/vacancies/new" className="btn-secondary">Create vacancy</Link><Link href="/recruitment/operations" className="btn-secondary">Operational checks</Link><Link href="/recruitment/insights" className="btn-secondary">Management insight</Link></>}
          />

          {/* Operational Metrics Grid */}
          <div className="grid grid-cols-2 border-y border-stone-200 bg-white lg:grid-cols-4">
            <div className="border-b border-r border-stone-200 p-5 lg:border-b-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Open vacancies</span>
                <Briefcase className="h-5 w-5 text-brand-700" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{openVacancies} / {totalVacancies}</div>
              <p className="text-xs text-slate-500 font-medium">Published and accepting applications</p>
            </div>

            <div className="border-b border-stone-200 p-5 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Applications</span>
                <Users className="h-5 w-5 text-brand-700" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{totalApplications}</div>
              <p className="text-xs text-amber-700 font-bold">{pendingReview} awaiting review</p>
            </div>

            <div className="border-r border-stone-200 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active preboarding</span>
                <FileCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{preboardingActive}</div>
              <p className="text-xs text-slate-500 font-medium">Forms, documents and policies in progress</p>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">ERP handover</span>
                <Award className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{readyForErp}</div>
              <p className="text-xs text-emerald-700 font-bold">{createdInErp} transferred and closed</p>
            </div>
          </div>

          {/* System Boundary Notice */}
          <div className="border-l-4 border-brand-600 bg-brand-50 p-5 text-sm text-stone-700 flex items-start gap-4">
            <ShieldAlert className="h-5 w-5 text-brand-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">ERP handover</h4>
              <p className="leading-relaxed">
                Recruitment closes here only after HR records the personnel number created in the FRAD ERP.
              </p>
            </div>
          </div>

          {/* Recent Candidate Activity Pipeline */}
          <div className="section-panel p-5 sm:p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-display text-2xl text-slate-900">Recent candidate activity</h2>
                <p className="text-sm text-slate-500">The ten applications updated most recently.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Vacancy</th>
                    <th className="py-3 px-4">Internal Stage</th>
                    <th className="py-3 px-4">Preboarding Status</th>
                    <th className="py-3 px-4">ERP Personnel #</th>
                    <th className="py-3 px-4 text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {recentApplications.length === 0 ? (
                    <tr><td colSpan={6}><EmptyState title="No applications yet" description="Submitted applications will appear here." /></td></tr>
                  ) : (
                    recentApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {app.candidate.legalFirstName} {app.candidate.lastName}
                          <span className="block text-[10px] font-normal text-slate-500">{app.candidate.user.email}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900">{app.vacancy.title}</span>
                          <span className="block text-[10px] text-slate-500 font-mono">{app.vacancy.referenceNumber}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(app.internalStatus)}`}>
                            {app.internalStatus.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-600 font-semibold">
                            {app.preboardingStatus || 'Not Started'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                          {app.erpTransferRecord ? app.erpTransferRecord.erpPersonnelNumber : 'Pending Handover'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500">
                          {formatDate(app.updatedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
