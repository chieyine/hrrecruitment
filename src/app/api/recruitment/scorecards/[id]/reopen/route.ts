import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('scorecard.reopen')
    const { reason } = await parseBody(request, z.object({ reason: z.string().trim().min(5).max(1000) }))
    const scorecard = await prisma.candidateScorecard.findUnique({ where: { id: params.id } })
    if (!scorecard) throw new AuthzError('Scorecard not found', 404)
    if (scorecard.status !== 'SUBMITTED') throw new AuthzError('Only a submitted scorecard can be reopened', 409)
    await prisma.candidateScorecard.update({
      where: { id: scorecard.id },
      data: { status: 'REOPENED', reopenedBy: user.userId, reopenedAt: new Date(), reopenReason: reason },
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'SCORECARD_REOPENED',
      resourceType: 'CandidateScorecard',
      resourceId: scorecard.id,
      reason,
    })
    return Response.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
