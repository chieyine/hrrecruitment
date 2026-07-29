import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { ArrowLeft, MapPin } from 'lucide-react'
import { SimpleAction } from '@/components/shared/PreboardingActions'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function CandidateReportingInfoPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const pb = await getMyPreboarding(user.userId)
  const items = pb?.infoItems ?? []

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-5xl space-y-6">
          <Link
            href="/candidate/preboarding"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" /> Before you start
          </Link>
          <PageIntro
            eyebrow="Before you start"
            title="First-day information"
            description="Practical details about where to go, who to meet and what to bring."
          />
          {items.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No first-day information yet"
              description="The recruitment team will add the details when they are confirmed."
            />
          ) : (
            <section className="section-panel divide-y divide-stone-200">
              {items.map((it) => (
                <article id={`information-${it.id}`} key={it.id} className="scroll-mt-24 px-5 py-5 sm:px-6">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {it.category.replaceAll('_', ' ').toLowerCase()}
                  </span>
                  <h2 className="mt-1 text-lg font-semibold text-navy-900">{it.title}</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-700">{it.content}</p>
                  {it.acknowledgementRequired && !it.acknowledgedAt && (
                    <SimpleAction resourceId={it.id} action="INFO_ACKNOWLEDGE" label="Confirm I have read this" />
                  )}
                  {it.acknowledgedAt && (
                    <p className="mt-4 text-xs font-semibold text-emerald-700">Read {formatDate(it.acknowledgedAt)}</p>
                  )}
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
