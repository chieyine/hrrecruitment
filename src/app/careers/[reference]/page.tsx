import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Building2, CalendarDays, Check, MapPin } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { formatDate } from '@/lib/utils'

export async function generateMetadata(props: { params: Promise<{ reference: string }> }): Promise<Metadata> {
  const params = await props.params
  const vacancy = await prisma.vacancy.findUnique({
    where: { referenceNumber: decodeURIComponent(params.reference) },
    select: { title: true, summary: true },
  })
  return vacancy ? { title: vacancy.title, description: vacancy.summary } : { title: 'Vacancy' }
}

export default async function VacancyDetailPage(props: { params: Promise<{ reference: string }> }) {
  const params = await props.params
  const user = await getVerifiedUser()
  const vacancy = await prisma.vacancy.findUnique({
    where: { referenceNumber: decodeURIComponent(params.reference) },
    include: {
      department: true,
      dutyStation: true,
      project: true,
      requiredDocuments: true,
      questions: { orderBy: { displayOrder: 'asc' } },
    },
  })

  if (!vacancy || vacancy.status !== 'OPEN') notFound()

  const isCandidate = Boolean(user?.roles.includes('CANDIDATE'))
  const existingApplication = isCandidate
    ? await prisma.application.findFirst({
        where: { vacancyId: vacancy.id, candidate: { userId: user!.userId } },
        select: { id: true, internalStatus: true },
      })
    : null
  const applyHref = !user
    ? '/auth/login'
    : existingApplication?.internalStatus === 'DRAFT'
      ? `/candidate/applications/apply?vacancyId=${vacancy.id}`
      : existingApplication
        ? `/candidate/applications/${existingApplication.id}`
        : `/candidate/applications/apply?vacancyId=${vacancy.id}`
  const applyLabel = !user
    ? 'Sign in to apply'
    : existingApplication?.internalStatus === 'DRAFT'
      ? 'Continue application'
      : existingApplication
        ? 'View application'
        : 'Start application'

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1">
        <header className="border-b border-[#d9d4ca] bg-[#ebe6dc]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <Link href="/careers" className="inline-flex items-center gap-2 text-xs font-bold text-brand-800">
              <ArrowLeft className="h-3.5 w-3.5" /> All open roles
            </Link>
            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-end">
              <div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#627067]">
                  <span>{vacancy.referenceNumber}</span>
                  <span>{vacancy.contractType.replaceAll('_', ' ')}</span>
                  {vacancy.contractDuration && <span>{vacancy.contractDuration}</span>}
                </div>
                <h1 className="editorial-title mt-4 max-w-4xl text-4xl text-[#17211c] sm:text-5xl lg:text-6xl">
                  {vacancy.title}
                </h1>
              </div>
              <p className="border-l-2 border-[#d4875f] pl-4 text-sm leading-6 text-[#526158]">
                Applications close <strong className="text-[#8e4728]">{formatDate(vacancy.closingAt)}</strong>.
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_300px] lg:px-8 lg:py-16">
          <article className="min-w-0">
            <dl className="grid gap-px border border-[#d9d4ca] bg-[#d9d4ca] sm:grid-cols-3">
              <div className="bg-[#fbfaf7] p-5">
                <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#6b776f]">
                  <Building2 className="h-3.5 w-3.5" /> Team
                </dt>
                <dd className="mt-2 text-sm font-bold text-[#26352d]">{vacancy.department.name}</dd>
              </div>
              <div className="bg-[#fbfaf7] p-5">
                <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#6b776f]">
                  <MapPin className="h-3.5 w-3.5" /> Duty station
                </dt>
                <dd className="mt-2 text-sm font-bold text-[#26352d]">
                  {vacancy.dutyStation.name}, {vacancy.dutyStation.state}
                </dd>
              </div>
              <div className="bg-[#fbfaf7] p-5">
                <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#6b776f]">
                  <CalendarDays className="h-3.5 w-3.5" /> Published
                </dt>
                <dd className="mt-2 text-sm font-bold text-[#26352d]">{formatDate(vacancy.openingAt)}</dd>
              </div>
            </dl>

            <section className="border-b border-[#d9d4ca] py-9">
              <h2 className="font-display text-3xl text-[#17211c]">About the role</h2>
              <p className="mt-5 whitespace-pre-line text-[15px] leading-7 text-[#46544c]">{vacancy.summary}</p>
            </section>

            <section className="border-b border-[#d9d4ca] py-9">
              <h2 className="font-display text-3xl text-[#17211c]">Responsibilities</h2>
              <div className="mt-5 whitespace-pre-line text-[15px] leading-7 text-[#46544c]">
                {vacancy.responsibilities}
              </div>
            </section>

            <section className="border-b border-[#d9d4ca] py-9">
              <h2 className="font-display text-3xl text-[#17211c]">What you will need</h2>
              <div className="mt-6 grid gap-7 md:grid-cols-2">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#68756d]">
                    Essential qualifications
                  </h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#46544c]">
                    {vacancy.essentialQualifications}
                  </p>
                  {vacancy.desirableQualifications && (
                    <>
                      <h3 className="mt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[#68756d]">
                        Desirable
                      </h3>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#46544c]">
                        {vacancy.desirableQualifications}
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#68756d]">Experience</h3>
                  <p className="mt-3 text-sm leading-6 text-[#46544c]">
                    At least {vacancy.minimumExperienceYears} {vacancy.minimumExperienceYears === 1 ? 'year' : 'years'}{' '}
                    of relevant experience.
                  </p>
                  {vacancy.desiredExperience && (
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#46544c]">
                      {vacancy.desiredExperience}
                    </p>
                  )}
                  {vacancy.technicalSkills && (
                    <>
                      <h3 className="mt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[#68756d]">
                        Technical skills
                      </h3>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#46544c]">
                        {vacancy.technicalSkills}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </section>

            {vacancy.requiredDocuments.length > 0 && (
              <section className="py-9">
                <h2 className="font-display text-3xl text-[#17211c]">Documents</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {vacancy.requiredDocuments.map((document) => (
                    <li
                      key={document.id}
                      className="flex items-start gap-3 border border-[#d9d4ca] bg-[#fbfaf7] p-4 text-sm text-[#46544c]"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                      <span>
                        {document.documentType.replaceAll('_', ' ')}
                        {document.required ? ' — required' : ' — optional'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          <aside>
            <div className="sticky top-28 border-t-4 border-brand-800 bg-[#fbfaf7] p-6 shadow-soft">
              <h2 className="font-display text-2xl text-[#17211c]">Apply for this role</h2>
              <p className="mt-3 text-xs leading-5 text-[#617067]">
                {!user
                  ? 'Sign in or create an account to begin.'
                  : !isCandidate
                    ? 'Applications must be submitted from a candidate account.'
                    : existingApplication?.internalStatus === 'DRAFT'
                      ? 'You have a saved draft for this role.'
                      : existingApplication
                        ? 'You have already applied for this role.'
                        : 'Your saved profile will be used to start the application.'}
              </p>
              {(!user || isCandidate) && (
                <Link
                  href={applyHref}
                  className="mt-6 flex items-center justify-between bg-brand-800 px-4 py-3.5 text-sm font-bold text-white hover:bg-brand-950"
                >
                  {applyLabel} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <div className="mt-6 border-t border-[#d9d4ca] pt-5 text-xs leading-5 text-[#617067]">
                FRAD does not charge application or recruitment fees.
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}
