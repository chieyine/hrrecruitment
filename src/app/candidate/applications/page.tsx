import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, FileText } from 'lucide-react'
import { candidateFacingStatus, candidateStatusLabel } from '@/lib/candidate-status'

export default async function CandidateApplicationsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.userId },
  })

  // Never pass an undefined candidate id to Prisma: omitted filters would turn
  // this candidate page into an all-applications query.
  const applications = profile ? await prisma.application.findMany({
    where: { candidateId: profile.id },
    include: {
      vacancy: {
        include: { department: true, dutyStation: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  }) : []

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 lg:px-8">
          <Link
            href="/candidate/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>

          <section>
            <div className="flex items-end justify-between border-b border-[#cfc9bd] pb-5">
              <div>
                <h1 className="font-display text-4xl text-[#17211c]">Applications</h1>
                <p className="mt-2 text-sm text-[#617067]">Saved drafts and applications you have sent.</p>
              </div>

              <Link
                href="/careers"
                className="bg-brand-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-950"
              >
                Find a vacancy
              </Link>
            </div>

            {applications.length === 0 ? (
              <div className="border-b border-[#cfc9bd] py-16 text-center text-sm text-[#617067]">
                <FileText className="mx-auto h-10 w-10 text-[#9aa49e]" />
                <p className="mt-3 font-bold text-[#26352d]">You have not started an application.</p>
                <p className="mt-1">Open a vacancy to begin.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#d9d4ca] border-b border-[#d9d4ca]">
                {applications.map((app) => {
                  const status = candidateFacingStatus(app.internalStatus, app.candidateVisibleStatus)
                  const isDraft = status === 'APPLICATION_DRAFT'

                  return (
                    <article key={app.id} data-testid="candidate-application-card" className="grid gap-5 bg-white/55 px-5 py-7 sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-[#647169]">
                          {app.vacancy.referenceNumber}
                        </span>
                        <h2 className="mt-1 font-display text-2xl text-[#17211c]">{app.vacancy.title}</h2>
                        <p className="mt-1 text-xs text-[#617067]">{app.vacancy.department.name} · {app.vacancy.dutyStation.name}</p>
                        <p className="mt-4 text-xs text-[#617067]">{isDraft ? `Last saved ${formatDate(app.updatedAt)}` : `Received ${formatDate(app.submittedAt || app.updatedAt)}`}</p>
                      </div>

                      <div className="md:text-right">
                        <p className={`text-xs font-bold ${isDraft ? 'text-amber-800' : 'text-brand-800'}`}>{candidateStatusLabel(status)}</p>
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs md:justify-end">
                          <Link href={isDraft ? `/candidate/applications/apply?vacancyId=${app.vacancy.id}` : `/candidate/applications/${app.id}`} className="font-bold text-blue-700 hover:underline">
                            {isDraft ? 'Continue application' : 'View application'}
                          </Link>
                          <Link href={`/careers/${encodeURIComponent(app.vacancy.referenceNumber)}`} className="font-bold text-[#526158] hover:underline">
                            Vacancy details
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
