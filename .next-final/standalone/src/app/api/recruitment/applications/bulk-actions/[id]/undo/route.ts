import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { logAudit } from '@/lib/audit'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requireUser()
    const run = await prisma.bulkActionRun.findUnique({ where: { id: params.id } })
    if (!run) throw new AuthzError('Bulk-action receipt not found', 404)
    if (run.requestedBy !== user.userId && !user.roles.includes('SYSTEM_ADMIN')) throw new AuthzError('Only the original operator or a system administrator can undo this action', 403)
    if (!run.reversibleUntil || run.reversibleUntil < new Date()) throw new AuthzError('The safe undo window has closed', 409)
    if (run.reversedAt) throw new AuthzError('This action has already been undone', 409)
    const result = JSON.parse(run.resultJson) as { undoRecords?: Array<any> }
    if (!['ASSIGN_REVIEWER', 'TALENT_POOL'].includes(run.actionType)) throw new AuthzError('This bulk action is not safely reversible', 409)
    await prisma.$transaction(async (tx) => {
      for (const record of result.undoRecords || []) {
        if (run.actionType === 'ASSIGN_REVIEWER') {
          await tx.application.update({ where: { id: record.applicationId }, data: { assignedReviewerId: record.previousReviewerId || null, lockVersion: { increment: 1 } } })
        } else if (record.existingMember) {
          await tx.talentPoolMember.update({ where: { talentPoolId_candidateId: { talentPoolId: record.talentPoolId, candidateId: record.candidateId } }, data: { status: record.existingMember.status, sourceApplicationId: record.existingMember.sourceApplicationId, tagsJson: record.existingMember.tagsJson, notes: record.existingMember.notes, addedBy: record.existingMember.addedBy } })
        } else {
          await tx.talentPoolMember.update({ where: { talentPoolId_candidateId: { talentPoolId: record.talentPoolId, candidateId: record.candidateId } }, data: { status: 'REMOVED', notes: 'Removed by safe undo of bulk placement.' } })
        }
      }
      await tx.bulkActionRun.update({ where: { id: run.id }, data: { reversedAt: new Date(), reversedBy: user.userId, status: 'REVERSED' } })
    })
    await logAudit({ actorUserId: user.userId, action: 'BULK_ACTION_UNDONE', resourceType: 'BulkActionRun', resourceId: run.id, reason: 'Safe undo within configured window' })
    return Response.json({ success: true })
  } catch (error) { return authzResponse(error) }
}
