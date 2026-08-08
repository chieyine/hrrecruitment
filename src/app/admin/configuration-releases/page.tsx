import { redirect } from 'next/navigation'
import ConfigurationReleaseManager from '@/components/admin/ConfigurationReleaseManager'
import { getVerifiedUser } from '@/lib/auth'

export default async function ConfigurationReleasesPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('HR_MANAGER')) redirect('/recruitment/dashboard')
  return (
    <div className="page-shell space-y-7">
      <div className="page-intro">
        <h1 className="page-title">Review drafts</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Compare proposed template or course changes with the current version before they take effect.
        </p>
      </div>
      <ConfigurationReleaseManager userId={user.userId} />
    </div>
  )
}
