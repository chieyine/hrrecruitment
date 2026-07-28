import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

const requestSchema = z.discriminatedUnion('changeType', [
  z.object({
    changeType: z.literal('SLA_POLICY_UPDATE'),
    resourceId: z.string().min(1),
    targetMinutes: z.number().int().min(15).max(525_600),
    warningMinutes: z.number().int().min(0).max(525_600),
    escalationAfterMinutes: z.number().int().min(15).max(525_600).nullable(),
    escalationRole: z.string().trim().max(100).nullable(),
    reason: z.string().trim().min(10).max(2000),
  }),
  z.object({
    changeType: z.literal('WORKFLOW_PUBLISH'),
    resourceId: z.string().min(1),
    reason: z.string().trim().min(10).max(2000),
  }),
  z.object({
    changeType: z.literal('INTEGRATION_UPDATE'),
    resourceId: z.string().min(1),
    status: z.enum(['DISCONNECTED', 'CONFIGURED', 'ACTIVE', 'DEGRADED']),
    secretReference: z.string().trim().max(500).nullable(),
    reason: z.string().trim().min(10).max(2000),
  }),
])

const decisionSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(['APPROVE', 'REJECT']),
  comment: z.string().trim().min(5).max(2000),
  lockVersion: z.number().int().positive(),
})

export async function GET() {
  try {
    await requireRole('SYSTEM_ADMIN')
    const [slaPolicies, workflows, integrations, requests] = await Promise.all([
      prisma.slaPolicy.findMany({ orderBy: { name: 'asc' } }),
      prisma.workflowDefinition.findMany({
        include: {
          versions: { include: { transitions: { orderBy: { displayOrder: 'asc' } } }, orderBy: { version: 'desc' } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.integrationConnection.findMany({ orderBy: [{ connectionType: 'asc' }, { provider: 'asc' }] }),
      prisma.configurationChangeRequest.findMany({ orderBy: { requestedAt: 'desc' }, take: 200 }),
    ])
    return Response.json({ slaPolicies, workflows, integrations, requests })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole('SYSTEM_ADMIN')
    const input = await parseBody(request, requestSchema)
    if (input.changeType === 'SLA_POLICY_UPDATE' && input.warningMinutes > input.targetMinutes) {
      throw new AuthzError('Warning time cannot exceed the target time', 422)
    }
    const { changeType, resourceId, reason, ...proposed } = input
    const existing = await prisma.configurationChangeRequest.findFirst({
      where: { changeType, resourceId, status: 'PENDING' },
    })
    if (existing) throw new AuthzError('A change for this resource is already awaiting review', 409)
    const created = await prisma.configurationChangeRequest.create({
      data: { changeType, resourceId, reason, proposedJson: JSON.stringify(proposed), requestedBy: user.userId },
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
    const user = await requireRole('SYSTEM_ADMIN')
    const input = await parseBody(request, decisionSchema)
    const change = await prisma.configurationChangeRequest.findUnique({ where: { id: input.id } })
    if (!change) throw new AuthzError('Configuration change not found', 404)
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
      if (change.changeType === 'SLA_POLICY_UPDATE') {
        await tx.slaPolicy.update({
          where: { id: change.resourceId },
          data: {
            targetMinutes: Number(proposed.targetMinutes),
            warningMinutes: Number(proposed.warningMinutes),
            escalationAfterMinutes:
              proposed.escalationAfterMinutes === null ? null : Number(proposed.escalationAfterMinutes),
            escalationRole: proposed.escalationRole ? String(proposed.escalationRole) : null,
          },
        })
      } else if (change.changeType === 'WORKFLOW_PUBLISH') {
        const version = await tx.workflowVersion.findUnique({ where: { id: change.resourceId } })
        if (!version || version.status !== 'DRAFT')
          throw new AuthzError('Only a draft workflow version can be published', 409)
        if ((await tx.workflowTransitionRule.count({ where: { workflowVersionId: version.id } })) === 0)
          throw new AuthzError('A workflow must contain transition rules before publication', 422)
        await tx.workflowVersion.updateMany({
          where: { workflowDefinitionId: version.workflowDefinitionId, status: 'ACTIVE' },
          data: { status: 'RETIRED' },
        })
        await tx.workflowVersion.update({
          where: { id: version.id },
          data: { status: 'ACTIVE', publishedBy: user.userId, publishedAt: new Date() },
        })
      } else {
        await tx.integrationConnection.update({
          where: { id: change.resourceId },
          data: {
            status: String(proposed.status),
            secretReference: proposed.secretReference ? String(proposed.secretReference) : null,
          },
        })
      }
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
