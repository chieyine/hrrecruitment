import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { requireOpenRecruitmentFile } from '@/lib/recruitment-file'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const user = await requireRole('HR_MANAGER')
    const input = await parseBody(request, z.object({ comment: z.string().trim().min(5).max(2000) }))
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { panelMembers: true, questions: true, application: { select: { internalStatus: true } } },
    })
    if (!interview) throw new AuthzError('Interview not found', 404)
    requireOpenRecruitmentFile(interview.application.internalStatus)
    if (interview.createdBy === user.userId)
      throw new AuthzError('Panels created by the HR Manager are approved automatically', 409)
    if (interview.panelApprovedAt) throw new AuthzError('This panel has already been approved', 409)
    if (!interview.panelMembers.length) throw new AuthzError('Add at least one panel member', 409)
    if (!interview.panelMembers.some((member) => member.panelRole === 'CHAIR')) throw new AuthzError('Nominate a panel chair', 409)
    if (!interview.questions.some((question) => question.isSafeguarding)) throw new AuthzError('Add a safeguarding question before approval', 409)
    await prisma.interview.update({
      where: { id },
      data: { panelApprovedAt: new Date(), panelApprovedBy: user.userId, panelApprovalComment: input.comment },
    })
    await logAudit({ actorUserId: user.userId, action: 'INTERVIEW_PANEL_APPROVED', resourceType: 'Interview', resourceId: id, newValue: { panelUserIds: interview.panelMembers.map((member) => member.userId), comment: input.comment } })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
