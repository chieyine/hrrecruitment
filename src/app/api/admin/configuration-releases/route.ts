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

async function allowedReleaseEntities(user: Awaited<ReturnType<typeof requireUser>>) {
  const allowed: string[] = []
  if (user.roles.includes('HR_MANAGER')) {
    allowed.push(...Object.keys(RELEASE_ENTITIES).filter((entity) => entity !== 'courses'))
  }
  if (await hasPermission(user.userId, 'course.manage')) allowed.push('courses')
  return [...new Set(allowed)]
}

export async function GET() {
  try {
    const user = await requireUser()
    const entities = await allowedReleaseEntities(user)
    if (entities.length === 0) throw new AuthzError('Forbidden', 403)
    const releases = await prisma.configurationChangeRequest.findMany({
      where: {
        changeType: { in: entities.map((entity) => `GENERIC_CONFIG_UPDATE:${entity}`) },
      },
      orderBy: { requestedAt: 'desc' },
      take: 250,
    })
    return Response.json({ releases })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(request, createSchema)
    const entities = await allowedReleaseEntities(user)
    if (!entities.includes(input.entity)) throw new AuthzError('Forbidden', 403)
    if (input.effectiveFrom && input.effectiveTo && input.effectiveTo <= input.effectiveFrom)
      throw new AuthzError('Effective end must follow effective start', 400)
    const config = RELEASE_ENTITIES[input.entity]
    const current = await (prisma as any)[config.model].findUnique({ where: { id: input.id } })
    if (!current) throw new AuthzError('Configuration record not found', 404)
    const proposed = coerceRelease(input.entity, input.data)
    if (
      ['notification-templates', 'email-templates'].includes(input.entity) &&
      proposed.code !== undefined &&
      proposed.code !== current.code
    ) {
      throw new AuthzError('The stable template code cannot change. Create a new template if a new code is required.', 409)
    }
    if (input.entity === 'policies') {
      const fileAssetId = String(proposed.fileAssetId ?? current.fileAssetId ?? '')
      const file = await prisma.fileAsset.findFirst({
        where: { id: fileAssetId, virusScanStatus: 'CLEAN', mimeType: 'application/pdf' },
        select: { id: true },
      })
      if (!file) throw new AuthzError('Attach an available, clean official policy PDF before submitting this change', 422)
    }
    if (input.entity === 'preboarding-packages' && proposed.active === true) {
      const [forms, documents, policies, courses, tasks] = await Promise.all([
        prisma.packageForm.count({ where: { preboardingPackageId: input.id } }),
        prisma.packageDocumentRequirement.count({ where: { preboardingPackageId: input.id } }),
        prisma.packagePolicy.count({ where: { preboardingPackageId: input.id } }),
        prisma.packageCourse.count({ where: { preboardingPackageId: input.id } }),
        prisma.packageTask.count({ where: { preboardingPackageId: input.id } }),
      ])
      if (forms + documents + policies + courses + tasks === 0)
        throw new AuthzError('Add at least one form, document, policy, course or task before activating this package', 422)
      const [inactiveForms, inactiveDocuments, inactivePolicies, inactiveCourses, inactiveTasks] = await Promise.all([
        prisma.packageForm.count({ where: { preboardingPackageId: input.id, formTemplate: { active: false } } }),
        prisma.packageDocumentRequirement.count({
          where: { preboardingPackageId: input.id, documentRequirement: { active: false } },
        }),
        prisma.packagePolicy.count({ where: { preboardingPackageId: input.id, policyDocument: { active: false } } }),
        prisma.packageCourse.count({ where: { preboardingPackageId: input.id, course: { active: false } } }),
        prisma.packageTask.count({ where: { preboardingPackageId: input.id, taskTemplate: { active: false } } }),
      ])
      if (inactiveForms + inactiveDocuments + inactivePolicies + inactiveCourses + inactiveTasks > 0)
        throw new AuthzError('Replace retired requirements before activating this package', 422)
    }
    if (input.entity === 'courses' && proposed.active === true) {
      const [contents, questions] = await Promise.all([
        prisma.courseContent.count({ where: { courseId: input.id } }),
        prisma.courseQuizQuestion.count({ where: { courseId: input.id } }),
      ])
      if (contents + questions === 0) {
        throw new AuthzError('Add learning content or an assessment before activating this course', 422)
      }
    }
    if (input.entity === 'scorecards') {
      if (proposed.scorecardType !== undefined && proposed.scorecardType !== current.scorecardType) {
        const [assessments, screeningVacancies, interviewVacancies] = await Promise.all([
          prisma.candidateScorecard.count({ where: { scorecardTemplateId: input.id } }),
          prisma.vacancy.count({ where: { screeningScorecardTemplateId: input.id } }),
          prisma.vacancy.count({ where: { interviewScorecardTemplateId: input.id } }),
        ])
        if (assessments + screeningVacancies + interviewVacancies > 0)
          throw new AuthzError(
            'The selection stage cannot change because this scorecard is already assigned or has recorded assessments. Create a new scorecard.',
            409
          )
      }
      if (proposed.active === true) {
        const criteria = await prisma.scorecardCriterion.findMany({
          where: { scorecardTemplateId: input.id },
          select: { maximumScore: true, guidance: true },
        })
        if (!criteria.length) throw new AuthzError('Add at least one scored criterion before activation', 422)
        if (criteria.some((criterion) => !criterion.guidance?.trim()))
          throw new AuthzError('Every criterion needs scoring guidance before activation', 422)
        if (String(proposed.scorecardType ?? current.scorecardType) === 'SCREENING') {
          const total = criteria.reduce((sum, criterion) => sum + criterion.maximumScore, 0)
          if (Math.abs(total - 100) > 0.001)
            throw new AuthzError(`Screening criteria must total 100 points; the current total is ${total}`, 422)
        }
      }
    }
    if (input.entity === 'tasks' && proposed.active === true) {
      const title = String(proposed.title ?? current.title ?? '').trim()
      const description = String(proposed.description ?? current.description ?? '').trim()
      if (title.length < 3 || description.length < 10)
        throw new AuthzError('Add a clear title and candidate instruction before activation', 422)
    }
    if (input.entity === 'templates' && proposed.active === true) {
      const body = String(proposed.bodyTemplate ?? current.bodyTemplate ?? '')
      if (!body.includes('{{candidate_name}}'))
        throw new AuthzError('Offer wording must include the candidate name before activation', 422)
    }
    const changed = Object.entries(proposed).some(([key, value]) => String(current[key] ?? '') !== String(value ?? ''))
    if (!changed) throw new AuthzError('No configuration values have changed', 422)
    const release = await prisma.configurationChangeRequest.create({
      data: {
        changeType: `GENERIC_CONFIG_UPDATE:${input.entity}`,
        resourceId: input.id,
        proposedJson: JSON.stringify(proposed),
        previousJson: JSON.stringify(current),
        reason: input.reason,
        status: 'DRAFT',
        requestedBy: user.userId,
        scheduledFor: input.scheduledFor || null,
        effectiveFrom: input.effectiveFrom || null,
        effectiveTo: input.effectiveTo || null,
      },
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'CONFIGURATION_DRAFT_CREATED',
      resourceType: config.model,
      resourceId: input.id,
      reason: input.reason,
      previousValue: current,
      newValue: proposed,
    })
    return Response.json({ release }, { status: 201 })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(
      request,
      z.object({
        releaseId: z.string().min(1),
        action: z.enum(['SUBMIT', 'APPROVE', 'REJECT', 'PUBLISH', 'ROLLBACK']),
        comment: z.string().trim().min(5).max(1000),
        lockVersion: z.number().int().positive(),
      })
    )
    const release = await prisma.configurationChangeRequest.findUnique({ where: { id: input.releaseId } })
    if (!release) throw new AuthzError('Configuration release not found', 404)
    const entity = release.changeType.replace('GENERIC_CONFIG_UPDATE:', '')
    const entities = await allowedReleaseEntities(user)
    if (!entities.includes(entity)) throw new AuthzError('Forbidden', 403)
    if (release.lockVersion !== input.lockVersion)
      throw new AuthzError('This release changed while you were viewing it. Refresh and try again.', 409)
    if (input.action === 'SUBMIT') {
      if (release.status !== 'DRAFT' || release.requestedBy !== user.userId)
        throw new AuthzError('Only the draft owner can submit this release', 409)
      await prisma.configurationChangeRequest.update({
        where: { id: release.id },
        data: { status: 'PENDING', lockVersion: { increment: 1 } },
      })
    } else if (input.action === 'APPROVE') {
      if (release.status !== 'PENDING') throw new AuthzError('Only a pending release can be approved', 409)
      if (release.requestedBy === user.userId)
        throw new AuthzError('A second authorised reviewer must approve this change', 409)
      await prisma.configurationChangeRequest.update({
        where: { id: release.id },
        data: {
          status: 'APPROVED',
          decidedBy: user.userId,
          decidedAt: new Date(),
          decisionComment: input.comment,
          scheduledFor: release.scheduledFor || release.effectiveFrom,
          lockVersion: { increment: 1 },
        },
      })
    } else if (input.action === 'REJECT') {
      if (!['PENDING', 'APPROVED'].includes(release.status))
        throw new AuthzError('This release cannot be rejected now', 409)
      if (release.requestedBy === user.userId)
        throw new AuthzError('A second authorised reviewer must decide this release', 409)
      await prisma.configurationChangeRequest.update({
        where: { id: release.id },
        data: {
          status: 'REJECTED',
          decidedBy: user.userId,
          decidedAt: new Date(),
          decisionComment: input.comment,
          lockVersion: { increment: 1 },
        },
      })
    } else if (input.action === 'PUBLISH') {
      if (release.effectiveFrom && release.effectiveFrom > new Date())
        throw new AuthzError(`This release becomes effective on ${release.effectiveFrom.toISOString()}`, 409)
      if (release.scheduledFor && release.scheduledFor > new Date())
        throw new AuthzError(`This release is scheduled for ${release.scheduledFor.toISOString()}`, 409)
      await applyConfigurationRelease(release.id, user.userId)
    } else {
      if (release.status !== 'APPLIED' || !release.previousJson)
        throw new AuthzError('Only a published release with a stored previous version can be rolled back', 409)
      const config = RELEASE_ENTITIES[entity]
      const previous = JSON.parse(release.previousJson)
      const current = await (prisma as any)[config.model].findUnique({ where: { id: release.resourceId } })
      await prisma.$transaction(async (tx) => {
        await tx.entityVersion.upsert({
          where: {
            entityType_entityId_version: {
              entityType: config.model,
              entityId: release.resourceId,
              version: current.version,
            },
          },
          update: {},
          create: {
            entityType: config.model,
            entityId: release.resourceId,
            version: current.version,
            snapshotJson: JSON.stringify(current),
            changeReason: `Rollback: ${input.comment}`,
            createdBy: user.userId,
          },
        })
        const restored = coerceRelease(entity, previous)
        await (tx as any)[config.model].update({
          where: { id: release.resourceId },
          data: { ...restored, version: { increment: 1 } },
        })
        await tx.configurationChangeRequest.update({
          where: { id: release.id },
          data: { status: 'ROLLED_BACK', decisionComment: input.comment, lockVersion: { increment: 1 } },
        })
      })
    }
    await logAudit({
      actorUserId: user.userId,
      action: `CONFIGURATION_RELEASE_${input.action}`,
      resourceType: 'ConfigurationChangeRequest',
      resourceId: release.id,
      reason: input.comment,
    })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
