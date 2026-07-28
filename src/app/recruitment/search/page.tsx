import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import GlobalSearch from '@/components/admin/GlobalSearch'
import { getVerifiedUser } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'
import { hasStaffRole } from '@/lib/roles'

export default async function RecruitmentSearchPage() {
  const user = await getVerifiedUser()
  if (!user || !hasStaffRole(user.roles)) redirect('/auth/login')
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
          <Link
            href="/recruitment/dashboard"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Global recruitment search</h1>
            <p className="text-sm text-slate-600">Results are limited to records your role is allowed to access.</p>
          </div>
          <GlobalSearch />
        </div>
      </main>
      <Footer />
    </div>
  )
}
