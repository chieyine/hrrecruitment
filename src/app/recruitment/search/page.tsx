import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import GlobalSearch from '@/components/admin/GlobalSearch'
import { getVerifiedUser } from '@/lib/auth'
import { hasStaffRole } from '@/lib/roles'
import { PageIntro } from '@/components/ui/PageElements'

export default async function RecruitmentSearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = searchParams ? await searchParams : {}
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')
  const initialQuery = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : ''
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-6xl space-y-6">
          <PageIntro
            title="Search"
            description="Find a candidate, application or vacancy using a name, reference or contact detail."
          />
          <GlobalSearch initialQuery={initialQuery} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
