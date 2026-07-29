import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { verifyAuditChain, logAudit } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'

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
  z.object({ action: z.literal('RETRY_DEAD_LETTERS'), reason: z.string().trim().min(10).max(2000) }),
  z.object({
    action: z.literal('RESOLVE_EVENT'),
    id: z.string().min(1),
    reason: z.string().trim().min(10).max(2000),
  }),
])

export async function GET() {
  try {
    const currentUser = await requirePermission('governance.manage')
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
          select: {
            id: true,
            email: true,
            userRoles: {
              select: {
                role: {
                  select: {
                    name: true,
                    rolePermissions: { select: { permission: { select: { code: true } } } },
                  },
                },
              },
            },
          },
          orderBy: { email: 'asc' },
          take: 500,
        }),
      ])
    const emailById = new Map(users.map((user) => [user.id, user.email]))
    return Response.json({
      legalHolds: legalHolds.map((hold) => ({ ...hold, canRelease: hold.status === 'ACTIVE' && hold.placedBy !== currentUser.userId })),
      retentionRuns,
      accessReviews: accessReviews.map((review) => {
        let roles: string[] = []
        try {
          roles = JSON.parse(review.rolesSnapshotJson)
            .map((entry: { role?: string }) => entry.role)
            .filter((role: unknown): role is string => typeof role === 'string')
        } catch {}
        return {
          ...review,
          userEmail: emailById.get(review.userId) || 'Account unavailable',
          reviewerEmail: emailById.get(review.reviewerUserId) || 'Account unavailable',
          roles,
          canDecide: review.reviewerUserId === currentUser.userId && review.userId !== currentUser.userId,
        }
      }),
      deadLetters,
      operationalEvents,
      auditIntegrity,
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        reviewerEligible: user.userRoles.some(
          (assignment) =>
            assignment.role.name === 'SYSTEM_ADMIN' ||
            assignment.role.rolePermissions.some((item) => ['governance.manage', '*'].includes(item.permission.code))
        ),
      })),
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
    if (input.action === 'PLACE_HOLD') {
      const existingHold = await prisma.legalHold.findFirst({
        where: { resourceType: input.resourceType, resourceId: input.resourceId, status: 'ACTIVE' },
        select: { id: true },
      })
      if (existingHold) throw new AuthzError('An active hold already exists for this record', 409)
      const recordExists = await governedResourceExists(input.resourceType, input.resourceId)
      if (!recordExists) throw new AuthzError('The record ID does not match an existing record of this type', 404)
      result = await prisma.legalHold.create({
        data: {
          resourceType: input.resourceType.toUpperCase(),
          resourceId: input.resourceId,
          reason: input.reason,
          placedBy: user.userId,
        },
      })
    } else if (input.action === 'RELEASE_HOLD') {
      const hold = await prisma.legalHold.findUnique({ where: { id: input.id } })
      if (!hold) throw new AuthzError('Legal hold not found', 404)
      if (hold.status !== 'ACTIVE') throw new AuthzError('This legal hold has already been released', 409)
      if (hold.placedBy === user.userId) throw new AuthzError('A different administrator must release this hold', 409)
      result = await prisma.legalHold.update({
        where: { id: input.id },
        data: {
          status: 'RELEASED',
          releasedBy: user.userId,
          releasedAt: new Date(),
          reason: `${hold.reason}\nRelease reason: ${input.reason}`,
        },
      })
    } else if (input.action === 'CREATE_ACCESS_REVIEW') {
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
      if (!(await hasPermission(reviewer.id, 'governance.manage')))
        throw new AuthzError('Reviewer must have governance review access', 400)
      if (input.dueAt <= new Date()) throw new AuthzError('Due date must be in the future', 400)
      const existingReview = await prisma.accessReview.findFirst({
        where: { userId: target.id, status: { in: ['PENDING', 'CHANGES_REQUIRED'] } },
        select: { id: true },
      })
      if (existingReview) throw new AuthzError('This account already has an open access review', 409)
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
      const allowed =
        (review.status === 'PENDING' && ['APPROVED', 'CHANGES_REQUIRED'].includes(input.status)) ||
        (review.status === 'CHANGES_REQUIRED' && input.status === 'COMPLETED')
      if (!allowed) throw new AuthzError('This access-review transition is not available', 409)
      const decided = await prisma.accessReview.updateMany({
        where: { id: review.id, status: review.status },
        data: { status: input.status, decisionComment: input.decisionComment, decidedAt: new Date() },
      })
      if (decided.count !== 1) throw new AuthzError('Access review has already been decided', 409)
      result = await prisma.accessReview.findUniqueOrThrow({ where: { id: review.id } })
    } else if (input.action === 'RETRY_DEAD_LETTERS')
      result = await prisma.outboxMessage.updateMany({
        where: { status: 'DEAD_LETTER' },
        data: { status: 'PENDING', attempts: 0, lockedAt: null, availableAt: new Date(), lastError: null },
      })
    else {
      const event = await prisma.operationalEvent.findUnique({ where: { id: input.id } })
      if (!event) throw new AuthzError('Operational event not found', 404)
      if (event.resolvedAt) throw new AuthzError('This event has already been resolved', 409)
      result = await prisma.operationalEvent.update({ where: { id: event.id }, data: { resolvedAt: new Date() } })
    }
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

async function governedResourceExists(resourceType: string, resourceId: string) {
  if (resourceType === 'APPLICATION') return Boolean(await prisma.application.findUnique({ where: { id: resourceId }, select: { id: true } }))
  if (resourceType === 'CANDIDATE') return Boolean(await prisma.candidateProfile.findUnique({ where: { id: resourceId }, select: { id: true } }))
  if (resourceType === 'USER') return Boolean(await prisma.user.findUnique({ where: { id: resourceId }, select: { id: true } }))
  if (resourceType === 'NOTIFICATION') return Boolean(await prisma.notification.findUnique({ where: { id: resourceId }, select: { id: true } }))
  if (resourceType === 'REFEREE') return Boolean(await prisma.referee.findUnique({ where: { id: resourceId }, select: { id: true } }))
  if (resourceType === 'REFERENCE_REQUEST') return Boolean(await prisma.referenceRequest.findUnique({ where: { id: resourceId }, select: { id: true } }))
  if (resourceType === 'OUTBOX_MESSAGE') return Boolean(await prisma.outboxMessage.findUnique({ where: { id: resourceId }, select: { id: true } }))
  if (resourceType === 'IDEMPOTENCY_RECORD') return Boolean(await prisma.idempotencyRecord.findUnique({ where: { id: resourceId }, select: { id: true } }))
  if (resourceType === 'RATE_LIMIT_BUCKET') return Boolean(await prisma.rateLimitBucket.findUnique({ where: { keyHash: resourceId }, select: { keyHash: true } }))
  return false
}
