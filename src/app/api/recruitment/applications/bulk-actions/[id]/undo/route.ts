import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { candidateVisibleStatusForInternal } from '@/lib/state-machine'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const run = await prisma.bulkActionRun.findUnique({ where: { id: params.id } })
    if (!run) throw new AuthzError('Bulk-action receipt not found', 404)
    if (run.requestedBy !== user.userId)
      throw new AuthzError('Only the original operator can undo this action', 403)
    if (!run.reversibleUntil || run.reversibleUntil < new Date())
      throw new AuthzError('The safe undo window has closed', 409)
    if (run.reversedAt) throw new AuthzError('This action has already been undone', 409)
    const result = JSON.parse(run.resultJson) as { undoRecords?: Array<any> }
    if (!['ASSIGN_REVIEWER', 'TALENT_POOL', 'STAGE_CHANGE'].includes(run.actionType))
      throw new AuthzError('This bulk action is not safely reversible', 409)
    await prisma.$transaction(async (tx) => {
      for (const record of result.undoRecords || []) {
        if (run.actionType === 'ASSIGN_REVIEWER') {
          const restored = await tx.application.updateMany({
            where: { id: record.applicationId, internalStatus: { notIn: ['TRANSFERRED_TO_ERP', 'ARCHIVED'] } },
            data: { assignedReviewerId: record.previousReviewerId || null, lockVersion: { increment: 1 } },
          })
          if (restored.count !== 1)
            throw new AuthzError('The recruitment file is closed; reviewer assignment can no longer be undone', 409)
        } else if (run.actionType === 'STAGE_CHANGE') {
          const restored = await tx.application.updateMany({
            where: {
              id: record.applicationId,
              internalStatus: record.changedStatus,
              lockVersion: record.changedLockVersion,
            },
            data: {
              internalStatus: record.previousStatus,
              candidateVisibleStatus: candidateVisibleStatusForInternal(record.previousStatus),
              lockVersion: { increment: 1 },
            },
          })
          if (restored.count !== 1)
            throw new AuthzError('An application changed after the bulk action; undo is no longer safe', 409)
          await tx.applicationStageHistory.create({
            data: {
              applicationId: record.applicationId,
              fromStatus: record.changedStatus,
              toStatus: record.previousStatus,
              changedBy: user.userId,
              reason: 'Safe undo of bulk stage change',
            },
          })
        } else if (record.existingMember) {
          await tx.talentPoolMember.update({
            where: { talentPoolId_candidateId: { talentPoolId: record.talentPoolId, candidateId: record.candidateId } },
            data: {
              status: record.existingMember.status,
              sourceApplicationId: record.existingMember.sourceApplicationId,
              tagsJson: record.existingMember.tagsJson,
              notes: record.existingMember.notes,
              addedBy: record.existingMember.addedBy,
            },
          })
        } else {
          await tx.talentPoolMember.update({
            where: { talentPoolId_candidateId: { talentPoolId: record.talentPoolId, candidateId: record.candidateId } },
            data: { status: 'REMOVED', notes: 'Removed by safe undo of bulk placement.' },
          })
        }
      }
      await tx.bulkActionRun.update({
        where: { id: run.id },
        data: { reversedAt: new Date(), reversedBy: user.userId, status: 'REVERSED' },
      })
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'BULK_ACTION_UNDONE',
      resourceType: 'BulkActionRun',
      resourceId: run.id,
      reason: 'Safe undo within configured window',
    })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
