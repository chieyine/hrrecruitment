import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Edit3, Users } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import VacancyLifecycleActions from '@/components/recruitment/VacancyLifecycleActions'
import { PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { formatDate, getStatusBadgeClass } from '@/lib/utils'
import { canMakeHrManagerDecision } from '@/lib/recruitment-role-policy'

const TERMINAL_APPLICATIONS = ['DRAFT']

export default async function VacancyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getVerifiedUser()
  if (!user) redirect(`/auth/login?next=/recruitment/vacancies/${id}`)
  const [readAll, readAssigned, canUpdate, canExport] = await Promise.all([
    hasPermission(user.userId, 'vacancy.read.all'),
    hasPermission(user.userId, 'vacancy.read.assigned'),
    hasPermission(user.userId, 'vacancy.update.all'),
    hasPermission(user.userId, 'report.export'),
  ])
  if (!readAll && !readAssigned) redirect('/recruitment/dashboard')

  const vacancy = await prisma.vacancy.findUnique({
    where: { id },
    include: {
      department: true,
      project: true,
      category: true,
      dutyStation: true,
      questions: { orderBy: { displayOrder: 'asc' } },
      requiredDocuments: true,
    },
  })
  if (!vacancy || (!readAll && vacancy.ownerUserId !== user.userId)) notFound()

  const [approval, groupedApplications] = await Promise.all([
    prisma.approval.findFirst({
      where: { resourceType: 'VACANCY', resourceId: vacancy.id },
      orderBy: { id: 'desc' },
    }),
    prisma.application.groupBy({
      by: ['internalStatus'],
      where: { vacancyId: vacancy.id, internalStatus: { notIn: TERMINAL_APPLICATIONS } },
      _count: true,
    }),
  ])
  const counts = Object.fromEntries(groupedApplications.map((item) => [item.internalStatus, item._count]))
  const applicationCount = groupedApplications.reduce((sum, item) => sum + item._count, 0)
  const manager = canMakeHrManagerDecision(user.roles)
  const canSubmit = canUpdate && vacancy.status === 'DRAFT' && (vacancy.ownerUserId === user.userId || manager)
  const canPublish =
    canUpdate &&
    vacancy.status === 'PENDING_APPROVAL' &&
    ['APPROVED', 'APPROVED_WITH_CONDITIONS'].includes(approval?.decision || '')
  const capabilities = {
    edit: canUpdate && vacancy.status === 'DRAFT',
    submit: canSubmit,
    reviewApproval:
      approval?.decision === 'PENDING' &&
      approval.approverUserId === user.userId &&
      approval.requestedBy !== user.userId,
    publish: canPublish,
    pause: canUpdate && vacancy.status === 'OPEN',
    resume: canUpdate && vacancy.status === 'PAUSED',
    close: canUpdate && ['OPEN', 'PAUSED'].includes(vacancy.status),
    cancel: manager && ['DRAFT', 'PENDING_APPROVAL', 'SCHEDULED', 'OPEN', 'PAUSED'].includes(vacancy.status),
  }

  const pipeline = [
    { label: 'New review', value: (counts.SUBMITTED || 0) + (counts.UNDER_REVIEW || 0) },
    {
      label: 'Shortlist',
      value: ['LONGLISTED', 'SHORTLISTED', 'ASSESSMENT_INVITED', 'ASSESSMENT_COMPLETED'].reduce(
        (sum, status) => sum + (counts[status] || 0),
        0
      ),
    },
    {
      label: 'Interview',
      value: ['INTERVIEW_INVITED', 'INTERVIEW_COMPLETED', 'REFERENCE_CHECK'].reduce(
        (sum, status) => sum + (counts[status] || 0),
        0
      ),
    },
    {
      label: 'Offer / start',
      value: [
        'RECOMMENDED',
        'RESERVE',
        'OFFER_DRAFT',
        'OFFER_SENT',
        'OFFER_ACCEPTED',
        'PREBOARDING',
        'READY_TO_RESUME',
        'RESUMED',
        'TRANSFERRED_TO_ERP',
      ].reduce((sum, status) => sum + (counts[status] || 0), 0),
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell space-y-6">
          <Link
            href="/recruitment/vacancies"
            className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" /> Vacancies
          </Link>
          <PageIntro
            eyebrow={vacancy.referenceNumber}
            title={vacancy.title}
            description={`${vacancy.department.name} · ${vacancy.dutyStation.name}`}
            actions={
              <>
                {canExport && (
                  <a href={`/api/recruitment/vacancies/${vacancy.id}/documentation`} className="btn-secondary">
                    <Download className="h-4 w-4" /> Export file
                  </a>
                )}
                <Link href={`/recruitment/vacancies/${vacancy.id}/applications`} className="btn-primary">
                  <Users className="h-4 w-4" /> Applications ({applicationCount})
                </Link>
              </>
            }
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pipeline.map((item) => (
              <Link key={item.label} href={`/recruitment/vacancies/${vacancy.id}/applications`} className="metric-card">
                <p className="text-[10px] font-bold uppercase tracking-[.11em] text-stone-500">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-.04em] text-navy-900">{item.value}</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <section className="section-panel">
                <div className="section-heading">
                  <div>
                    <h2 className="text-lg font-semibold text-navy-900">Role specification</h2>
                    <p className="mt-1 text-sm text-stone-600">
                      {vacancy.contractType.replaceAll('_', ' ').toLowerCase()} · {vacancy.numberOfPositions}{' '}
                      {vacancy.numberOfPositions === 1 ? 'position' : 'positions'} · closes{' '}
                      {formatDate(vacancy.closingAt)}
                    </p>
                  </div>
                  {capabilities.edit && (
                    <Link href={`/recruitment/vacancies/${vacancy.id}/edit`} className="btn-secondary">
                      <Edit3 className="h-4 w-4" /> Edit draft
                    </Link>
                  )}
                </div>
                <Specification title="Summary">{vacancy.summary}</Specification>
                <Specification title="Responsibilities">{vacancy.responsibilities}</Specification>
                <Specification title="Essential requirements">{vacancy.essentialQualifications}</Specification>
                {vacancy.desirableQualifications && (
                  <Specification title="Desirable requirements">{vacancy.desirableQualifications}</Specification>
                )}
              </section>

              <section className="section-panel">
                <div className="section-heading">
                  <div>
                    <h2 className="text-lg font-semibold text-navy-900">Application setup</h2>
                    <p className="mt-1 text-sm text-stone-600">Questions and files requested from each candidate.</p>
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <SetupList
                    title="Questions"
                    empty="No additional questions."
                    items={vacancy.questions.map((question) => `${question.label}${question.required ? ' *' : ''}`)}
                  />
                  <SetupList
                    title="Documents"
                    empty="No documents requested."
                    items={vacancy.requiredDocuments.map(
                      (document) => `${document.documentType.replaceAll('_', ' ')}${document.required ? ' *' : ''}`
                    )}
                  />
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="section-panel">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-navy-900">Vacancy status</h2>
                  <span className={`status-chip ${getStatusBadgeClass(vacancy.status)}`}>
                    {vacancy.status.replaceAll('_', ' ').toLowerCase()}
                  </span>
                </div>
                <dl className="mt-5 space-y-3 text-sm">
                  <Meta label="Opens" value={formatDate(vacancy.openingAt)} />
                  <Meta label="Closes" value={formatDate(vacancy.closingAt)} />
                  <Meta
                    label="Approval"
                    value={(approval?.decision || 'Not requested').replaceAll('_', ' ').toLowerCase()}
                  />
                  <Meta label="Project" value={vacancy.project?.name || 'None'} />
                </dl>
              </section>
              <VacancyLifecycleActions vacancyId={vacancy.id} capabilities={capabilities} />
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function Specification({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-stone-200 py-5 first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-stone-700">{children}</p>
    </div>
  )
}

function SetupList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm text-stone-700">
          {items.map((item) => (
            <li key={item} className="border-l-2 border-stone-200 pl-3">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-stone-500">{empty}</p>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-stone-100 pt-3 first:border-0 first:pt-0">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right font-semibold capitalize text-stone-800">{value}</dd>
    </div>
  )
}
