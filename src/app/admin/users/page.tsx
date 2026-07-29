import { redirect } from 'next/navigation'
import UserManager from '@/components/admin/UserManager'
import { getVerifiedUser } from '@/lib/auth'

export default async function AdminUsersPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('SYSTEM_ADMIN')) redirect('/recruitment/dashboard')
  return <UserManager currentUserId={user.userId} />
}
