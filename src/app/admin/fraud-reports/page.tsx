import { redirect } from 'next/navigation'
import { getVerifiedUser } from '@/lib/auth'
import { PageIntro } from '@/components/ui/PageElements'
import FraudReportTriage from '@/components/admin/FraudReportTriage'
import { canMakeHrManagerDecision, canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'

/**
 * Triage queue for reports submitted through the public /report-fraud form.
 * Recruitment officers triage reports; HR managers make closure decisions.
 */
export default async function FraudReportsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (user.roles.includes('SYSTEM_ADMIN')) redirect('/admin/system-settings')
  if (!canRunRecruitmentOperations(user.roles)) redirect('/recruitment/work')

  return (
    <div className="page-shell max-w-5xl space-y-6">
      <PageIntro
        eyebrow="Recruitment integrity"
        title="Fraud reports"
        description={
          canMakeHrManagerDecision(user.roles)
            ? 'Review reports of impersonation or payment requests and record the evidence behind each closure decision.'
            : 'Check new reports of impersonation or payment requests and record the facts for manager closure.'
        }
      />
      <FraudReportTriage canClose={canMakeHrManagerDecision(user.roles)} />
    </div>
  )
}
