import { redirect } from 'next/navigation'
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
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />

      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-4xl space-y-6">
          <PageIntro
            title="Account security"
            description="Manage two-factor authentication, recovery codes and signed-in devices."
          />

          <SecuritySettings />
        </div>
      </main>

      <Footer />
    </div>
  )
}
