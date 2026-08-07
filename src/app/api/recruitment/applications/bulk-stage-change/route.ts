import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import {
  canTransitionApplication,
  candidateVisibleStatusForInternal,
  isGenericApplicationStage,
} from '@/lib/state-machine'
import { logAudit } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'
import { assignedApplicationWhere } from '@/lib/recruitment-access'

export async function POST(request: Request) {
  try {
    const user = await requirePermission('application.stage.change')
    const { applicationIds, toStatus, reason, previewOnly } = await parseBody(
      request,
      z.object({
        applicationIds: z.array(z.string()).min(1).max(100),
        toStatus: z.string().min(1),
        reason: z.string().trim().min(3).max(1000),
        previewOnly: z.boolean().optional(),
      })
    )
    if (!isGenericApplicationStage(toStatus))
      throw new AuthzError('This outcome must be recorded through its dedicated workflow', 409)
    const readAll = await hasPermission(user.userId, 'application.read.all')
    const applications = await prisma.application.findMany({
      where: {
        id: { in: applicationIds },
        ...(readAll ? {} : assignedApplicationWhere(user.userId)),
      },
      include: {
        candidate: { select: { legalFirstName: true, lastName: true } },
        vacancy: { select: { title: true, referenceNumber: true } },
      },
    })
    const foundIds = new Set(applications.map((application) => application.id))
    const eligible = applications.filter((application) =>
      canTransitionApplication(application.internalStatus, toStatus)
    )
    const invalid = [
      ...applications
        .filter((application) => !canTransitionApplication(application.internalStatus, toStatus))
        .map((application) => ({
          id: application.id,
          candidate: `${application.candidate.legalFirstName} ${application.candidate.lastName}`,
          vacancy: application.vacancy.referenceNumber,
          reason: `Cannot move from ${application.internalStatus.replaceAll('_', ' ')} to ${toStatus.replaceAll('_', ' ')}`,
        })),
      ...applicationIds
        .filter((id) => !foundIds.has(id))
        .map((id) => ({ id, candidate: 'Unknown', vacancy: '', reason: 'Application not found' })),
    ]
    if (previewOnly) {
      return Response.json({
        preview: true,
        requested: applicationIds.length,
        eligible: eligible.map((application) => ({
          id: application.id,
          candidate: `${application.candidate.legalFirstName} ${application.candidate.lastName}`,
          vacancy: application.vacancy.referenceNumber,
          fromStatus: application.internalStatus,
        })),
        invalid,
        toStatus,
      })
    }
    if (applications.length !== new Set(applicationIds).size)
      throw new AuthzError('One or more applications were not found', 404)
    if (invalid.length)
      throw new AuthzError(
        'The selection contains applications that cannot make this stage change. Preview the action and remove invalid records.',
        422
      )
    const run = await prisma.$transaction(async (tx) => {
      const undoRecords: Array<Record<string, unknown>> = []
      for (const application of applications) {
        const changed = await tx.application.updateMany({
          where: {
            id: application.id,
            internalStatus: application.internalStatus,
            lockVersion: application.lockVersion,
          },
          data: {
            internalStatus: toStatus,
            candidateVisibleStatus: candidateVisibleStatusForInternal(toStatus),
            lockVersion: { increment: 1 },
          },
        })
        if (changed.count !== 1)
          throw new AuthzError(`Application ${application.id} changed; refresh and try again`, 409)
        undoRecords.push({
          applicationId: application.id,
          previousStatus: application.internalStatus,
          changedStatus: toStatus,
          changedLockVersion: application.lockVersion + 1,
        })
        await tx.applicationStageHistory.create({
          data: {
            applicationId: application.id,
            fromStatus: application.internalStatus,
            toStatus,
            changedBy: user.userId,
            reason,
          },
        })
      }
      return tx.bulkActionRun.create({
        data: {
          actionType: 'STAGE_CHANGE',
          requestedBy: user.userId,
          requestedCount: applicationIds.length,
          eligibleCount: applications.length,
          failedCount: 0,
          status: 'COMPLETED',
          requestJson: JSON.stringify({ applicationIds, toStatus, reason }),
          resultJson: JSON.stringify({ undoRecords }),
          reversibleUntil: new Date(Date.now() + 15 * 60_000),
        },
      })
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'APPLICATION_BULK_STAGE_CHANGED',
      resourceType: 'Application',
      resourceId: run.id,
      reason,
      newValue: { toStatus, count: applications.length },
    })
    return Response.json({ success: true, count: applications.length, runId: run.id, reversibleUntil: run.reversibleUntil })
  } catch (error) {
    return authzResponse(error)
  }
}
