import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Download, FileArchive, LockKeyhole } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import ReportScheduler from '@/components/admin/ReportScheduler'
import RecruitmentInsightsOverview from '@/components/recruitment/RecruitmentInsightsOverview'
import { PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { hasStaffRole } from '@/lib/roles'

const REPORTS = [
  ['staffing-requests', 'Staffing requests', 'Plan and fund'],
  ['funding', 'Funding confirmations', 'Plan and fund'],
  ['pipeline', 'Vacancy pipeline', 'Recruitment'],
  ['candidate-stages', 'Candidate stage history', 'Recruitment'],
  ['longlisting', 'Longlisting summary', 'Recruitment'],
  ['longlisting-exceptions', 'Longlisting exceptions and overrides', 'Recruitment'],
  ['shortlisting', 'Shortlisting scores', 'Recruitment'],
  ['assessments', 'Assessment outcomes', 'Recruitment'],
  ['interviews', 'Interview activity', 'Recruitment'],
  ['candidate-ranking', 'Candidate ranking', 'Recruitment'],
  ['selection', 'Selection decisions', 'Recruitment'],
  ['references', 'Reference checks', 'Recruitment'],
  ['background-checks', 'Background-check status', 'Recruitment'],
  ['offers', 'Offer outcomes', 'Offer and start'],
  ['preboarding', 'Pre-start completion', 'Offer and start'],
  ['outstanding', 'Outstanding pre-start items', 'Offer and start'],
  ['courses', 'Course completion', 'Offer and start'],
  ['readiness', 'Readiness checks', 'Offer and start'],
  ['resumption', 'Start outcomes', 'Offer and start'],
  ['erp', 'ERP handovers', 'Offer and start'],
  ['recruitment-closure', 'Recruitment closure', 'Offer and start'],
  ['waivers', 'Waiver audit', 'Governance'],
  ['approvals', 'Approval decisions', 'Governance'],
  ['compliance', 'Recruitment compliance', 'Governance'],
  ['signatures', 'Electronic signature register', 'Governance'],
  ['audit', 'System audit trail', 'Governance'],
  ['complaints', 'Complaint and appeal register', 'Governance'],
  ['privacy-deletions', 'Privacy and deletion requests', 'Governance'],
  ['configuration-changes', 'Configuration change approvals', 'Governance'],
  ['time-to-fill', 'Time to fill', 'Operations'],
  ['source-of-application', 'Source of application and hire', 'Operations'],
  ['work-items', 'Work queue and service history', 'Operations'],
  ['communications', 'Communication register', 'Operations'],
  ['delivery', 'Message delivery and failures', 'Operations'],
  ['data-quality', 'Data-quality exceptions', 'Operations'],
] as const

const REPORT_GROUPS = ['Plan and fund', 'Recruitment', 'Offer and start', 'Governance', 'Operations'] as const
const VIEWS = [
  ['overview', 'Overview'],
  ['downloads', 'Downloads'],
  ['scheduled', 'Scheduled'],
] as const

export default async function RecruitmentReportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = searchParams ? await searchParams : {}
  const user = await getVerifiedUser()

  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')
  if (!(await hasPermission(user.userId, 'report.export'))) redirect('/recruitment/dashboard')

  const view = ['overview', 'downloads', 'scheduled'].includes(String(query.view)) ? String(query.view) : 'overview'
  const [
    canExportComplaints,
    canExportAudit,
    canExportGovernance,
    canExportReferences,
    canExportOffers,
    canExportPreboarding,
    canReadFunding,
    canReadRestrictedChecks,
  ] = await Promise.all([
    hasPermission(user.userId, 'complaint.manage'),
    hasPermission(user.userId, 'audit.read'),
    hasPermission(user.userId, 'governance.manage'),
    hasPermission(user.userId, 'reference.manage'),
    hasPermission(user.userId, 'offer.manage'),
    hasPermission(user.userId, 'preboarding.manage'),
    hasPermission(user.userId, 'funding.read'),
    hasPermission(user.userId, 'backgroundcheck.manage'),
  ])
  const auditor = user.roles.includes('AUDITOR')
  const canAccessReport = (code: string) => {
    if (auditor && !['complaints', 'configuration-changes'].includes(code)) return true
    if (code === 'complaints') return canExportComplaints
    if (code === 'audit') return canExportAudit
    if (['configuration-changes', 'privacy-deletions', 'delivery', 'data-quality'].includes(code))
      return canExportGovernance
    if (code === 'references') return canExportReferences
    if (code === 'offers') return canExportOffers
    if (['preboarding', 'outstanding', 'courses', 'readiness', 'resumption', 'erp', 'waivers'].includes(code))
      return canExportPreboarding
    // §3.7 financial reporting follows funding authority, not general HR access.
    if (['funding', 'staffing-requests'].includes(code)) return canReadFunding
    // §16 the due-diligence register is limited to those who manage checks.
    if (code === 'background-checks') return canReadRestrictedChecks
    return true
  }
  const visibleReports = REPORTS.filter(([code]) => canAccessReport(code))

  const exportFilters = new URLSearchParams()
  for (const key of ['vacancy', 'department', 'status', 'search', 'dateFrom', 'dateTo']) {
    const value = query[key]
    if (typeof value === 'string' && value.trim()) exportFilters.set(key, value)
  }
  const filterSuffix = exportFilters.toString() ? `&${exportFilters.toString()}` : ''

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell space-y-6">
          <PageIntro
            title="Reports"
            description="Review recruitment performance and download the records needed for follow-up and audit."
            actions={
              view === 'downloads' ? (
                <a href="/api/recruitment/reports/export?report=all&format=zip" className="btn-primary">
                  <FileArchive className="h-4 w-4" />
                  Download report pack
                </a>
              ) : undefined
            }
          />

          <nav aria-label="Report sections" className="flex gap-7 border-b border-stone-300">
            {VIEWS.map(([value, label]) => (
              <Link
                key={value}
                href={`/recruitment/reports?view=${value}`}
                aria-current={view === value ? 'page' : undefined}
                className={`border-b-2 px-0.5 pb-3 text-sm font-semibold ${
                  view === value
                    ? 'border-brand-700 text-navy-950'
                    : 'border-transparent text-stone-500 hover:border-stone-400 hover:text-navy-900'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {view === 'overview' && <RecruitmentInsightsOverview />}

          {view === 'downloads' && (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <p>
                  Downloads may contain personal information. Every export is recorded. Store and share files under
                  FRAD’s privacy and retention rules.
                </p>
              </div>

              <details className="section-panel">
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-navy-900 sm:px-6 [&::-webkit-details-marker]:hidden">
                  Filter downloads
                  {exportFilters.size > 0 && (
                    <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] text-brand-800">
                      {exportFilters.size} active
                    </span>
                  )}
                </summary>
                <form
                  method="get"
                  className="grid gap-3 border-t border-stone-200 bg-stone-50/70 p-5 md:grid-cols-3 xl:grid-cols-6 sm:p-6"
                >
                  <input type="hidden" name="view" value="downloads" />
                  <input
                    name="search"
                    defaultValue={typeof query.search === 'string' ? query.search : ''}
                    placeholder="Candidate or reference"
                    className="field-control"
                  />
                  <input
                    name="vacancy"
                    defaultValue={typeof query.vacancy === 'string' ? query.vacancy : ''}
                    placeholder="Vacancy"
                    className="field-control"
                  />
                  <input
                    name="department"
                    defaultValue={typeof query.department === 'string' ? query.department : ''}
                    placeholder="Department"
                    className="field-control"
                  />
                  <input
                    name="status"
                    defaultValue={typeof query.status === 'string' ? query.status : ''}
                    placeholder="Status"
                    className="field-control"
                  />
                  <input
                    aria-label="From date"
                    name="dateFrom"
                    type="date"
                    defaultValue={typeof query.dateFrom === 'string' ? query.dateFrom : ''}
                    className="field-control"
                  />
                  <input
                    aria-label="To date"
                    name="dateTo"
                    type="date"
                    defaultValue={typeof query.dateTo === 'string' ? query.dateTo : ''}
                    className="field-control"
                  />
                  <div className="flex gap-2 md:col-span-3 xl:col-span-6">
                    <button className="btn-primary">Apply filters</button>
                    <Link href="/recruitment/reports?view=downloads" className="btn-secondary">
                      Clear
                    </Link>
                  </div>
                </form>
              </details>

              <section aria-labelledby="registers-heading" className="section-panel">
                <div className="section-heading">
                  <div>
                    <h2 id="registers-heading" className="text-lg font-semibold text-navy-900">
                      Registers
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">Choose a format from the row you need.</p>
                  </div>
                </div>
                {REPORT_GROUPS.map((group) => {
                  const reports = visibleReports.filter(([, , category]) => category === group)
                  if (!reports.length) return null
                  return (
                    <div key={group} className="border-b border-stone-200 last:border-b-0">
                      <h3 className="bg-stone-50 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-stone-500 sm:px-6">
                        {group}
                      </h3>
                      <div className="divide-y divide-stone-100">
                        {reports.map(([code, label]) => (
                          <div
                            key={code}
                            className="flex flex-col justify-between gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:px-6"
                          >
                            <p className="text-sm font-semibold text-navy-900">{label}</p>
                            <div className="flex gap-2">
                              {['csv', 'xlsx', 'pdf'].map((format) => (
                                <a
                                  key={format}
                                  href={`/api/recruitment/reports/export?report=${code}&format=${format}${filterSuffix}`}
                                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-brand-300 hover:text-brand-800"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  {format.toUpperCase()}
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </section>
            </>
          )}

          {view === 'scheduled' && (
            <ReportScheduler defaultEmail={user.email} reportTypes={visibleReports.map(([code]) => code)} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
