import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

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
  }),
  z.object({
    action: z.literal('REMOVE_MEMBER'),
    memberId: z.string().min(1),
    reason: z.string().trim().min(5).max(1000),
  }),
])

export async function GET() {
  try {
    await requirePermission('application.read.all')
    const [pools, eligibleCandidates] = await Promise.all([
      prisma.talentPool.findMany({
        where: { active: true },
        include: {
          members: {
            where: { status: { not: 'REMOVED' } },
            include: {
              candidate: {
                select: {
                  legalFirstName: true, lastName: true, primaryPhone: true,
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
          consentRecords: { some: { consentType: 'TALENT_POOL', decision: true, withdrawnAt: null } },
          user: { accountStatus: 'ACTIVE' },
        },
        select: {
          id: true, legalFirstName: true, lastName: true, primaryPhone: true,
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
        possibleDuplicate: Boolean(candidate.primaryPhone && (phoneCounts.get(candidate.primaryPhone.replace(/\D/g, '')) || 0) > 1),
      })),
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('application.read.all')
    const input = await parseBody(request, schema)
    if (input.action === 'CREATE_POOL') {
      const pool = await prisma.talentPool.create({
        data: { name: input.name, description: input.description || null, poolType: input.poolType, createdBy: user.userId },
      })
      await logAudit({ actorUserId: user.userId, action: 'TALENT_POOL_CREATED', resourceType: 'TalentPool', resourceId: pool.id, newValue: { name: pool.name, poolType: pool.poolType } })
      return Response.json({ success: true, pool }, { status: 201 })
    }
    if (input.action === 'ADD_MEMBER') {
      const consent = await prisma.consentRecord.findFirst({
        where: { candidateId: input.candidateId, consentType: 'TALENT_POOL', decision: true, withdrawnAt: null },
      })
      if (!consent) throw new AuthzError('This candidate has not consented to future-opportunity contact', 409)
      const member = await prisma.talentPoolMember.upsert({
        where: { talentPoolId_candidateId: { talentPoolId: input.talentPoolId, candidateId: input.candidateId } },
        update: { status: 'ACTIVE', tagsJson: JSON.stringify(input.tags), notes: input.notes || null, sourceApplicationId: input.sourceApplicationId || null, addedBy: user.userId },
        create: {
          talentPoolId: input.talentPoolId, candidateId: input.candidateId,
          sourceApplicationId: input.sourceApplicationId || null,
          tagsJson: JSON.stringify(input.tags), notes: input.notes || null,
          addedBy: user.userId,
        },
      })
      await logAudit({ actorUserId: user.userId, action: 'TALENT_POOL_MEMBER_ADDED', resourceType: 'TalentPoolMember', resourceId: member.id })
      return Response.json({ success: true, member })
    }
    const member = await prisma.talentPoolMember.findUnique({ where: { id: input.memberId } })
    if (!member) throw new AuthzError('Talent-pool member not found', 404)
    await prisma.talentPoolMember.update({ where: { id: member.id }, data: { status: 'REMOVED', notes: `${member.notes || ''}\nRemoval: ${input.reason}`.trim() } })
    await logAudit({ actorUserId: user.userId, action: 'TALENT_POOL_MEMBER_REMOVED', resourceType: 'TalentPoolMember', resourceId: member.id, reason: input.reason })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
