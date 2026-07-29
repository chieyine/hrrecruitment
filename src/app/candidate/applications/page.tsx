import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, FileText } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { candidateFacingStatus, candidateStatusLabel } from '@/lib/candidate-status'
import DeleteDraftButton from './DeleteDraftButton'
import { homeRouteForRoles } from '@/lib/home-route'

export default async function CandidateApplicationsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('CANDIDATE')) redirect(homeRouteForRoles(user.roles))

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.userId },
  })

  // An absent profile must return an empty list. Omitting candidateId here
  // would expose applications belonging to other candidates.
  const applications = profile
    ? await prisma.application.findMany({
        where: { candidateId: profile.id },
        include: {
          vacancy: {
            include: { department: true, dutyStation: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    : []

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-6xl space-y-6">
          <PageIntro
            eyebrow="Candidate account"
            title="Applications"
            description="Draft applications and roles you have applied for."
            actions={
              <Link href="/careers" className="btn-primary">
                Find a role <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />

          {applications.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="You have not started an application"
              description="Browse the open roles and start an application when you find the right one."
              action={{ href: '/careers', label: 'View open roles' }}
            />
          ) : (
            <section aria-label="Your applications" className="section-panel">
              <div className="divide-y divide-stone-100">
                {applications.map((app) => {
                  const status = candidateFacingStatus(app.internalStatus, app.candidateVisibleStatus)
                  const isDraft = status === 'APPLICATION_DRAFT'
                  const now = new Date()
                  const roleIsPublic =
                    app.vacancy.status === 'OPEN' && app.vacancy.openingAt <= now && app.vacancy.closingAt > now
                  const href = isDraft
                    ? `/candidate/applications/apply?vacancyId=${app.vacancy.id}`
                    : `/candidate/applications/${app.id}`

                  return (
                    <article
                      key={app.id}
                      data-testid="candidate-application-card"
                      className="grid gap-5 px-5 py-6 sm:px-6 md:grid-cols-[1fr_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-stone-500">
                            {app.vacancy.referenceNumber}
                          </span>
                          <span
                            className={`status-chip ${
                              isDraft
                                ? 'border-amber-200 bg-amber-50 text-amber-800'
                                : 'border-brand-200 bg-brand-50 text-brand-800'
                            }`}
                          >
                            {candidateStatusLabel(status)}
                          </span>
                        </div>
                        <Link href={href} className="group mt-2 inline-flex items-center gap-2">
                          <h2 className="truncate text-xl font-semibold tracking-[-.02em] text-navy-900 group-hover:text-brand-800">
                            {app.vacancy.title}
                          </h2>
                          <ArrowRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
                        </Link>
                        <p className="mt-1 text-sm text-stone-600">
                          {app.vacancy.department.name} · {app.vacancy.dutyStation.name},{' '}
                          {app.vacancy.dutyStation.state}
                        </p>
                        <p className="mt-3 text-xs text-stone-500">
                          {isDraft
                            ? `Last saved ${formatDate(app.updatedAt)}`
                            : `Received ${formatDate(app.submittedAt || app.updatedAt)}`}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 md:justify-end">
                        <Link href={href} className="btn-secondary min-h-10 px-4 py-2 text-xs">
                          {isDraft ? 'Continue' : 'View application'}
                        </Link>
                        {isDraft && <DeleteDraftButton applicationId={app.id} />}
                        {roleIsPublic && (
                          <Link
                            href={`/careers/${encodeURIComponent(app.vacancy.referenceNumber)}`}
                            className="text-xs font-semibold text-stone-600 hover:text-brand-800 hover:underline"
                          >
                            Role details
                          </Link>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
