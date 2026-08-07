import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { createNotification } from '@/lib/notifications'
import { logAudit } from '@/lib/audit'
import { requireOpenRecruitmentFile } from '@/lib/recruitment-file'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireRole('RECRUITMENT_OFFICER', 'HR_MANAGER')
    const { message } = await parseBody(request, z.object({ message: z.string().max(2000).optional() }))
    const interview = await prisma.interview.findUnique({
      where: { id: params.id },
      include: { application: { include: { candidate: true } } },
    })
    if (!interview) throw new AuthzError('Interview not found', 404)
    requireOpenRecruitmentFile(interview.application.internalStatus)
    if (interview.status === 'CANCELLED') throw new AuthzError('A cancelled interview cannot be invited', 409)
    if (!['SHORTLISTED', 'ASSESSMENT_COMPLETED', 'INTERVIEW_INVITED'].includes(interview.application.internalStatus)) {
      throw new AuthzError(`Cannot invite from ${interview.application.internalStatus}`, 409)
    }
    if (interview.application.internalStatus !== 'INTERVIEW_INVITED') {
      await prisma.$transaction([
        prisma.application.update({
          where: { id: interview.applicationId },
          data: {
            internalStatus: 'INTERVIEW_INVITED',
            candidateVisibleStatus: 'INTERVIEW_INVITED',
            lockVersion: { increment: 1 },
          },
        }),
        prisma.applicationStageHistory.create({
          data: {
            applicationId: interview.applicationId,
            fromStatus: interview.application.internalStatus,
            toStatus: 'INTERVIEW_INVITED',
            changedBy: user.userId,
            reason: 'Candidate invitation sent',
          },
        }),
      ])
    }
    if (interview.application.candidate.userId) {
      await createNotification({
        userId: interview.application.candidate.userId,
        type: 'INTERVIEW_INVITED',
        title: 'Interview invitation',
        body:
          message?.trim() ||
          `You have been invited to ${interview.title} on ${interview.scheduledStart.toLocaleString('en-NG', { timeZone: interview.timezone })}.`,
        applicationId: interview.applicationId,
      })
    }
    await logAudit({
      actorUserId: user.userId,
      action: 'INTERVIEW_INVITATION_SENT',
      resourceType: 'Interview',
      resourceId: interview.id,
    })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
