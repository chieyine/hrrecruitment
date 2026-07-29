import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const record = await prisma.candidateAssessment.findFirst({
      where: { id: params.id, application: { candidate: { userId: user.userId } } },
      include: { assessment: true },
    })
    if (!record) throw new AuthzError('Assessment not found', 404)
    return Response.json({
      assessment: {
        id: record.id,
        title: record.assessment.title,
        description: record.assessment.description,
        status: record.status,
        durationMinutes: record.assessment.durationMinutes,
        autoSubmit: record.assessment.autoSubmit,
        opensAt: record.assessment.opensAt,
        closesAt: record.assessment.closesAt,
        startedAt: record.startedAt,
        submittedAt: record.submittedAt,
      },
    })
  } catch (error) {
    return authzResponse(error)
  }
}
