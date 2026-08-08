import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { applicationAccess } from '@/lib/recruitment-access'
import { requireOpenRecruitmentFile } from '@/lib/recruitment-file'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('assessment.manage')
    const { reason } = await parseBody(request, z.object({ reason: z.string().trim().min(10).max(1000) }))
    const record = await prisma.candidateAssessment.findUnique({
      where: { id: params.id },
      include: { assessment: true, application: { select: { internalStatus: true } } },
    })
    if (!record) throw new AuthzError('Assessment assignment not found', 404)
    requireOpenRecruitmentFile(record.application.internalStatus)
    const access = await applicationAccess(user.userId, record.applicationId)
    if (!access.readAll && !access.vacancyOwner && !access.assignedReviewer)
      throw new AuthzError('Assessment assignment not found or outside your assigned scope', 404)
    if (!['SUBMITTED', 'AUTO_SUBMITTED', 'AWAITING_APPROVAL', 'PASSED', 'FAILED'].includes(record.status))
      throw new AuthzError('Only a completed attempt can be reset', 409)
    const priorAttempts = await prisma.auditLog.count({
      where: { resourceType: 'CandidateAssessment', resourceId: record.id, action: 'ASSESSMENT_SUBMITTED' },
    })
    if (priorAttempts >= record.assessment.maximumAttempts)
      throw new AuthzError(
        `The configured maximum of ${record.assessment.maximumAttempts} attempt(s) has been reached`,
        409
      )
    await prisma.$transaction([
      prisma.candidateAssessmentAnswer.deleteMany({ where: { candidateAssessmentId: record.id } }),
      prisma.candidateAssessment.update({
        where: { id: record.id },
        data: {
          status: 'INVITED',
          startedAt: null,
          submittedAt: null,
          autoSubmitted: false,
          submittedLate: false,
          score: null,
          passed: null,
          markerUserId: null,
          markerComment: null,
          resultApprovedBy: null,
          resultApprovedAt: null,
          resultApprovalComment: null,
        },
      }),
      prisma.application.update({
        where: { id: record.applicationId },
        data: {
          internalStatus: 'ASSESSMENT_INVITED',
          candidateVisibleStatus: 'ASSESSMENT_INVITED',
          assessmentScore: null,
          finalScore: null,
          lockVersion: { increment: 1 },
        },
      }),
    ])
    await logAudit({
      actorUserId: user.userId,
      action: 'ASSESSMENT_ATTEMPT_RESET',
      resourceType: 'CandidateAssessment',
      resourceId: record.id,
      reason,
      newValue: { nextAttempt: priorAttempts + 1, maximumAttempts: record.assessment.maximumAttempts },
    })
    return Response.json({
      success: true,
      attemptsUsed: priorAttempts,
      attemptsRemaining: record.assessment.maximumAttempts - priorAttempts,
    })
  } catch (error) {
    return authzResponse(error)
  }
}
