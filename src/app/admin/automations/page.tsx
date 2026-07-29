import { redirect } from 'next/navigation'
import AutomationManager from '@/components/admin/AutomationManager'
import { getVerifiedUser } from '@/lib/auth'
import { canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'

export default async function AutomationsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (user.roles.includes('SYSTEM_ADMIN')) redirect('/admin/system-settings')
  if (!canRunRecruitmentOperations(user.roles)) redirect('/recruitment/dashboard')
  return (
    <div className="page-shell space-y-7">
      <div className="page-intro">
        <h1 className="page-title">Scheduled work</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Check reminders and timed actions, or stop a schedule when it is not safe to run.
        </p>
      </div>
      <AutomationManager canActivate={user.roles.includes('HR_MANAGER')} />
    </div>
  )
}
