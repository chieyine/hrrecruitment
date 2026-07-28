import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { runRetentionPolicy } from '@/lib/retention'
import { verifyAuditChain, logAudit } from '@/lib/audit'

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('PLACE_HOLD'),
    resourceType: z.enum([
      'APPLICATION',
      'CANDIDATE',
      'USER',
      'NOTIFICATION',
      'REFEREE',
      'REFERENCE_REQUEST',
      'OUTBOX_MESSAGE',
      'IDEMPOTENCY_RECORD',
      'RATE_LIMIT_BUCKET',
    ]),
    resourceId: z.string().min(1),
    reason: z.string().trim().min(10).max(2000),
  }),
  z.object({ action: z.literal('RELEASE_HOLD'), id: z.string().min(1), reason: z.string().trim().min(10).max(2000) }),
  z.object({ action: z.literal('RUN_RETENTION') }),
  z.object({
    action: z.literal('CREATE_ACCESS_REVIEW'),
    userId: z.string().min(1),
    reviewerUserId: z.string().min(1),
    dueAt: z.coerce.date(),
  }),
  z.object({
    action: z.literal('DECIDE_ACCESS_REVIEW'),
    id: z.string().min(1),
    status: z.enum(['APPROVED', 'CHANGES_REQUIRED', 'COMPLETED']),
    decisionComment: z.string().trim().min(5).max(2000),
  }),
  z.object({ action: z.literal('RETRY_DEAD_LETTERS') }),
])

export async function GET() {
  try {
    await requirePermission('governance.manage')
    const [legalHolds, retentionRuns, accessReviews, deadLetters, operationalEvents, auditIntegrity, users] =
      await Promise.all([
        prisma.legalHold.findMany({ orderBy: { placedAt: 'desc' }, take: 100 }),
        prisma.retentionRun.findMany({ orderBy: { startedAt: 'desc' }, take: 20 }),
        prisma.accessReview.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
        prisma.outboxMessage.findMany({
          where: { status: 'DEAD_LETTER' },
          select: {
            id: true,
            channel: true,
            status: true,
            subject: true,
            attempts: true,
            maximumAttempts: true,
            lastError: true,
            createdAt: true,
            availableAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        prisma.operationalEvent.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: 'desc' }, take: 50 }),
        verifyAuditChain(),
        prisma.user.findMany({
          where: { accountStatus: 'ACTIVE' },
          select: { id: true, email: true },
          orderBy: { email: 'asc' },
          take: 500,
        }),
      ])
    return Response.json({
      legalHolds,
      retentionRuns,
      accessReviews,
      deadLetters,
      operationalEvents,
      auditIntegrity,
      users,
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('governance.manage')
    const input = await parseBody(request, actionSchema)
    let result: unknown
    if (input.action === 'PLACE_HOLD')
      result = await prisma.legalHold.create({
        data: {
          resourceType: input.resourceType.toUpperCase(),
          resourceId: input.resourceId,
          reason: input.reason,
          placedBy: user.userId,
        },
      })
    else if (input.action === 'RELEASE_HOLD') {
      const hold = await prisma.legalHold.findUnique({ where: { id: input.id } })
      if (!hold) throw new AuthzError('Legal hold not found', 404)
      result = await prisma.legalHold.update({
        where: { id: input.id },
        data: {
          status: 'RELEASED',
          releasedBy: user.userId,
          releasedAt: new Date(),
          reason: `${hold.reason}\nRelease reason: ${input.reason}`,
        },
      })
    } else if (input.action === 'RUN_RETENTION') result = await runRetentionPolicy()
    else if (input.action === 'CREATE_ACCESS_REVIEW') {
      if (input.userId === input.reviewerUserId)
        throw new AuthzError('Access reviews require an independent reviewer', 409)
      const target = await prisma.user.findUnique({
        where: { id: input.userId },
        include: { userRoles: { include: { role: true } } },
      })
      if (!target) throw new AuthzError('User not found', 404)
      const reviewer = await prisma.user.findUnique({
        where: { id: input.reviewerUserId },
        select: { id: true, accountStatus: true },
      })
      if (!reviewer || reviewer.accountStatus !== 'ACTIVE') throw new AuthzError('Reviewer must be an active user', 400)
      result = await prisma.accessReview.create({
        data: {
          userId: target.id,
          reviewerUserId: input.reviewerUserId,
          rolesSnapshotJson: JSON.stringify(
            target.userRoles.map((item) => ({ role: item.role.name, scopeType: item.scopeType, scopeId: item.scopeId }))
          ),
          dueAt: input.dueAt,
        },
      })
    } else if (input.action === 'DECIDE_ACCESS_REVIEW') {
      const review = await prisma.accessReview.findUnique({ where: { id: input.id } })
      if (!review) throw new AuthzError('Access review not found', 404)
      if (review.reviewerUserId !== user.userId || review.userId === user.userId)
        throw new AuthzError('Only the assigned independent reviewer may decide this review', 403)
      const decided = await prisma.accessReview.updateMany({
        where: { id: review.id, status: 'PENDING' },
        data: { status: input.status, decisionComment: input.decisionComment, decidedAt: new Date() },
      })
      if (decided.count !== 1) throw new AuthzError('Access review has already been decided', 409)
      result = await prisma.accessReview.findUniqueOrThrow({ where: { id: review.id } })
    } else
      result = await prisma.outboxMessage.updateMany({
        where: { status: 'DEAD_LETTER' },
        data: { status: 'PENDING', attempts: 0, lockedAt: null, availableAt: new Date(), lastError: null },
      })
    await logAudit({
      actorUserId: user.userId,
      action: input.action,
      resourceType: 'Governance',
      resourceId: 'system',
      newValue: input,
    })
    return Response.json({ success: true, result })
  } catch (error) {
    return authzResponse(error)
  }
}
