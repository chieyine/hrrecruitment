import { redirect } from 'next/navigation'
import ApplicationsRegister from '@/components/recruitment/ApplicationsRegister'
import { getVerifiedUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'

export default async function MasterApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ vacancyId?: string }>
}) {
  const query = await searchParams
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login?next=/recruitment/applications')
  const [readAll, readAssigned, canManage] = await Promise.all([
    hasPermission(user.userId, 'application.read.all'),
    hasPermission(user.userId, 'application.read.assigned'),
    hasPermission(user.userId, 'application.stage.change'),
  ])
  if (!readAll && !readAssigned) redirect('/recruitment/dashboard')
  return <ApplicationsRegister initialVacancyId={query.vacancyId?.trim() || ''} canManage={canManage} />
}
