import { redirect } from 'next/navigation'
import OperatingModelManager from '@/components/admin/OperatingModelManager'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function OperatingModelPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.includes('HR_MANAGER')) {
    redirect(user.roles.includes('SYSTEM_ADMIN') ? '/admin/system-settings' : '/recruitment/dashboard')
  }
  const [policies, changes] = await Promise.all([
    prisma.slaPolicy.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.configurationChangeRequest.findMany({
      where: { changeType: 'SLA_POLICY_UPDATE' },
      orderBy: { requestedAt: 'desc' },
      take: 200,
    }),
  ])

  return <OperatingModelManager policies={policies} changes={changes} currentUserId={user.userId} />
}
