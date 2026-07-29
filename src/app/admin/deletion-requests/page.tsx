import { redirect } from 'next/navigation'
import { getVerifiedUser } from '@/lib/auth'
import PrivacyRequestManager from '@/components/admin/PrivacyRequestManager'

export default async function DeletionRequestsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('SYSTEM_ADMIN')) redirect('/recruitment/dashboard')

  return <PrivacyRequestManager />
}
