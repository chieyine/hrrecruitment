import Link from 'next/link'
import { prisma } from '@/lib/prisma'

function days(milliseconds: number) {
  return Math.round((milliseconds / 86400000) * 10) / 10
}
function median(values: number[]) {
  if (!values.length) return 0
  const ordered = [...values].sort((a, b) => a - b)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2
}

export default async function RecruitmentInsightsOverview({ filters = {} }: { filters?: Record<string, string | string[] | undefined> }) {
  const now = new Date()
  // Insights is a reporting page, not a record list. Loading every application
  // with its full stage history (20,000 rows plus children, on every request)
  // was the heaviest query in the application. A rolling window bounds it, and
  // the stage-duration aggregation below is pushed into SQL.
  const windowDays = Number(process.env.INSIGHTS_WINDOW_DAYS || 365)
  const requestedFrom = typeof filters.from === 'string' ? new Date(filters.from) : null
  const requestedTo = typeof filters.to === 'string' ? new Date(`${filters.to}T23:59:59.999Z`) : null
  const windowStart = requestedFrom && !Number.isNaN(requestedFrom.getTime()) ? requestedFrom : new Date(now.getTime() - windowDays * 86_400_000)
  const windowEnd = requestedTo && !Number.isNaN(requestedTo.getTime()) ? requestedTo : now
  const value = (key: string) => typeof filters[key] === 'string' ? filters[key] as string : ''
  const vacancyFilter: any = {
    ...(value('department') ? { departmentId: value('department') } : {}),
    ...(value('project') ? { projectId: value('project') } : {}),
    ...(value('station') ? { dutyStationId: value('station') } : {}),
    ...(value('family') ? { categoryId: value('family') } : {}),
    ...(value('grade') ? { grade: value('grade') } : {}),
    ...(value('contract') ? { contractType: value('contract') } : {}),
    ...(value('owner') ? { ownerUserId: value('owner') } : {}),
    ...(value('status') ? { status: value('status') } : {}),
    ...(value('budgetHolder') ? { staffingRequest: { fundingConfirmations: { some: { budgetHolderUserId: value('budgetHolder'), supersededAt: null } } } } : {}),
  }
  const [departments, projects, stations, families, owners, budgetHolders, optionVacancies] = await Promise.all([
    prisma.department.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.dutyStation.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.vacancyCategory.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { createdVacancies: { some: {} } }, select: { id: true, email: true }, orderBy: { email: 'asc' }, take: 500 }),
    prisma.user.findMany({ where: { userRoles: { some: { role: { name: 'BUDGET_HOLDER' } } } }, select: { id: true, email: true }, orderBy: { email: 'asc' }, take: 500 }),
    prisma.vacancy.findMany({ select: { grade: true, contractType: true, status: true }, take: 5000 }),
  ])
  const [
    applications,
    vacancies,
    submissions,
    offers,
    preboardings,
    openWork,
    deliveryFailures,
    funding,
    erpTransfers,
  ] = await Promise.all([
    prisma.application.findMany({
      where: { createdAt: { gte: windowStart, lte: windowEnd }, vacancy: vacancyFilter },
      include: { vacancy: { include: { department: true } }, stageHistory: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    }),
    prisma.vacancy.findMany({
      where: { createdAt: { gte: windowStart, lte: windowEnd }, ...vacancyFilter },
      include: {
        department: true,
        applications: { select: { id: true, internalStatus: true, submittedAt: true, updatedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    }),
    prisma.interviewPanelSubmission.findMany({
      where: { submittedAt: { gte: windowStart, lte: windowEnd }, interview: { application: { vacancy: vacancyFilter } } },
      include: { interview: { include: { application: { include: { vacancy: true } } } } },
      take: 5000,
    }),
    prisma.offer.findMany({
      where: { startDate: { gte: windowStart, lte: windowEnd }, application: { vacancy: vacancyFilter } },
      include: { application: { include: { vacancy: true } } },
      take: 5000,
    }),
    prisma.candidatePreboarding.findMany({
      where: { startedAt: { gte: windowStart, lte: windowEnd }, application: { vacancy: vacancyFilter } },
      include: { application: { include: { vacancy: true } } },
      take: 5000,
    }),
    prisma.workItem.findMany({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] } }, take: 5000 }),
    prisma.outboxMessage.findMany({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } }, select: { applicationId: true }, take: 5000 }),
    prisma.fundingConfirmation.findMany({ where: { supersededAt: null, decision: 'CONFIRMED', decidedAt: { gte: windowStart, lte: windowEnd }, staffingRequest: { vacancies: { some: vacancyFilter } } }, select: { maximumRecruitmentCost: true, salaryCeilingCurrency: true }, take: 5000 }),
    prisma.eRPTransferRecord.findMany({ where: { application: { vacancy: vacancyFilter }, approvedAt: { gte: windowStart, lte: windowEnd } }, select: { transferStatus: true }, take: 5000 }),
  ])

  const stageDurations = new Map<string, number[]>()
  for (const application of applications) {
    const events = application.stageHistory
    // Only closed intervals belong in elapsed-time reporting. Including the
    // current stage made its age look like a completed processing duration.
    for (let index = 0; index < events.length - 1; index++) {
      const event = events[index]
      const end = events[index + 1].createdAt
      const values = stageDurations.get(event.toStatus) || []
      values.push(end.getTime() - event.createdAt.getTime())
      stageDurations.set(event.toStatus, values)
    }
  }
  const stageRows = [...stageDurations.entries()]
    .map(([stage, values]) => ({ stage, median: days(median(values)), cases: values.length }))
    .sort((a, b) => b.median - a.median)
  const vacancyRows = vacancies
    .map((vacancy) => {
      const active = vacancy.applications.filter(
        (item) => !['WITHDRAWN', 'CANCELLED', 'NOT_SELECTED', 'TRANSFERRED_TO_ERP'].includes(item.internalStatus)
      )
      const oldest = active
        .map((item) => item.submittedAt?.getTime())
        .filter((value): value is number => Boolean(value))
        .sort((a, b) => a - b)[0]
      return {
        id: vacancy.id,
        reference: vacancy.referenceNumber,
        title: vacancy.title,
        department: vacancy.department.name,
        active: active.length,
        age: oldest ? days(now.getTime() - oldest) : 0,
      }
    })
    .sort((a, b) => b.age - a.age)
  const panelGroups = new Map<string, typeof submissions>()
  for (const item of submissions) {
    const group = panelGroups.get(item.interviewId) || []
    group.push(item)
    panelGroups.set(item.interviewId, group)
  }
  const panelVariance = [...panelGroups.values()]
    .filter((items) => items.length > 1)
    .map((items) => ({
      interviewId: items[0].interviewId,
      vacancy: items[0].interview.application.vacancy.title,
      spread: Math.max(...items.map((item) => item.totalScore)) - Math.min(...items.map((item) => item.totalScore)),
      panelists: items.length,
    }))
    .sort((a, b) => b.spread - a.spread)
  const declineReasons = new Map<string, number>()
  for (const offer of offers.filter((item) => item.status === 'DECLINED')) {
    const reason = offer.candidateComment?.trim() || 'No reason recorded'
    declineReasons.set(reason, (declineReasons.get(reason) || 0) + 1)
  }
  const atRisk = preboardings.filter(
    (item) =>
      item.confirmedStartDate &&
      item.confirmedStartDate <= new Date(now.getTime() + 7 * 86400000) &&
      item.readinessStatus !== 'READY_TO_RESUME'
  )
  const departmentOutcomes = new Map<string, { total: number; progressed: number; withdrawn: number }>()
  for (const item of applications) {
    const current = departmentOutcomes.get(item.vacancy.department.name) || { total: 0, progressed: 0, withdrawn: 0 }
    current.total++
    if (
      [
        'RECOMMENDED',
        'OFFER_SENT',
        'OFFER_ACCEPTED',
        'PREBOARDING',
        'READY_TO_RESUME',
        'RESUMED',
        'TRANSFERRED_TO_ERP',
      ].includes(item.internalStatus)
    )
      current.progressed++
    if (item.internalStatus === 'WITHDRAWN') current.withdrawn++
    departmentOutcomes.set(item.vacancy.department.name, current)
  }
  const shortlistDurations = applications.flatMap((item) => {
    const submitted = item.submittedAt
    const shortlisted = item.stageHistory.find((event) => event.toStatus === 'SHORTLISTED')?.createdAt
    return submitted && shortlisted ? [shortlisted.getTime() - submitted.getTime()] : []
  })
  const submittedApplications = applications.filter((item) => item.internalStatus !== 'DRAFT')
  const qualifiedApplications = submittedApplications.filter((item) => item.eligibilityResult === 'ELIGIBLE' || item.stageHistory.some((event) => event.toStatus === 'LONGLISTED'))
  const shortlistedApplications = submittedApplications.filter((item) => item.stageHistory.some((event) => event.toStatus === 'SHORTLISTED') || ['SHORTLISTED', 'ASSESSMENT_INVITED', 'ASSESSMENT_COMPLETED', 'INTERVIEW_INVITED', 'INTERVIEW_COMPLETED', 'REFERENCE_CHECK', 'RECOMMENDED', 'RESERVE', 'OFFER_SENT', 'OFFER_ACCEPTED', 'PREBOARDING', 'READY_TO_RESUME', 'RESUMED', 'TRANSFERRED_TO_ERP'].includes(item.internalStatus))
  const acceptedOffers = offers.filter((offer) => offer.status === 'ACCEPTED').length
  const budgetByCurrency = new Map<string, number>()
  for (const item of funding) {
    if (item.maximumRecruitmentCost == null) continue
    const currency = item.salaryCeilingCurrency || 'NGN'
    budgetByCurrency.set(currency, (budgetByCurrency.get(currency) || 0) + Number(item.maximumRecruitmentCost))
  }
  const approvedRecruitmentBudget = [...budgetByCurrency.entries()].map(([currency, amount]) => `${currency} ${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`).join(' · ') || 'Not recorded'
  const filteredApplicationIds = new Set(applications.map((item) => item.id))
  const filteredVacancyIds = new Set(vacancies.map((item) => item.id))
  const filteredDeliveryFailures = deliveryFailures.filter((item) => item.applicationId && filteredApplicationIds.has(item.applicationId)).length
  const filteredOpenWork = openWork.filter((item) => !item.vacancyId || filteredVacancyIds.has(item.vacancyId))
  const sourceOutcomes = new Map<string, { applications: number; hires: number }>()
  for (const application of submittedApplications) {
    const current = sourceOutcomes.get(application.source) || { applications: 0, hires: 0 }
    current.applications++
    if (['OFFER_ACCEPTED', 'PREBOARDING', 'READY_TO_RESUME', 'RESUMED', 'TRANSFERRED_TO_ERP'].includes(application.internalStatus)) current.hires++
    sourceOutcomes.set(application.source, current)
  }
  const percentage = (part: number, whole: number) => whole ? `${Math.round((part / whole) * 100)}%` : '0%'
  const metrics = [
    ['Application volume', String(submittedApplications.length), 'Submitted applications in the selected period.', '/recruitment/applications'],
    ['Qualified application rate', percentage(qualifiedApplications.length, submittedApplications.length), 'Applications not rejected at eligibility review.', '/recruitment/applications'],
    ['Shortlisting conversion', percentage(shortlistedApplications.length, qualifiedApplications.length), 'Qualified applications that reached the shortlist.', '/recruitment/applications?stage=SHORTLISTED'],
    ['Offer acceptance', percentage(acceptedOffers, offers.filter((offer) => ['ACCEPTED', 'DECLINED'].includes(offer.status)).length), 'Accepted offers as a share of final responses.', '/recruitment/offers'],
    ['Approved recruitment budget', approvedRecruitmentBudget, 'Current maximum recruitment cost confirmed by budget holders, kept separate by currency.', '/recruitment/staffing-requests'],
    ['ERP completed', String(erpTransfers.filter((item) => ['RECORDED', 'CONFIRMED'].includes(item.transferStatus)).length), 'ERP records entered or reconciled.', '/recruitment/erp-transfers'],
    ['ERP pending', String(erpTransfers.filter((item) => item.transferStatus === 'APPROVED').length), 'Approved handovers awaiting an ERP record.', '/recruitment/erp-transfers'],
    ['ERP failed or cancelled', String(erpTransfers.filter((item) => item.transferStatus === 'CANCELLED').length), 'Handover records requiring follow-up.', '/recruitment/erp-transfers'],
    [
      'Time to shortlist',
      `${days(median(shortlistDurations))} days`,
      'Median from application submission to shortlist.',
      '/recruitment/applications',
    ],
    [
      'Overdue work items',
      String(filteredOpenWork.filter((item) => item.dueAt && item.dueAt < now).length),
      'Open work past its due date.',
      '/recruitment/work?attention=overdue',
    ],
    [
      'Starts at risk',
      String(atRisk.length),
      'Starting within seven days and not cleared.',
      '/recruitment/preboarding',
    ],
    [
      'Message delivery failures',
      String(filteredDeliveryFailures),
      'Current failed or dead-letter messages.',
      '/admin/system-settings',
    ],
  ] as const
  const distinct = (items: Array<string | null>) => [...new Set(items.filter((item): item is string => Boolean(item)))].sort()
  const grades = distinct(optionVacancies.map((item) => item.grade))
  const contracts = distinct(optionVacancies.map((item) => item.contractType))
  const statuses = distinct(optionVacancies.map((item) => item.status))

  return (
    <div className="space-y-8">
      <details className="section-panel" open={Object.keys(filters).some((key) => !['view'].includes(key) && value(key))}>
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-navy-950 sm:px-6">Filter recruitment analytics</summary>
        <form action="/recruitment/reports" className="grid gap-4 border-t border-stone-200 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
          <input type="hidden" name="view" value="overview" />
          <label><span className="field-label">From</span><input className="field-control" type="date" name="from" defaultValue={value('from')} /></label>
          <label><span className="field-label">To</span><input className="field-control" type="date" name="to" defaultValue={value('to')} /></label>
          <FilterSelect name="department" label="Department" current={value('department')} options={departments.map((item) => [item.id, item.name])} />
          <FilterSelect name="project" label="Project" current={value('project')} options={projects.map((item) => [item.id, item.name])} />
          <FilterSelect name="station" label="Duty station" current={value('station')} options={stations.map((item) => [item.id, item.name])} />
          <FilterSelect name="family" label="Job family" current={value('family')} options={families.map((item) => [item.id, item.name])} />
          <FilterSelect name="grade" label="Grade" current={value('grade')} options={grades.map((item) => [item, item])} />
          <FilterSelect name="contract" label="Contract type" current={value('contract')} options={contracts.map((item) => [item, item.replaceAll('_', ' ')])} />
          <FilterSelect name="owner" label="HR owner" current={value('owner')} options={owners.map((item) => [item.id, item.email])} />
          <FilterSelect name="budgetHolder" label="Budget holder" current={value('budgetHolder')} options={budgetHolders.map((item) => [item.id, item.email])} />
          <FilterSelect name="status" label="Vacancy status" current={value('status')} options={statuses.map((item) => [item, item.replaceAll('_', ' ')])} />
          <div className="flex items-end gap-2"><button className="btn-primary">Apply filters</button><Link href="/recruitment/reports?view=overview" className="btn-secondary">Clear</Link></div>
        </form>
      </details>
      <section aria-labelledby="report-summary-heading">
        <div className="mb-4 flex items-end justify-between border-b border-stone-300 pb-3">
          <div>
            <h2 id="report-summary-heading" className="text-xl font-semibold text-navy-950">
              Recruitment performance
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Completed activity covers {value('from') || value('to') ? 'the selected dates' : `the last ${windowDays} days`}; open-work figures show the current position.
            </p>
          </div>
        </div>
        <div className="grid border-y border-stone-300 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([label, value, description, href]) => (
            <Link key={label} href={href} className="group border-b border-stone-300 px-5 py-5 transition hover:bg-white/60 sm:border-r">
              <span className="text-sm font-medium text-stone-600">{label}</span>
              <span className="mt-3 block font-display text-4xl leading-none text-navy-950">{value}</span>
              <span className="mt-3 block text-xs leading-5 text-stone-500">{description}</span>
            </Link>
          ))}
        </div>
      </section>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <section className="section-panel">
          <div className="section-heading">
            <div>
              <h2 className="text-lg font-semibold text-navy-950">Time in each stage</h2>
              <p className="mt-1 text-sm text-stone-600">Longest median waits first.</p>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Median days</th>
                <th>Cases</th>
              </tr>
            </thead>
            <tbody>
              {stageRows.length === 0 && <EmptyTableRow columns={3} label="No completed stage changes yet" />}
              {stageRows.slice(0, 12).map((row) => (
                <tr key={row.stage}>
                  <td>
                    <Link
                      href={`/recruitment/applications?stage=${row.stage}`}
                      className="font-semibold text-brand-700 underline"
                    >
                      {row.stage.replaceAll('_', ' ')}
                    </Link>
                  </td>
                  <td>{row.median}</td>
                  <td>{row.cases}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="section-panel">
          <div className="section-heading">
            <div>
              <h2 className="text-lg font-semibold text-navy-950">Longest-running vacancies</h2>
              <p className="mt-1 text-sm text-stone-600">Oldest active application first.</p>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Vacancy</th>
                <th>Team</th>
                <th>Oldest active case</th>
              </tr>
            </thead>
            <tbody>
              {vacancyRows.length === 0 && <EmptyTableRow columns={3} label="No vacancies in this period" />}
              {vacancyRows.slice(0, 6).map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link
                      href={`/recruitment/vacancies/${row.id}/applications`}
                      className="font-semibold text-brand-700 underline"
                    >
                      {row.reference} · {row.title}
                    </Link>
                  </td>
                  <td>{row.department}</td>
                  <td>{row.age} days</td>
                </tr>
              ))}
            </tbody>
          </table>
          {vacancyRows.length > 6 && (
            <div className="border-t border-stone-200 px-5 py-3 text-right sm:px-6">
              <Link href="/recruitment/vacancies" className="text-sm font-semibold text-brand-700 hover:underline">
                View all vacancies
              </Link>
            </div>
          )}
        </section>
        <section className="section-panel">
          <div className="section-heading">
            <div>
              <h2 className="text-lg font-semibold text-navy-950">Interview score ranges</h2>
              <p className="mt-1 text-sm text-stone-600">Panels with more than one submitted score.</p>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Vacancy</th>
                <th>Score spread</th>
                <th>Panelists</th>
              </tr>
            </thead>
            <tbody>
              {panelVariance.length === 0 && <EmptyTableRow columns={3} label="No comparable panel scores yet" />}
              {panelVariance.slice(0, 12).map((row) => (
                <tr key={row.interviewId}>
                  <td>
                    <Link
                      href={`/recruitment/interviews#interview-${row.interviewId}`}
                      className="font-semibold text-brand-700 underline"
                    >
                      {row.vacancy}
                    </Link>
                  </td>
                  <td>{row.spread.toFixed(1)}</td>
                  <td>{row.panelists}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="section-panel">
          <div className="section-heading">
            <div>
              <h2 className="text-lg font-semibold text-navy-950">Offer declines</h2>
              <p className="mt-1 text-sm text-stone-600">Reasons recorded by candidates.</p>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Recorded reason</th>
                <th>Offers</th>
              </tr>
            </thead>
            <tbody>
              {declineReasons.size === 0 && <EmptyTableRow columns={2} label="No declined offers in this period" />}
              {[...declineReasons.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([reason, count]) => (
                  <tr key={reason}>
                    <td>
                      <Link href="/recruitment/offers" className="text-brand-700 underline">
                        {reason}
                      </Link>
                    </td>
                    <td>{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
        <section className="section-panel">
          <div className="section-heading">
            <div>
              <h2 className="text-lg font-semibold text-navy-950">Starting within seven days</h2>
              <p className="mt-1 text-sm text-stone-600">Candidates not yet cleared to start.</p>
            </div>
          </div>
          <div className="flex items-end justify-between gap-5 px-5 py-6 sm:px-6">
            <p className="font-display text-5xl leading-none text-navy-950">{atRisk.length}</p>
            <Link href="/recruitment/preboarding" className="text-sm font-semibold text-brand-700 hover:underline">
              Review candidates
            </Link>
          </div>
        </section>
        <section className="section-panel">
          <div className="section-heading">
            <div>
              <h2 className="text-lg font-semibold text-navy-950">Application sources</h2>
              <p className="mt-1 text-sm text-stone-600">Volume and hires by recorded source.</p>
            </div>
          </div>
          <table className="data-table">
            <thead><tr><th>Source</th><th>Applications</th><th>Hires</th><th>Hire rate</th></tr></thead>
            <tbody>
              {sourceOutcomes.size === 0 && <EmptyTableRow columns={4} label="No source data in this period" />}
              {[...sourceOutcomes.entries()].sort((a, b) => b[1].applications - a[1].applications).map(([source, outcome]) => <tr key={source}><td>{source.replaceAll('_', ' ')}</td><td>{outcome.applications}</td><td>{outcome.hires}</td><td>{percentage(outcome.hires, outcome.applications)}</td></tr>)}
            </tbody>
          </table>
        </section>
        <section className="section-panel">
          <div className="section-heading">
            <div>
              <h2 className="text-lg font-semibold text-navy-950">Applications by department</h2>
              <p className="mt-1 text-sm text-stone-600">Applications, progression and withdrawals.</p>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Applications</th>
                <th>Progressed</th>
                <th>Withdrawn</th>
              </tr>
            </thead>
            <tbody>
              {departmentOutcomes.size === 0 && <EmptyTableRow columns={4} label="No applications in this period" />}
              {[...departmentOutcomes.entries()].map(([department, value]) => (
                <tr key={department}>
                  <td>
                    <Link
                      href={`/recruitment/search?q=${encodeURIComponent(department)}`}
                      className="text-brand-700 underline"
                    >
                      {department}
                    </Link>
                  </td>
                  <td>{value.total}</td>
                  <td>{value.progressed}</td>
                  <td>{value.withdrawn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}

function FilterSelect({ name, label, current, options }: { name: string; label: string; current: string; options: Array<[string, string]> }) {
  return <label><span className="field-label">{label}</span><select className="field-control" name={name} defaultValue={current}><option value="">All</option>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
}

function EmptyTableRow({ columns, label }: { columns: number; label: string }) {
  return (
    <tr>
      <td colSpan={columns} className="py-8 text-center text-sm text-stone-500">
        {label}
      </td>
    </tr>
  )
}
