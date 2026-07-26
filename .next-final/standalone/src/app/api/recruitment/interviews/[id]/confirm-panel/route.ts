import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { applicationAccess } from '@/lib/recruitment-access'
import { refreshApplicationFinalScore } from '@/lib/recruitment-scoring.server'
import { hasPermission } from '@/lib/rbac'

const schema = z.object({
  comment: z.string().trim().max(2000).optional(),
}).superRefine((input, context) => {
  if (input.comment !== undefined && input.comment.length < 5) {
    context.addIssue({ code: 'custom', path: ['comment'], message: 'Give a short confirmation note or leave it blank' })
  }
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requireUser()
    const input = await parseBody(request, schema)
    const interview = await prisma.interview.findUnique({
      where: { id: params.id },
      include: { panelMembers: true, panelSubmissions: true, application: { select: { internalStatus: true } } },
    })
    if (!interview) throw new AuthzError('Interview not found', 404)
    const canManage = await hasPermission(user.userId, 'interview.manage')
    const access = canManage ? await applicationAccess(user.userId, interview.applicationId) : { readAll: false, vacancyOwner: false }
    const chair = interview.panelMembers.find((member) => member.panelRole === 'CHAIR')
    if (chair?.userId !== user.userId && !access.readAll && !access.vacancyOwner) throw new AuthzError('Only the panel chair or responsible recruitment team may confirm this outcome', 403)
    if (interview.panelMembers.length === 0 || interview.panelSubmissions.length !== interview.panelMembers.length) throw new AuthzError('Every panel member must submit an independent score before confirmation', 409)
    if (interview.panelConfirmedAt) throw new AuthzError('This panel outcome has already been confirmed', 409)
    if (['WITHDRAWN', 'CANCELLED'].includes(interview.application.internalStatus)) throw new AuthzError('This application is closed', 409)
    if (interview.varianceFlag && !input.comment) throw new AuthzError('Explain how the panel resolved the score variance before confirming', 422)

    const average = interview.panelSubmissions.reduce((sum, item) => sum + item.totalScore, 0) / interview.panelSubmissions.length
    await prisma.$transaction([
      prisma.interview.update({
        where: { id: interview.id },
        data: { status: 'ATTENDED', panelConfirmedAt: new Date(), panelConfirmedBy: user.userId, lockVersion: { increment: 1 } },
      }),
      prisma.application.update({
        where: { id: interview.applicationId },
        data: interview.application.internalStatus === 'INTERVIEW_INVITED'
          ? { interviewScore: average, internalStatus: 'INTERVIEW_COMPLETED', candidateVisibleStatus: 'INTERVIEW_COMPLETED', lockVersion: { increment: 1 } }
          : { interviewScore: average, lockVersion: { increment: 1 } },
      }),
      prisma.workItem.updateMany({
        where: { deduplicationKey: `interview-panel-confirm:${interview.id}` },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }),
    ])
    await refreshApplicationFinalScore(interview.applicationId)
    await logAudit({
      actorUserId: user.userId,
      action: 'INTERVIEW_PANEL_CONFIRMED',
      resourceType: 'Interview',
      resourceId: interview.id,
      reason: input.comment,
      newValue: { average, varianceFlag: interview.varianceFlag },
    })
    return Response.json({ success: true, average })
  } catch (error) {
    return authzResponse(error)
  }
}
