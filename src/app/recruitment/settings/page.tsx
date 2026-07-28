import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { PageIntro } from '@/components/ui/PageElements'
import SecuritySettings from '@/components/shared/SecuritySettings'
import { hasStaffRole } from '@/lib/roles'

/**
 * Staff account security. Staff hold the privileged access, so this is the
 * page that matters most for two-factor enrolment.
 */
export default async function StaffSecuritySettingsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const isStaff = hasStaffRole(user.roles)
  if (!isStaff) redirect('/candidate/settings')

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-10">
        <div className="page-shell max-w-4xl space-y-6">
          <Link
            href="/recruitment/work"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to your work
          </Link>

          <PageIntro
            eyebrow="Your account"
            title="Account security"
            description="You have access to candidate records, confidential references and identity documents. Protect this account with a second factor."
          />

          <SecuritySettings />
        </div>
      </main>

      <Footer />
    </div>
  )
}
