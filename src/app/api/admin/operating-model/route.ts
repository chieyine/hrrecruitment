import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

const requestSchema = z.object({
  changeType: z.literal('SLA_POLICY_UPDATE'),
  resourceId: z.string().min(1),
  targetMinutes: z.number().int().min(15).max(525_600),
  reason: z.string().trim().min(10).max(2000),
})

const decisionSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(['APPROVE', 'REJECT']),
  comment: z.string().trim().min(5).max(2000),
  lockVersion: z.number().int().positive(),
})

export async function GET() {
  try {
    await requireRole('HR_MANAGER')
    const [slaPolicies, requests] = await Promise.all([
      prisma.slaPolicy.findMany({ orderBy: { name: 'asc' } }),
      prisma.configurationChangeRequest.findMany({
        where: { changeType: 'SLA_POLICY_UPDATE' },
        orderBy: { requestedAt: 'desc' },
        take: 200,
      }),
    ])
    return Response.json({ slaPolicies, requests })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole('HR_MANAGER')
    const input = await parseBody(request, requestSchema)
    const { changeType, resourceId, reason, ...proposed } = input
    const policy = await prisma.slaPolicy.findUnique({ where: { id: resourceId } })
    if (!policy || !policy.active) throw new AuthzError('Active work target not found', 404)
    if (policy.targetMinutes === input.targetMinutes) throw new AuthzError('The work target has not changed', 422)
    const existing = await prisma.configurationChangeRequest.findFirst({
      where: { changeType, resourceId, status: 'PENDING' },
    })
    if (existing) throw new AuthzError('A change for this resource is already awaiting review', 409)
    const created = await prisma.configurationChangeRequest.create({
      data: {
        changeType,
        resourceId,
        reason,
        proposedJson: JSON.stringify(proposed),
        previousJson: JSON.stringify({ targetMinutes: policy.targetMinutes }),
        requestedBy: user.userId,
      },
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'CONFIGURATION_CHANGE_REQUESTED',
      resourceType: 'ConfigurationChangeRequest',
      resourceId: created.id,
      newValue: { changeType, resourceId },
      reason,
    })
    return Response.json({ success: true, request: created }, { status: 201 })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole('HR_MANAGER')
    const input = await parseBody(request, decisionSchema)
    const change = await prisma.configurationChangeRequest.findUnique({ where: { id: input.id } })
    if (!change) throw new AuthzError('Configuration change not found', 404)
    if (change.changeType !== 'SLA_POLICY_UPDATE') throw new AuthzError('This change belongs to another review queue', 409)
    if (change.status !== 'PENDING') throw new AuthzError('This change has already been decided', 409)
    if (change.requestedBy === user.userId)
      throw new AuthzError('The requester cannot approve their own configuration change', 409)
    const proposed = JSON.parse(change.proposedJson) as Record<string, unknown>
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.configurationChangeRequest.updateMany({
        where: { id: change.id, status: 'PENDING', lockVersion: input.lockVersion },
        data: {
          status: input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          decidedBy: user.userId,
          decidedAt: new Date(),
          decisionComment: input.comment,
          lockVersion: { increment: 1 },
        },
      })
      if (claimed.count !== 1) throw new AuthzError('This change was decided by another administrator', 409)
      if (input.decision === 'REJECT') return
      await tx.slaPolicy.update({
        where: { id: change.resourceId },
        data: { targetMinutes: Number(proposed.targetMinutes) },
      })
      await tx.configurationChangeRequest.update({
        where: { id: change.id },
        data: { status: 'APPLIED', appliedAt: new Date() },
      })
    })
    await logAudit({
      actorUserId: user.userId,
      action: `CONFIGURATION_CHANGE_${input.decision}D`,
      resourceType: 'ConfigurationChangeRequest',
      resourceId: change.id,
      reason: input.comment,
    })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
