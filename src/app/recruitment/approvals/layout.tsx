import { redirect } from 'next/navigation'
import { getVerifiedUser } from '@/lib/auth'

const APPROVAL_WORKSPACE_ROLES = new Set(['RECRUITMENT_OFFICER', 'HR_MANAGER', 'HIRING_MANAGER', 'APPROVER'])

export default async function ApprovalsLayout({ children }: { children: React.ReactNode }) {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login?returnTo=/recruitment/approvals')
  if (user.roles.includes('SYSTEM_ADMIN')) redirect('/admin/system-settings')
  if (!user.roles.some((role) => APPROVAL_WORKSPACE_ROLES.has(role))) redirect('/recruitment/dashboard')
  return children
}
