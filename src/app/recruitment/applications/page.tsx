import { redirect } from 'next/navigation'
import ApplicationsRegister from '@/components/recruitment/ApplicationsRegister'
import { getVerifiedUser } from '@/lib/auth'
import { allowedPermissions } from '@/lib/rbac'

export default async function MasterApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ vacancyId?: string }>
}) {
  const query = await searchParams
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login?next=/recruitment/applications')
  const permissions = await allowedPermissions(user.userId, [
    'application.read.all',
    'application.read.assigned',
    'application.stage.change',
  ])
  const readAll = permissions.has('application.read.all')
  const readAssigned = permissions.has('application.read.assigned')
  const canManage = permissions.has('application.stage.change')
  if (!readAll && !readAssigned) redirect('/recruitment/dashboard')
  return <ApplicationsRegister initialVacancyId={query.vacancyId?.trim() || ''} canManage={canManage} />
}
