import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import ExceptionReviewQueue from '@/components/recruitment/ExceptionReviewQueue'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { hasStaffRole } from '@/lib/roles'
import { PageIntro } from '@/components/ui/PageElements'

/**
 * §11.5 The exception-review queue.
 *
 * This is the only place a human needs to look after an automatic run: the
 * applications the engine marked unclear, incomplete or duplicated.
 */
export default async function ExceptionReviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = searchParams ? await searchParams : {}
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')

  const [canReview, canOverride] = await Promise.all([
    hasPermission(user.userId, 'longlist.review'),
    hasPermission(user.userId, 'longlist.override'),
  ])
  if (!canReview) redirect('/recruitment/dashboard')

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8">
        <div className="page-shell max-w-5xl space-y-7">
          <PageIntro
            eyebrow="Screen and shortlist"
            title="Exception review"
            description="Applications the rules could not settle on their own — usually an equivalent qualification, a conflicting answer, or a document that arrived late."
          />
          <ExceptionReviewQueue
            initialVacancyId={typeof query.vacancy === 'string' ? query.vacancy : ''}
            canOverride={canOverride}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
