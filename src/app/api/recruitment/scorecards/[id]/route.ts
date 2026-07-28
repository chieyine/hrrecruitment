import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'

async function accessible(id: string, userId: string) {
  const scorecard = await prisma.candidateScorecard.findUnique({
    where: { id },
    include: {
      scorecardTemplate: { include: { criteria: true } },
      criterionScores: true,
      application: { include: { vacancy: true } },
    },
  })
  if (!scorecard) throw new AuthzError('Scorecard not found', 404)
  if (
    scorecard.reviewerUserId !== userId &&
    scorecard.application.assignedReviewerId !== userId &&
    scorecard.application.vacancy.ownerUserId !== userId &&
    !(await hasPermission(userId, 'application.read.all'))
  )
    throw new AuthzError('Forbidden', 403)
  return scorecard
}
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('scorecard.submit')
    return Response.json({ scorecard: await accessible(params.id, user.userId) })
  } catch (error) {
    return authzResponse(error)
  }
}
