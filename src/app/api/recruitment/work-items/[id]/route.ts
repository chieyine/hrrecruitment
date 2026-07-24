import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  action: z.enum(['START', 'BLOCK', 'COMPLETE', 'REOPEN']),
  reason: z.string().trim().max(1000).optional(),
  lockVersion: z.number().int().positive(),
})

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requireUser()
    const input = await parseBody(request, schema)
    const item = await prisma.workItem.findUnique({ where: { id: params.id } })
    if (!item) throw new AuthzError('Work item not found', 404)
    const canManageAll = await hasPermission(user.userId, 'application.read.all')
    if (item.assignedUserId && item.assignedUserId !== user.userId && !canManageAll) {
      throw new AuthzError('This work item is assigned to another user', 403)
    }
    if (!item.assignedUserId && item.assignedRole && !user.roles.includes(item.assignedRole) && !canManageAll) {
      throw new AuthzError(`This work item is assigned to the ${item.assignedRole.replaceAll('_', ' ')} role`, 403)
    }
    if (input.action === 'BLOCK' && (!input.reason || input.reason.length < 5)) {
      throw new AuthzError('Explain what is blocking this work item', 422)
    }
    if (input.action === 'COMPLETE' && ['APPLICATION_REVIEW', 'APPROVAL_DECISION', 'PREBOARDING_REVIEW', 'OFFER_APPROVAL', 'REFERENCE_REVIEW'].includes(item.workType)) {
      throw new AuthzError('Complete the underlying recruitment action; this queue item will close automatically', 409)
    }
    const nextStatus = {
      START: 'IN_PROGRESS',
      BLOCK: 'BLOCKED',
      COMPLETE: 'COMPLETED',
      REOPEN: 'OPEN',
    }[input.action]
    const updated = await prisma.workItem.updateMany({
      where: { id: item.id, lockVersion: input.lockVersion },
      data: {
        status: nextStatus,
        assignedUserId: item.assignedUserId ?? user.userId,
        blockedReason: input.action === 'BLOCK' ? input.reason : null,
        completedAt: input.action === 'COMPLETE' ? new Date() : null,
        lockVersion: { increment: 1 },
      },
    })
    if (updated.count !== 1) throw new AuthzError('This work item changed; refresh and try again', 409)
    await logAudit({
      actorUserId: user.userId,
      action: `WORK_ITEM_${input.action}`,
      resourceType: 'WorkItem',
      resourceId: item.id,
      previousValue: { status: item.status },
      newValue: { status: nextStatus },
      reason: input.reason,
    })
    return Response.json({ success: true, lockVersion: input.lockVersion + 1 })
  } catch (error) {
    return authzResponse(error)
  }
}
