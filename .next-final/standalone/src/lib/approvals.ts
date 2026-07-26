import { prisma } from '@/lib/prisma'
import { AuthzError } from '@/lib/authz'

/**
 * Choose an approver who is independent of the requester.
 *
 * This used to be `findFirst` ordered by `createdAt: 'asc'`, which meant the
 * single oldest matching account received every independent approval in the
 * system for ever — correct for separation of duties, unusable as a workload
 * model. Selection is now round-robin on current open approvals, so the load
 * spreads while the independence rule is unchanged.
 */
export async function findIndependentApprover(
  requestedBy: string,
  preferredRoles = ['HR_MANAGER', 'APPROVER', 'SYSTEM_ADMIN'],
  additionallyExcluded: string[] = []
) {
  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: [requestedBy, ...additionallyExcluded] },
      accountStatus: 'ACTIVE',
      userRoles: { some: { role: { name: { in: preferredRoles } } } },
    },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  if (candidates.length === 0) {
    throw new AuthzError('No independent approver is configured for this decision', 409)
  }
  if (candidates.length === 1) return candidates[0].id

  // Count only work that is actually outstanding: a historically busy approver
  // should not be penalised for approvals they have already cleared.
  const open = await prisma.approval.groupBy({
    by: ['approverUserId'],
    where: { decision: 'PENDING', approverUserId: { in: candidates.map((candidate) => candidate.id) } },
    _count: { _all: true },
  })
  const loadByUser = new Map(open.map((row) => [row.approverUserId, row._count._all]))

  // Lowest open load wins; `createdAt` breaks ties so the choice stays
  // deterministic and testable rather than arbitrary.
  let chosen = candidates[0]
  let chosenLoad = loadByUser.get(chosen.id) ?? 0
  for (const candidate of candidates.slice(1)) {
    const load = loadByUser.get(candidate.id) ?? 0
    if (load < chosenLoad) {
      chosen = candidate
      chosenLoad = load
    }
  }
  return chosen.id
}
