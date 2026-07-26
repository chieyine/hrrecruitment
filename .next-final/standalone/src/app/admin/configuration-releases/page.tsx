import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import ConfigurationReleaseManager from '@/components/admin/ConfigurationReleaseManager'
import { getVerifiedUser } from '@/lib/auth'

export default async function ConfigurationReleasesPage() {
  const user = await getVerifiedUser()
  if (!user?.roles.includes('SYSTEM_ADMIN')) redirect('/auth/login')
  return <div className="flex min-h-screen flex-col bg-stone-50"><Header currentUser={user}/><main id="main-content" className="flex-1 py-8"><div className="page-shell space-y-7"><div className="page-intro"><p className="editorial-kicker">Controlled configuration</p><h1 className="page-title">Configuration releases</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Compare drafts, obtain independent approval, publish on an effective date, and roll back safely.</p></div><ConfigurationReleaseManager userId={user.userId}/></div></main><Footer/></div>
}
