import { redirect } from 'next/navigation'
import { getVerifiedUser } from '@/lib/auth'
import { PageIntro } from '@/components/ui/PageElements'
import FraudReportTriage from '@/components/admin/FraudReportTriage'

/**
 * Triage queue for reports submitted through the public /report-fraud form.
 * Restricted to the two roles the API also enforces.
 */
export default async function FraudReportsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.some((role) => role === 'SYSTEM_ADMIN' || role === 'HR_MANAGER')) {
    redirect('/recruitment/work')
  }

  return (
    <div className="page-shell max-w-5xl space-y-6">
      <PageIntro
        eyebrow="Confidential"
        title="Recruitment fraud reports"
        description="Reports submitted by the public about people impersonating FRAD or asking candidates for money. Record what was decided on every report you close."
      />
      <FraudReportTriage />
    </div>
  )
}
