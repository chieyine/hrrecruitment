import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Award, Briefcase, FileText, GraduationCap, Pencil, UserRound } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import ProfileAdditionalDetails from '@/components/shared/ProfileAdditionalDetails'
import { PageIntro } from '@/components/ui/PageElements'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { profileCompletion } from '@/lib/profile-completion'

const sectionLinks = [
  { href: '/candidate/profile/personal', label: 'Personal details', icon: UserRound },
  { href: '/candidate/profile/education', label: 'Education', icon: GraduationCap },
  { href: '/candidate/profile/employment', label: 'Employment', icon: Briefcase },
  { href: '/candidate/profile/licences', label: 'Licences', icon: Award },
  { href: '/candidate/profile/documents', label: 'Documents', icon: FileText },
]

export default async function CandidateProfilePage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.userId },
    include: {
      education: { orderBy: [{ completionYear: 'desc' }, { startYear: 'desc' }] },
      employment: { orderBy: { startDate: 'desc' } },
      licences: true,
      documents: true,
      skills: { orderBy: { name: 'asc' } },
      languages: { orderBy: { language: 'asc' } },
      certifications: { orderBy: { name: 'asc' } },
    },
  })
  const completion = profileCompletion(profile)
  const candidateName = [profile?.legalFirstName, profile?.middleName, profile?.lastName].filter(Boolean).join(' ')

  return (
    <div className="flex min-h-screen flex-col bg-stone-100">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="page-shell max-w-5xl space-y-6">
          <Link
            href="/candidate/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to your account
          </Link>

          <PageIntro
            eyebrow="Your profile"
            title={candidateName || 'Build your candidate profile'}
            description="Keep your contact details, work history and qualifications in one place. Each application records a fixed copy when you submit."
            actions={
              <Link href="/candidate/profile/personal" className="btn-primary">
                <Pencil className="h-4 w-4" /> Edit profile
              </Link>
            }
          />

          <section
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
            aria-labelledby="profile-readiness"
          >
            <div className="grid lg:grid-cols-[230px_1fr]">
              <div className="bg-brand-950 p-7 text-white">
                <p id="profile-readiness" className="text-xs font-bold uppercase tracking-[0.14em] text-brand-200">
                  Profile readiness
                </p>
                <p className="mt-4 text-5xl font-semibold tracking-tight">{completion.percentage}%</p>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-[#d89a72]" style={{ width: `${completion.percentage}%` }} />
                </div>
                <p className="mt-5 text-xs leading-5 text-brand-100">
                  {completion.missing.length
                    ? `Still to add: ${completion.missing.slice(0, 4).join(', ')}.`
                    : 'Your core profile information is complete.'}
                </p>
              </div>
              <nav aria-label="Profile sections" className="grid sm:grid-cols-2">
                {sectionLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex min-h-20 items-center justify-between border-b border-stone-200 px-5 py-4 transition hover:bg-stone-50 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0"
                  >
                    <span className="flex items-center gap-3 text-sm font-bold text-stone-900">
                      <Icon className="h-4 w-4 text-brand-700" />
                      {label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-stone-400 transition group-hover:translate-x-1 group-hover:text-brand-700" />
                  </Link>
                ))}
              </nav>
            </div>
          </section>

          <section className="section-panel" aria-labelledby="candidate-record">
            <div className="section-heading">
              <div>
                <p className="editorial-kicker">Reusable record</p>
                <h2 id="candidate-record" className="mt-2 text-2xl font-semibold text-stone-950">
                  Experience and qualifications
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-stone-600">
                This is the information recruitment teams see when it is included in an application.
              </p>
            </div>

            <div className="divide-y divide-stone-200">
              <RecordSection
                title="Employment"
                href="/candidate/profile/employment"
                empty="No employment history added."
              >
                {profile?.employment.map((item) => (
                  <article key={item.id} className="grid gap-1 py-5 sm:grid-cols-[1fr_auto] sm:gap-6">
                    <div>
                      <h3 className="font-bold text-stone-950">{item.jobTitle}</h3>
                      <p className="mt-1 text-sm text-stone-600">
                        {item.employer} · {item.country}
                      </p>
                      {item.responsibilities && (
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">{item.responsibilities}</p>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-stone-500">
                      {new Date(item.startDate).getFullYear()}–
                      {item.isCurrent ? 'Present' : item.endDate ? new Date(item.endDate).getFullYear() : ''}
                    </p>
                  </article>
                ))}
              </RecordSection>

              <RecordSection title="Education" href="/candidate/profile/education" empty="No education history added.">
                {profile?.education.map((item) => (
                  <article key={item.id} className="grid gap-1 py-5 sm:grid-cols-[1fr_auto] sm:gap-6">
                    <div>
                      <h3 className="font-bold text-stone-950">
                        {item.qualification} in {item.fieldOfStudy}
                      </h3>
                      <p className="mt-1 text-sm text-stone-600">
                        {item.institution} · {item.country}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-stone-500">
                      {item.startYear}–{item.completionYear}
                    </p>
                  </article>
                ))}
              </RecordSection>

              <RecordSection
                title="Professional licences"
                href="/candidate/profile/licences"
                empty="No licences or certifications added."
              >
                {profile?.licences.map((item) => (
                  <article key={item.id} className="py-5">
                    <h3 className="font-bold text-stone-950">{item.licenceType}</h3>
                    <p className="mt-1 text-sm text-stone-600">
                      {item.professionalBody}
                      {item.licenceNumber ? ` · ${item.licenceNumber}` : ''}
                    </p>
                  </article>
                ))}
              </RecordSection>
            </div>
          </section>

          <ProfileAdditionalDetails
            initialData={{
              skills: profile?.skills || [],
              languages: profile?.languages || [],
              certifications: profile?.certifications || [],
            }}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}

function RecordSection({
  title,
  href,
  empty,
  children,
}: {
  title: string
  href: string
  empty: string
  children: React.ReactNode
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return (
    <section className="py-6 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.13em] text-stone-500">{title}</h3>
        <Link href={href} className="text-xs font-bold text-brand-700 hover:text-brand-900">
          Edit
        </Link>
      </div>
      {hasChildren ? (
        <div className="divide-y divide-stone-100">{children}</div>
      ) : (
        <p className="py-5 text-sm text-stone-500">{empty}</p>
      )}
    </section>
  )
}
