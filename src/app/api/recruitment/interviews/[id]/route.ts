import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { expectedVersion, staleRecord } from '@/lib/concurrency'
import { hasPermission } from '@/lib/rbac'
import { applicationAccess } from '@/lib/recruitment-access'

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd: z.coerce.date().optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  format: z.enum(['PHYSICAL', 'VIRTUAL', 'HYBRID']).optional(),
  venue: z.string().max(500).nullable().optional(),
  meetingLink: z.string().url().nullable().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'ATTENDED', 'DID_NOT_ATTEND', 'CANCELLED']).optional(),
  lockVersion: z.coerce.number().int().positive().optional(),
  panelUserIds: z.array(z.string().min(1)).min(1).optional(),
  questions: z
    .array(
      z.object({
        question: z.string().trim().min(1),
        competency: z.string().max(200).optional(),
        guidance: z.string().max(2000).optional(),
        expectedEvidence: z.string().max(2000).optional(),
        redFlags: z.string().max(2000).optional(),
        maximumScore: z.coerce.number().positive(),
        commentRequired: z.boolean().default(true),
      })
    )
    .min(1)
    .optional(),
})

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const canManage = await hasPermission(user.userId, 'interview.manage')
    const interview = await prisma.interview.findUnique({
      where: { id: params.id },
      include: {
        application: {
          include: { candidate: { include: { user: { select: { email: true, phone: true } } } }, vacancy: true },
        },
        panelMembers: { include: { user: { select: { id: true, email: true } }, submission: true } },
        questions: { orderBy: { displayOrder: 'asc' } },
        panelSubmissions: true,
      },
    })
    if (!interview) throw new AuthzError('Interview not found', 404)
    const access = await applicationAccess(user.userId, interview.applicationId)
    if (
      !interview.panelMembers.some((member) => member.userId === user.userId) &&
      (!canManage || (!access.readAll && !access.vacancyOwner && !access.assignedReviewer))
    )
      throw new AuthzError('Forbidden', 403)
    if (!canManage)
      interview.panelSubmissions = interview.panelSubmissions.filter((submission) =>
        interview.panelMembers.some((member) => member.id === submission.panelMemberId && member.userId === user.userId)
      )
    return Response.json({ interview })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('interview.manage')
    const input = await parseBody(request, updateSchema)
    const existing = await prisma.interview.findUnique({
      where: { id: params.id },
      include: { panelSubmissions: { select: { id: true } } },
    })
    if (!existing) throw new AuthzError('Interview not found', 404)
    const access = await applicationAccess(user.userId, existing.applicationId)
    if (!access.readAll && !access.vacancyOwner && !access.assignedReviewer)
      throw new AuthzError('Interview not found or outside your assigned scope', 404)
    if ((input.panelUserIds || input.questions) && existing.panelSubmissions.length > 0)
      throw new AuthzError('Panel and questions cannot be replaced after scoring has begun', 409)
    const start = input.scheduledStart ?? existing.scheduledStart
    const end = input.scheduledEnd ?? existing.scheduledEnd
    if (end <= start) throw new AuthzError('Interview end must follow start', 422)
    const version = expectedVersion(request, input) ?? existing.lockVersion
    const interview = await prisma.$transaction(async (tx) => {
      const claimed = await tx.interview.updateMany({
        where: { id: params.id, lockVersion: version },
        data: { lockVersion: { increment: 1 } },
      })
      if (!claimed.count) staleRecord()
      if (input.panelUserIds) {
        await tx.interviewPanelMember.deleteMany({ where: { interviewId: params.id } })
        await tx.interviewPanelMember.createMany({
          data: input.panelUserIds.map((userId, index) => ({
            interviewId: params.id,
            userId,
            panelRole: index === 0 ? 'CHAIR' : 'MEMBER',
          })),
        })
      }
      if (input.questions) {
        await tx.interviewQuestion.deleteMany({ where: { interviewId: params.id } })
        await tx.interviewQuestion.createMany({
          data: input.questions.map((question, index) => ({
            interviewId: params.id,
            ...question,
            competency: question.competency || null,
            guidance: question.guidance || null,
            expectedEvidence: question.expectedEvidence || null,
            redFlags: question.redFlags || null,
            displayOrder: index,
          })),
        })
      }
      return tx.interview.update({
        where: { id: params.id },
        data: {
          title: input.title,
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
          timezone: input.timezone,
          format: input.format,
          venue: input.venue,
          meetingLink: input.meetingLink,
          status: input.status,
        },
        include: { panelMembers: true, questions: { orderBy: { displayOrder: 'asc' } } },
      })
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'INTERVIEW_UPDATED',
      resourceType: 'Interview',
      resourceId: params.id,
      previousValue: existing,
      newValue: input,
    })
    return Response.json({ success: true, interview })
  } catch (error) {
    return authzResponse(error)
  }
}
