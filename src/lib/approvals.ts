import { prisma } from '@/lib/prisma'
import { AuthzError } from '@/lib/authz'

export async function findIndependentApprover(requestedBy: string, preferredRoles = ['HR_MANAGER', 'APPROVER', 'SYSTEM_ADMIN'], additionallyExcluded: string[] = []) {
  const approver = await prisma.user.findFirst({
    where: {
      id: { notIn: [requestedBy, ...additionallyExcluded] },
      accountStatus: 'ACTIVE',
      userRoles: { some: { role: { name: { in: preferredRoles } } } },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (!approver) throw new AuthzError('No independent approver is configured for this decision', 409)
  return approver.id
}
