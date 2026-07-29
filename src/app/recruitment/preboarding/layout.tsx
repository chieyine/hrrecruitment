import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'

export default async function RecruitmentPreboardingLayout({ children }: { children: ReactNode }) {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!canRunRecruitmentOperations(user.roles) || !(await hasPermission(user.userId, 'preboarding.manage'))) {
    redirect('/recruitment/dashboard')
  }
  return children
}
