import { redirect } from 'next/navigation'
import GovernanceManager from '@/components/admin/GovernanceManager'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'

export default async function GovernancePage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!(await hasPermission(user.userId, 'governance.manage'))) redirect('/recruitment/dashboard')
  return <GovernanceManager />
}
