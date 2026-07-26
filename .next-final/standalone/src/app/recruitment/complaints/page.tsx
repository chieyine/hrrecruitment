import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import ComplaintCaseManager from '@/components/admin/ComplaintCaseManager'

export default async function RecruitmentComplaintsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!await hasPermission(user.userId, 'complaint.manage')) redirect('/recruitment/dashboard')
  const cases = await prisma.complaintCase.findMany({ include: { comments: { orderBy: { createdAt: 'asc' } }, attachments: true }, orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }] })
  const users = await prisma.user.findMany({ where: { accountStatus: 'ACTIVE', userRoles: { some: { role: { name: { in: ['HR_MANAGER', 'SYSTEM_ADMIN'] } } } } }, select: { id: true, email: true } })
  return <div className="flex min-h-screen flex-col bg-slate-50"><Header currentUser={user}/><main id="main-content" className="flex-1 py-10"><ComplaintCaseManager initialCases={cases} users={users}/></main><Footer/></div>
}
