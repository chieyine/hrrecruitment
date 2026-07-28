import { redirect } from 'next/navigation'
import AutomationManager from '@/components/admin/AutomationManager'
import { getVerifiedUser } from '@/lib/auth'

export default async function AutomationsPage() {
  const user = await getVerifiedUser()
  if (!user || !user.roles.some((role) => ['SYSTEM_ADMIN', 'HR_MANAGER'].includes(role))) redirect('/auth/login')
  return (
    <div className="page-shell space-y-7">
      <div className="page-intro">
        <p className="editorial-kicker">Scheduled work</p>
        <h1 className="page-title">Automation controls</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Check, pause or turn on reminders and scheduled tasks. Every run remains in the audit record.
        </p>
      </div>
      <AutomationManager />
    </div>
  )
}
