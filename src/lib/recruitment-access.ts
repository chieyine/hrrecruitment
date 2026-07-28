import { prisma } from './prisma'
import { hasPermission } from './rbac'

export interface ApplicationAccess {
  readAll: boolean
  assigned: boolean
  panelMember: boolean
  vacancyOwner: boolean
  assignedReviewer: boolean
}

/**
 * Resolve access against the concrete application. Permission checks alone are
 * insufficient for assigned roles because a caller could otherwise supply an
 * arbitrary application id.
 */
export async function applicationAccess(userId: string, applicationId: string): Promise<ApplicationAccess> {
  const [readAll, mayReadAssigned, application] = await Promise.all([
    hasPermission(userId, 'application.read.all'),
    hasPermission(userId, 'application.read.assigned'),
    prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        assignedReviewerId: true,
        vacancy: { select: { ownerUserId: true } },
        interviews: {
          where: { panelMembers: { some: { userId } } },
          select: { id: true },
          take: 1,
        },
      },
    }),
  ])
  if (!application)
    return { readAll, assigned: false, panelMember: false, vacancyOwner: false, assignedReviewer: false }
  const panelMember = application.interviews.length > 0
  const vacancyOwner = application.vacancy.ownerUserId === userId
  const assignedReviewer = application.assignedReviewerId === userId
  return {
    readAll,
    panelMember,
    vacancyOwner,
    assignedReviewer,
    assigned: mayReadAssigned && (panelMember || vacancyOwner || assignedReviewer),
  }
}

export function assignedApplicationWhere(userId: string) {
  return {
    OR: [
      { assignedReviewerId: userId },
      { vacancy: { ownerUserId: userId } },
      { interviews: { some: { panelMembers: { some: { userId } } } } },
    ],
  }
}
