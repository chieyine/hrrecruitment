'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckSquare,
  FileText,
  Info,
  MapPin,
  Shield,
  Upload,
  BriefcaseBusiness,
} from 'lucide-react'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'

const EMPTY = {
  id: '',
  overallCompletionPercentage: 0,
  readinessStatus: 'NOT_STARTED',
  confirmedStartDate: null,
  proposedStartDate: null,
  reportingLocation: '',
  vacancyTitle: '',
  vacancyReference: '',
  forms: [],
  documents: [],
  policies: [],
  courses: [],
  tasks: [],
  meetings: [],
  infoItems: [],
}

export default function CandidatePreboardingPage() {
  const [preboarding, setPreboarding] = useState<any>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [confirmingDate, setConfirmingDate] = useState(false)

  useEffect(() => {
    fetch('/api/candidate/preboarding')
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Unable to load your preboarding checklist.')
        const p = json.preboarding
        if (p) {
          setPreboarding({
            id: p.id,
            overallCompletionPercentage: p.overallCompletionPercentage ?? 0,
            readinessStatus: p.readinessStatus,
            confirmedStartDate: p.confirmedStartDate,
            proposedStartDate: p.application?.offers?.[0]?.startDate,
            reportingLocation: [p.application?.vacancy?.dutyStation?.name, p.application?.vacancy?.dutyStation?.address]
              .filter(Boolean)
              .join(' — '),
            vacancyTitle: p.application?.vacancy?.title || '',
            vacancyReference: p.application?.vacancy?.referenceNumber || '',
            forms: (p.forms || []).map((f: any) => ({
              id: f.id,
              title: f.formTemplate?.title || 'Form',
              status: f.status,
            })),
            documents: (p.documents || []).map((d: any) => ({
              id: d.id,
              name: d.documentRequirement?.name || 'Document',
              status: d.status,
            })),
            policies: (p.policyAcknowledgements || []).map((x: any) => ({
              id: x.id,
              title: x.policyDocument?.title || 'Policy',
              status: x.status,
            })),
            courses: (p.courses || []).map((c: any) => ({
              id: c.id,
              title: c.course?.title || 'Course',
              status: c.status,
              score: c.score != null ? `${c.score}%` : '—',
            })),
            tasks: (p.tasks || []).map((t: any) => ({
              id: t.id,
              title: t.taskTemplate?.title || 'Task',
              status: t.status,
            })),
            meetings: (p.meetings || []).map((m: any) => ({ id: m.id, title: m.title, status: m.status })),
            infoItems: (p.infoItems || []).map((i: any) => ({
              id: i.id,
              title: i.title,
              acknowledged: !!i.acknowledgedAt,
            })),
          })
          setStartDate((p.confirmedStartDate || p.application?.offers?.[0]?.startDate || '').slice(0, 10))
        }
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'Unable to load your preboarding checklist.')
      )
      .finally(() => setLoading(false))
  }, [])

  const confirmStartDate = async () => {
    setNotice('')
    setConfirmingDate(true)
    try {
      const response = await fetch('/api/candidate/preboarding/confirm-start-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preboardingId: preboarding.id, startDate }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to confirm start date.')
      setNotice('Start date confirmed.')
      setPreboarding({ ...preboarding, confirmedStartDate: data.confirmedStartDate })
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Unable to confirm start date.')
    } finally {
      setConfirmingDate(false)
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-50">
        <Header />
        <main id="main-content" className="flex-1 py-9">
          <div className="page-shell max-w-5xl">
            <div role="alert" className="border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
              {error}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!preboarding.id) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-50">
        <Header />
        <main id="main-content" className="flex-1 py-7 sm:py-9">
          <div className="page-shell max-w-5xl space-y-6">
            <PageIntro
              eyebrow="Your account"
              title="Before you start"
              description="Your checklist will appear here after you accept an offer from FRAD."
            />
            <EmptyState
              icon={BriefcaseBusiness}
              title="No preboarding checklist"
              description="There is nothing for you to complete here at the moment."
              action={{ href: '/candidate/applications', label: 'View applications' }}
            />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center">
          <p className="text-sm font-medium text-stone-500">Loading your preboarding requirements…</p>
        </main>
        <Footer />
      </div>
    )
  }

  const completedCount = (items: any[], complete: string[]) =>
    items.filter((item) => complete.includes(item.status)).length
  const categories = [
    {
      label: 'Forms',
      description: 'Complete the forms FRAD has assigned to you.',
      href: '/candidate/preboarding/forms',
      icon: FileText,
      done: completedCount(preboarding.forms, ['APPROVED', 'WAIVED']),
      total: preboarding.forms.length,
    },
    {
      label: 'Documents',
      description: 'Upload the required identity and employment documents.',
      href: '/candidate/preboarding/documents',
      icon: Upload,
      done: completedCount(preboarding.documents, ['APPROVED', 'WAIVED']),
      total: preboarding.documents.length,
    },
    {
      label: 'Policies',
      description: 'Read and sign the policies that apply to your role.',
      href: '/candidate/preboarding/policies',
      icon: Shield,
      done: completedCount(preboarding.policies, ['SIGNED', 'APPROVED', 'WAIVED']),
      total: preboarding.policies.length,
    },
    {
      label: 'Courses',
      description: 'Finish any required learning before your start date.',
      href: '/candidate/preboarding/courses',
      icon: BookOpen,
      done: completedCount(preboarding.courses, ['COMPLETED', 'WAIVED']),
      total: preboarding.courses.length,
    },
    {
      label: 'Other tasks',
      description: 'Complete the remaining actions from the recruitment team.',
      href: '/candidate/preboarding/tasks',
      icon: CheckSquare,
      done: completedCount(preboarding.tasks, ['COMPLETED', 'APPROVED', 'WAIVED']),
      total: preboarding.tasks.length,
    },
    {
      label: 'Meetings',
      description: 'Confirm orientation and other meetings.',
      href: '/candidate/preboarding/meetings',
      icon: Calendar,
      done: completedCount(preboarding.meetings, ['CONFIRMED', 'ATTENDED', 'WAIVED']),
      total: preboarding.meetings.length,
    },
    {
      label: 'First-day information',
      description: 'Read and confirm reporting instructions.',
      href: '/candidate/preboarding/reporting-information',
      icon: Info,
      done: preboarding.infoItems.filter((item: any) => item.acknowledged).length,
      total: preboarding.infoItems.length,
    },
  ]
  const assignedCategories = categories.filter((category) => category.total > 0)

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header />

      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-5xl space-y-6">
          <PageIntro
            eyebrow="Your offer"
            title="Before you start"
            description={`${preboarding.vacancyTitle}${preboarding.vacancyReference ? ` · ${preboarding.vacancyReference}` : ''}`}
            actions={
              <div className="text-right">
                <span className="text-xs font-semibold text-stone-500">Complete</span>
                <span className="block text-3xl font-semibold tracking-[-.04em] text-navy-900">
                  {preboarding.overallCompletionPercentage}%
                </span>
              </div>
            }
          />
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-stone-200"
            aria-label={`${preboarding.overallCompletionPercentage}% complete`}
          >
            <div
              className="h-full rounded-full bg-brand-700 transition-all duration-500"
              style={{ width: `${preboarding.overallCompletionPercentage}%` }}
            />
          </div>

          <section id="start-date" aria-labelledby="first-day-heading" className="section-panel scroll-mt-24">
            <div className="section-heading">
              <div>
                <h2 id="first-day-heading" className="text-lg font-semibold text-navy-900">
                  Your first day
                </h2>
                <p className="mt-1 text-sm text-stone-600">Confirm the date and check where to report.</p>
              </div>
            </div>
            <div className="grid divide-y divide-stone-200 md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="px-5 py-5 sm:px-6">
                <p className="field-label">Agreed start date</p>
                <p className="text-base font-semibold text-navy-900">
                  {startDate
                    ? new Date(`${startDate}T12:00:00`).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Not yet set'}
                </p>
                {startDate && !preboarding.confirmedStartDate && (
                  <button
                    type="button"
                    onClick={confirmStartDate}
                    disabled={confirmingDate}
                    className="btn-primary mt-3"
                  >
                    {confirmingDate ? 'Confirming…' : 'Confirm this date'}
                  </button>
                )}
                {preboarding.confirmedStartDate && (
                  <span className="status-chip mt-3 bg-emerald-50 text-emerald-800">Confirmed</span>
                )}
                {notice && (
                  <p role="status" className="mt-2 text-xs font-semibold text-brand-700">
                    {notice}
                  </p>
                )}
                <p className="mt-3 text-xs leading-5 text-stone-500">
                  Need a different date?{' '}
                  <Link
                    href="/candidate/messages"
                    className="font-semibold text-brand-800 underline underline-offset-4"
                  >
                    Message the recruitment team
                  </Link>
                  .
                </p>
              </div>

              <div className="px-5 py-5 sm:px-6">
                <p className="field-label">Reporting location</p>
                <p className="flex items-start gap-2 text-sm font-semibold leading-6 text-navy-900">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-brand-700" />
                  {preboarding.reportingLocation || 'The recruitment team will confirm this with you.'}
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="checklist-heading" className="section-panel">
            <div className="section-heading">
              <div>
                <h2 id="checklist-heading" className="text-lg font-semibold text-navy-900">
                  Checklist
                </h2>
                <p className="mt-1 text-sm text-stone-600">Open a row to see and complete its items.</p>
              </div>
            </div>
            <div className="divide-y divide-stone-100">
              {assignedCategories.map((category) => {
                const Icon = category.icon
                const complete = category.total === 0 || category.done === category.total
                return (
                  <Link
                    key={category.href}
                    href={category.href}
                    className="group grid gap-3 px-5 py-4 hover:bg-stone-50 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center sm:px-6"
                  >
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-lg ${
                        complete ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-navy-900">{category.label}</h3>
                      <p className="mt-0.5 text-xs text-stone-500">{category.description}</p>
                    </div>
                    <span className={`text-xs font-semibold ${complete ? 'text-emerald-700' : 'text-stone-700'}`}>
                      {category.total ? `${category.done} of ${category.total}` : 'Nothing assigned'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
                  </Link>
                )
              })}
              {assignedCategories.length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-stone-600">
                  No forms, documents, courses or meetings have been assigned.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
