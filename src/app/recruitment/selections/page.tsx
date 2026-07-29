import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { PageIntro } from '@/components/ui/PageElements'
import SelectionWorkspace from '@/components/recruitment/SelectionWorkspace'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'

export const dynamic = 'force-dynamic'

export default async function SelectionRankingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = searchParams ? await searchParams : {}
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!canRunRecruitmentOperations(user.roles) || !(await hasPermission(user.userId, 'application.stage.change')))
    redirect('/recruitment/dashboard')

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-6xl space-y-6">
          <PageIntro
            title="Selection"
            description="Prepare the proposed outcome from the recorded scores and references."
          />
          <SelectionWorkspace initialVacancyId={typeof query.vacancy === 'string' ? query.vacancy : ''} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
