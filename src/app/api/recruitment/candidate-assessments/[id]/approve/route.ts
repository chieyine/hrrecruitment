import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { refreshApplicationFinalScore } from '@/lib/recruitment-scoring.server'
import { requireOpenRecruitmentFile } from '@/lib/recruitment-file'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const user = await requirePermission('assessment.manage')
    const input = await parseBody(request, z.object({ comment: z.string().trim().min(5).max(2000) }))
    const record = await prisma.candidateAssessment.findUnique({
      where: { id },
      include: { assessment: true, application: { select: { id: true, internalStatus: true } } },
    })
    if (!record) throw new AuthzError('Assessment outcome not found', 404)
    requireOpenRecruitmentFile(record.application.internalStatus)
    if (record.status !== 'AWAITING_APPROVAL' || record.score == null || record.passed == null)
      throw new AuthzError('This assessment outcome is not awaiting approval', 409)
    if (record.markerUserId === user.userId)
      throw new AuthzError('A different user must approve the assessment outcome', 409)
    const finalStatus = record.passed ? 'PASSED' : 'FAILED'
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.candidateAssessment.updateMany({
        where: { id, status: 'AWAITING_APPROVAL', resultApprovedAt: null },
        data: {
          status: finalStatus,
          resultApprovedBy: user.userId,
          resultApprovedAt: new Date(),
          resultApprovalComment: input.comment,
          resultApprovalSource: 'INDEPENDENT_REVIEW',
        },
      })
      if (claimed.count !== 1) throw new AuthzError('The outcome was already approved or changed', 409)
      const applicationChanged = await tx.application.updateMany({
        where: { id: record.applicationId, internalStatus: 'ASSESSMENT_INVITED' },
        data: { assessmentScore: record.score, internalStatus: 'ASSESSMENT_COMPLETED', candidateVisibleStatus: 'ASSESSMENT_COMPLETED', lockVersion: { increment: 1 } },
      })
      if (applicationChanged.count !== 1) throw new AuthzError('The application is no longer awaiting this outcome', 409)
    })
    await refreshApplicationFinalScore(record.applicationId)
    await logAudit({
      actorUserId: user.userId,
      action: 'ASSESSMENT_RESULT_APPROVED',
      resourceType: 'CandidateAssessment',
      resourceId: id,
      newValue: { score: record.score, passed: record.passed, comment: input.comment },
    })
    return Response.json({ success: true, status: finalStatus })
  } catch (error) {
    return authzResponse(error)
  }
}
