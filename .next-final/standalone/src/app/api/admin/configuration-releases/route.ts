import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { RELEASE_ENTITIES, coerceRelease, applyConfigurationRelease } from '@/lib/configuration-releases'
import { logAudit } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  entity: z.string().refine((value) => value in RELEASE_ENTITIES),
  id: z.string().min(1),
  data: z.record(z.unknown()),
  reason: z.string().trim().min(10).max(1000),
  scheduledFor: z.coerce.date().optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
})

export async function GET() {
  try {
    const user = await requireUser()
    const systemAdmin = user.roles.includes('SYSTEM_ADMIN')
    const courseAdmin = await hasPermission(user.userId, 'course.manage')
    if (!systemAdmin && !courseAdmin) throw new AuthzError('Forbidden', 403)
    const releases = await prisma.configurationChangeRequest.findMany({
      where: {
        changeType: systemAdmin ? { startsWith: 'GENERIC_CONFIG_UPDATE:' } : 'GENERIC_CONFIG_UPDATE:courses',
      },
      orderBy: { requestedAt: 'desc' },
      take: 250,
    })
    return Response.json({ releases })
  } catch (error) { return authzResponse(error) }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(request, createSchema)
    const systemAdmin = user.roles.includes('SYSTEM_ADMIN')
    if (!systemAdmin && !(input.entity === 'courses' && await hasPermission(user.userId, 'course.manage'))) throw new AuthzError('Forbidden', 403)
    if (input.effectiveFrom && input.effectiveTo && input.effectiveTo <= input.effectiveFrom) throw new AuthzError('Effective end must follow effective start', 400)
    const config = RELEASE_ENTITIES[input.entity]
    const current = await (prisma as any)[config.model].findUnique({ where: { id: input.id } })
    if (!current) throw new AuthzError('Configuration record not found', 404)
    const proposed = coerceRelease(input.entity, input.data)
    const release = await prisma.configurationChangeRequest.create({ data: { changeType: `GENERIC_CONFIG_UPDATE:${input.entity}`, resourceId: input.id, proposedJson: JSON.stringify(proposed), previousJson: JSON.stringify(current), reason: input.reason, status: 'DRAFT', requestedBy: user.userId, scheduledFor: input.scheduledFor || null, effectiveFrom: input.effectiveFrom || null, effectiveTo: input.effectiveTo || null } })
    await logAudit({ actorUserId: user.userId, action: 'CONFIGURATION_DRAFT_CREATED', resourceType: config.model, resourceId: input.id, reason: input.reason, previousValue: current, newValue: proposed })
    return Response.json({ release }, { status: 201 })
  } catch (error) { return authzResponse(error) }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(request, z.object({ releaseId: z.string().min(1), action: z.enum(['SUBMIT', 'APPROVE', 'REJECT', 'PUBLISH', 'ROLLBACK']), comment: z.string().trim().min(5).max(1000), lockVersion: z.number().int().positive() }))
    const release = await prisma.configurationChangeRequest.findUnique({ where: { id: input.releaseId } })
    if (!release) throw new AuthzError('Configuration release not found', 404)
    const systemAdmin = user.roles.includes('SYSTEM_ADMIN')
    const ownCourseDraft = release.changeType === 'GENERIC_CONFIG_UPDATE:courses' && release.requestedBy === user.userId && await hasPermission(user.userId, 'course.manage')
    if (!systemAdmin && !(input.action === 'SUBMIT' && ownCourseDraft)) throw new AuthzError('A system administrator must decide or publish this release', 403)
    if (release.lockVersion !== input.lockVersion) throw new AuthzError('This release changed while you were viewing it. Refresh and try again.', 409)
    if (input.action === 'SUBMIT') {
      if (release.status !== 'DRAFT' || release.requestedBy !== user.userId) throw new AuthzError('Only the draft owner can submit this release', 409)
      await prisma.configurationChangeRequest.update({ where: { id: release.id }, data: { status: 'PENDING', lockVersion: { increment: 1 } } })
    } else if (input.action === 'APPROVE') {
      if (release.status !== 'PENDING') throw new AuthzError('Only a pending release can be approved', 409)
      if (release.requestedBy === user.userId) throw new AuthzError('A second administrator must approve this change', 409)
      await prisma.configurationChangeRequest.update({ where: { id: release.id }, data: { status: 'APPROVED', decidedBy: user.userId, decidedAt: new Date(), decisionComment: input.comment, scheduledFor: release.scheduledFor || release.effectiveFrom, lockVersion: { increment: 1 } } })
    } else if (input.action === 'REJECT') {
      if (!['PENDING', 'APPROVED'].includes(release.status)) throw new AuthzError('This release cannot be rejected now', 409)
      if (release.requestedBy === user.userId) throw new AuthzError('A second administrator must decide this release', 409)
      await prisma.configurationChangeRequest.update({ where: { id: release.id }, data: { status: 'REJECTED', decidedBy: user.userId, decidedAt: new Date(), decisionComment: input.comment, lockVersion: { increment: 1 } } })
    } else if (input.action === 'PUBLISH') {
      if (release.effectiveFrom && release.effectiveFrom > new Date()) throw new AuthzError(`This release becomes effective on ${release.effectiveFrom.toISOString()}`, 409)
      if (release.scheduledFor && release.scheduledFor > new Date()) throw new AuthzError(`This release is scheduled for ${release.scheduledFor.toISOString()}`, 409)
      await applyConfigurationRelease(release.id, user.userId)
    } else {
      if (release.status !== 'APPLIED' || !release.previousJson) throw new AuthzError('Only a published release with a stored previous version can be rolled back', 409)
      const entity = release.changeType.replace('GENERIC_CONFIG_UPDATE:', '')
      const config = RELEASE_ENTITIES[entity]
      const previous = JSON.parse(release.previousJson)
      const current = await (prisma as any)[config.model].findUnique({ where: { id: release.resourceId } })
      await prisma.$transaction(async (tx) => {
        await tx.entityVersion.upsert({ where: { entityType_entityId_version: { entityType: config.model, entityId: release.resourceId, version: current.version } }, update: {}, create: { entityType: config.model, entityId: release.resourceId, version: current.version, snapshotJson: JSON.stringify(current), changeReason: `Rollback: ${input.comment}`, createdBy: user.userId } })
        const restored = coerceRelease(entity, previous)
        await (tx as any)[config.model].update({ where: { id: release.resourceId }, data: { ...restored, version: { increment: 1 } } })
        await tx.configurationChangeRequest.update({ where: { id: release.id }, data: { status: 'ROLLED_BACK', decisionComment: input.comment, lockVersion: { increment: 1 } } })
      })
    }
    await logAudit({ actorUserId: user.userId, action: `CONFIGURATION_RELEASE_${input.action}`, resourceType: 'ConfigurationChangeRequest', resourceId: release.id, reason: input.comment })
    return Response.json({ success: true })
  } catch (error) { return authzResponse(error) }
}
