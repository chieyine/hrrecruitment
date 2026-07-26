import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { Download, ArrowLeft } from 'lucide-react'
import { hasPermission } from '@/lib/rbac'
import ReportScheduler from '@/components/admin/ReportScheduler'
import { PageIntro } from '@/components/ui/PageElements'
import { hasStaffRole } from '@/lib/roles'

const REPORTS = [
  ['pipeline','Vacancy pipeline'],
  ['candidate-stages','Candidate stage history'],
  ['assessments','Assessment outcomes'],
  ['interviews','Interview activity'],
  ['references','Reference checks'],
  ['offers','Offer outcomes'],
  ['preboarding','Preboarding completion'],
  ['outstanding','Outstanding preboarding'],
  ['courses','Course completion'],
  ['readiness','Readiness checks'],
  ['resumption','Resumption outcomes'],
  ['erp','ERP handovers'],
  ['waivers','Waiver audit'],
  ['work-items','Work queue and SLA history'],
  ['communications','Communication register'],
  ['approvals','Approval decisions'],
  ['audit','System audit trail'],
  ['complaints','Complaint and appeal register'],
  ['privacy-deletions','Privacy and deletion requests'],
  ['configuration-changes','Configuration change approvals'],
  ['delivery','Message delivery and failures'],
  ['data-quality','Data-quality exceptions'],
] as const

export default async function RecruitmentReportsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getVerifiedUser()

  if (!user || !hasStaffRole(user.roles)) {
    redirect('/auth/login')
  }
  if (!await hasPermission(user.userId, 'report.export')) redirect('/recruitment/dashboard')
  const [canExportComplaints, canExportAudit, canExportGovernance] = await Promise.all([
    hasPermission(user.userId, 'complaint.manage'),
    hasPermission(user.userId, 'audit.read'),
    hasPermission(user.userId, 'governance.manage'),
  ])
  const visibleReports = REPORTS
    .filter(([code]) => code !== 'complaints' || canExportComplaints)
    .filter(([code]) => code !== 'audit' || canExportAudit)
    .filter(([code]) => code !== 'configuration-changes' || canExportGovernance)
  const exportFilters = new URLSearchParams()
  for (const key of ['vacancy', 'department', 'status', 'search', 'dateFrom', 'dateTo']) {
    const value = searchParams?.[key]
    if (typeof value === 'string' && value.trim()) exportFilters.set(key, value)
  }
  const filterSuffix = exportFilters.toString() ? `&${exportFilters.toString()}` : ''

  const vacancies = await prisma.vacancy.findMany({
    include: {
      department: true,
      dutyStation: true,
      applications: true,
    },
  })

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>

          <PageIntro
            eyebrow="Evidence and documentation"
            title="Reports"
            description="Download individual registers or create one complete, dated documentation pack for controlled record-keeping."
            actions={<><Link href="/recruitment/insights" className="btn-secondary">Open management insight</Link><a href="/api/recruitment/reports/export?report=all&format=zip" className="btn-primary"><Download className="h-4 w-4" />Download complete report pack</a></>}
          />

          <div className="border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Exports contain personal and operational information.</p>
            <p className="mt-1">Every download is recorded in the audit trail. Store, share and dispose of exported files under FRAD privacy and retention rules.</p>
          </div>
          <form method="get" className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
            <input name="search" defaultValue={typeof searchParams?.search === 'string' ? searchParams.search : ''} placeholder="Candidate or reference" className="field-control" />
            <input name="vacancy" defaultValue={typeof searchParams?.vacancy === 'string' ? searchParams.vacancy : ''} placeholder="Vacancy" className="field-control" />
            <input name="department" defaultValue={typeof searchParams?.department === 'string' ? searchParams.department : ''} placeholder="Department" className="field-control" />
            <input name="status" defaultValue={typeof searchParams?.status === 'string' ? searchParams.status : ''} placeholder="Status" className="field-control" />
            <input aria-label="From date" name="dateFrom" type="date" defaultValue={typeof searchParams?.dateFrom === 'string' ? searchParams.dateFrom : ''} className="field-control" />
            <input aria-label="To date" name="dateTo" type="date" defaultValue={typeof searchParams?.dateTo === 'string' ? searchParams.dateTo : ''} className="field-control" />
            <div className="flex gap-2 md:col-span-3 xl:col-span-6"><button className="btn-primary">Apply export filters</button><Link href="/recruitment/reports" className="btn-secondary">Clear</Link></div>
          </form>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleReports.map(([code,label])=><section key={code} className="border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-950">{label}</h2><div className="mt-3 flex gap-2">{['csv','xlsx','pdf'].map(format=><a key={format} href={`/api/recruitment/reports/export?report=${code}&format=${format}${filterSuffix}`} className="btn-secondary min-h-9 px-3 py-1.5 text-xs"><Download className="h-3.5 w-3.5"/>{format.toUpperCase()}</a>)}</div></section>)}
          </div>
          <ReportScheduler defaultEmail={user.email} reportTypes={visibleReports.map(([code]) => code)} />

          {/* Vacancy Pipeline Summary Table */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
              Vacancy pipeline
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Vacancy Title</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Duty Station</th>
                    <th className="py-3 px-4">Total Applicants</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {vacancies.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700"><Link href={`/recruitment/vacancies/${v.id}/applications`} className="hover:underline">{v.referenceNumber}</Link></td>
                      <td className="py-3.5 px-4 font-bold text-slate-900"><Link href={`/recruitment/vacancies/${v.id}/applications`} className="hover:text-blue-700">{v.title}</Link></td>
                      <td className="py-3.5 px-4">{v.department.name}</td>
                      <td className="py-3.5 px-4">{v.dutyStation.name}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{v.applications.length}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-emerald-300">
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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
