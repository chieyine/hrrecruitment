import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('CREATE_POOL'),
    name: z.string().trim().min(3).max(150),
    description: z.string().trim().max(2000).optional(),
    poolType: z.enum(['GENERAL', 'ROLE', 'SKILL', 'RESERVE', 'ALUMNI']),
  }),
  z.object({
    action: z.literal('ADD_MEMBER'),
    talentPoolId: z.string().min(1),
    candidateId: z.string().min(1),
    sourceApplicationId: z.string().optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
    notes: z.string().trim().max(2000).optional(),
    technicalCategory: z.string().trim().max(150).optional(),
    preferredLocations: z.array(z.string().trim().min(1).max(150)).max(20).default([]),
    availabilityStatus: z.enum(['IMMEDIATE', 'DATE_SPECIFIED', 'NOTICE_PERIOD', 'UNAVAILABLE']).optional(),
    availableFrom: z.coerce.date().optional(),
    expectedRate: z.coerce.number().nonnegative().optional(),
    expectedRateCurrency: z.string().trim().length(3).optional(),
    expectedRatePeriod: z.enum(['HOURLY', 'DAILY', 'MONTHLY', 'ANNUAL', 'FIXED']).optional(),
    expectedGrade: z.string().trim().max(100).optional(),
    rosterExpiresAt: z.coerce.date().optional(),
  }),
  z.object({
    action: z.literal('REMOVE_MEMBER'),
    memberId: z.string().min(1),
    reason: z.string().trim().min(5).max(1000),
  }),
  z.object({
    action: z.literal('RECORD_DEPLOYMENT'),
    memberId: z.string().uuid(),
    applicationId: z.string().uuid().optional(),
    vacancyReference: z.string().trim().min(2).max(100),
    roleTitle: z.string().trim().min(2).max(200),
    deploymentStatus: z.enum(['CONTACTED', 'NOMINATED', 'APPLIED', 'HIRED', 'STARTED', 'ENDED']),
    deployedAt: z.coerce.date(),
    endedAt: z.coerce.date().optional(),
    notes: z.string().trim().max(2000).optional(),
  }),
])

export async function GET() {
  try {
    const user = await requirePermission('application.read.all')
    if (!canRunRecruitmentOperations(user.roles))
      throw new AuthzError('Talent pools are restricted to the recruitment HR team', 403)
    const [pools, eligibleCandidates] = await Promise.all([
      prisma.talentPool.findMany({
        where: { active: true },
        include: {
          members: {
            where: { status: { not: 'REMOVED' } },
            include: {
              candidate: {
                select: {
                  legalFirstName: true,
                  lastName: true,
                  primaryPhone: true,
                  user: { select: { email: true } },
                  skills: { select: { name: true }, take: 10 },
                },
              },
            },
            orderBy: { addedAt: 'desc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.candidateProfile.findMany({
        where: {
          consentRecords: { some: { consentType: 'TALENT_POOL', decision: true, withdrawnAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
          user: { accountStatus: 'ACTIVE' },
          applications: {
            some: { internalStatus: { in: ['RESERVE', 'NOT_SELECTED', 'INTERVIEW_COMPLETED', 'REFERENCE_CHECK'] } },
          },
        },
        select: {
          id: true,
          legalFirstName: true,
          lastName: true,
          primaryPhone: true,
          user: { select: { email: true } },
          skills: { select: { name: true }, take: 10 },
          applications: {
            where: { internalStatus: { in: ['RESERVE', 'NOT_SELECTED', 'INTERVIEW_COMPLETED', 'REFERENCE_CHECK'] } },
            select: { id: true, finalScore: true, vacancy: { select: { title: true, referenceNumber: true } } },
            orderBy: { updatedAt: 'desc' },
            take: 3,
          },
        },
        orderBy: [{ lastName: 'asc' }, { legalFirstName: 'asc' }],
        take: 500,
      }),
    ])
    const phoneCounts = new Map<string, number>()
    for (const candidate of eligibleCandidates) {
      const phone = candidate.primaryPhone?.replace(/\D/g, '')
      if (phone) phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1)
    }
    return Response.json({
      pools,
      eligibleCandidates: eligibleCandidates.map((candidate) => ({
        ...candidate,
        possibleDuplicate: Boolean(
          candidate.primaryPhone && (phoneCounts.get(candidate.primaryPhone.replace(/\D/g, '')) || 0) > 1
        ),
      })),
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('application.read.all')
    if (!canRunRecruitmentOperations(user.roles))
      throw new AuthzError('Talent pools are restricted to the recruitment HR team', 403)
    const input = await parseBody(request, schema)
    if (input.action === 'CREATE_POOL') {
      const duplicate = await prisma.talentPool.findFirst({
        where: { name: { equals: input.name, mode: 'insensitive' }, active: true },
        select: { id: true },
      })
      if (duplicate) throw new AuthzError('An active talent pool already uses this name', 409)
      const pool = await prisma.talentPool.create({
        data: {
          name: input.name,
          description: input.description || null,
          poolType: input.poolType,
          createdBy: user.userId,
        },
      })
      await logAudit({
        actorUserId: user.userId,
        action: 'TALENT_POOL_CREATED',
        resourceType: 'TalentPool',
        resourceId: pool.id,
        newValue: { name: pool.name, poolType: pool.poolType },
      })
      return Response.json({ success: true, pool }, { status: 201 })
    }
    if (input.action === 'ADD_MEMBER') {
      const [pool, candidate] = await Promise.all([
        prisma.talentPool.findFirst({ where: { id: input.talentPoolId, active: true }, select: { id: true } }),
        prisma.candidateProfile.findFirst({
          where: {
            id: input.candidateId,
            user: { accountStatus: 'ACTIVE' },
            consentRecords: { some: { consentType: 'TALENT_POOL', decision: true, withdrawnAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
            applications: {
              some: { internalStatus: { in: ['RESERVE', 'NOT_SELECTED', 'INTERVIEW_COMPLETED', 'REFERENCE_CHECK'] } },
            },
          },
          select: { id: true, consentRecords: { where: { consentType: 'TALENT_POOL', decision: true, withdrawnAt: null }, orderBy: { decidedAt: 'desc' }, take: 1, select: { expiresAt: true } } },
        }),
      ])
      if (!pool) throw new AuthzError('Talent pool not found or inactive', 404)
      if (!candidate) throw new AuthzError('This candidate is not eligible for future-opportunity contact', 409)
      if (input.sourceApplicationId) {
        const source = await prisma.application.findFirst({
          where: {
            id: input.sourceApplicationId,
            candidateId: input.candidateId,
            internalStatus: { in: ['RESERVE', 'NOT_SELECTED', 'INTERVIEW_COMPLETED', 'REFERENCE_CHECK'] },
          },
          select: { id: true },
        })
        if (!source) throw new AuthzError('The source application does not belong to this eligible candidate', 422)
      }
      const member = await prisma.talentPoolMember.upsert({
        where: { talentPoolId_candidateId: { talentPoolId: input.talentPoolId, candidateId: input.candidateId } },
        update: {
          status: 'ACTIVE',
          tagsJson: JSON.stringify(input.tags),
          notes: input.notes || null,
          sourceApplicationId: input.sourceApplicationId || null,
          addedBy: user.userId,
          consentExpiresAt: candidate.consentRecords[0]?.expiresAt || null,
          technicalCategory: input.technicalCategory || null,
          preferredLocationsJson: JSON.stringify(input.preferredLocations),
          availabilityStatus: input.availabilityStatus || null,
          availableFrom: input.availableFrom || null,
          expectedRate: input.expectedRate ?? null,
          expectedRateCurrency: input.expectedRateCurrency?.toUpperCase() || null,
          expectedRatePeriod: input.expectedRatePeriod || null,
          expectedGrade: input.expectedGrade || null,
          rosterExpiresAt: input.rosterExpiresAt || null,
          lastVerifiedAt: new Date(),
        },
        create: {
          talentPoolId: input.talentPoolId,
          candidateId: input.candidateId,
          sourceApplicationId: input.sourceApplicationId || null,
          tagsJson: JSON.stringify(input.tags),
          notes: input.notes || null,
          addedBy: user.userId,
          consentExpiresAt: candidate.consentRecords[0]?.expiresAt || null,
          technicalCategory: input.technicalCategory || null,
          preferredLocationsJson: JSON.stringify(input.preferredLocations),
          availabilityStatus: input.availabilityStatus || null,
          availableFrom: input.availableFrom || null,
          expectedRate: input.expectedRate ?? null,
          expectedRateCurrency: input.expectedRateCurrency?.toUpperCase() || null,
          expectedRatePeriod: input.expectedRatePeriod || null,
          expectedGrade: input.expectedGrade || null,
          rosterExpiresAt: input.rosterExpiresAt || null,
          lastVerifiedAt: new Date(),
        },
      })
      await logAudit({
        actorUserId: user.userId,
        action: 'TALENT_POOL_MEMBER_ADDED',
        resourceType: 'TalentPoolMember',
        resourceId: member.id,
      })
      return Response.json({ success: true, member })
    }
    if (input.action === 'RECORD_DEPLOYMENT') {
      const member = await prisma.talentPoolMember.findUnique({ where: { id: input.memberId } })
      if (!member) throw new AuthzError('Talent-pool member not found', 404)
      if (input.endedAt && input.endedAt < input.deployedAt) throw new AuthzError('End date cannot be before deployment date', 422)
      if (input.applicationId) {
        const application = await prisma.application.findFirst({ where: { id: input.applicationId, candidateId: member.candidateId }, select: { id: true } })
        if (!application) throw new AuthzError('The application does not belong to this candidate', 422)
      }
      const deployment = await prisma.$transaction(async (tx) => {
        const created = await tx.talentPoolDeployment.create({ data: { talentPoolMemberId: member.id, applicationId: input.applicationId || null, vacancyReference: input.vacancyReference, roleTitle: input.roleTitle, deploymentStatus: input.deploymentStatus, deployedAt: input.deployedAt, endedAt: input.endedAt || null, notes: input.notes || null, recordedBy: user.userId } })
        await tx.talentPoolMember.update({ where: { id: member.id }, data: { status: ['HIRED', 'STARTED'].includes(input.deploymentStatus) ? 'CONVERTED' : input.deploymentStatus === 'CONTACTED' ? 'CONTACTED' : member.status, lastVerifiedAt: new Date() } })
        return created
      })
      await logAudit({ actorUserId: user.userId, action: 'TALENT_POOL_DEPLOYMENT_RECORDED', resourceType: 'TalentPoolDeployment', resourceId: deployment.id, newValue: input })
      return Response.json({ success: true, deployment }, { status: 201 })
    }
    const member = await prisma.talentPoolMember.findUnique({ where: { id: input.memberId } })
    if (!member) throw new AuthzError('Talent-pool member not found', 404)
    await prisma.talentPoolMember.update({
      where: { id: member.id },
      data: { status: 'REMOVED', notes: `${member.notes || ''}\nRemoval: ${input.reason}`.trim() },
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'TALENT_POOL_MEMBER_REMOVED',
      resourceType: 'TalentPoolMember',
      resourceId: member.id,
      reason: input.reason,
    })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
