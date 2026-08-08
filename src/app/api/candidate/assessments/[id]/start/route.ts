import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { deterministicShuffle } from '@/lib/deterministic-shuffle'

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const record = await prisma.candidateAssessment.findFirst({
      where: { id: params.id, application: { candidate: { userId: user.userId } } },
      include: { assessment: { include: { questions: { orderBy: { displayOrder: 'asc' } } } }, answers: true },
    })
    if (!record) throw new AuthzError('Assessment not found', 404)
    const application = await prisma.application.findUnique({
      where: { id: record.applicationId },
      select: { internalStatus: true },
    })
    if (!application || application.internalStatus !== 'ASSESSMENT_INVITED') {
      throw new AuthzError('This application is no longer awaiting an assessment', 409)
    }
    if (['SUBMITTED', 'AUTO_SUBMITTED', 'AWAITING_APPROVAL', 'PASSED', 'FAILED'].includes(record.status))
      throw new AuthzError('Assessment has already been submitted', 409)
    const now = new Date()
    if (record.assessment.opensAt && record.assessment.opensAt > now)
      throw new AuthzError('Assessment is not open yet', 409)
    if (record.assessment.closesAt && record.assessment.closesAt <= now)
      throw new AuthzError('Assessment has closed', 409)
    let startedAt = record.startedAt
    if (['INVITED', 'NOT_STARTED'].includes(record.status)) {
      startedAt = now
      const started = await prisma.candidateAssessment.updateMany({
        where: { id: record.id, status: record.status, startedAt: null },
        data: { startedAt, status: 'IN_PROGRESS' },
      })
      if (started.count !== 1) throw new AuthzError('Assessment start changed; refresh and try again', 409)
      await logAudit({
        actorUserId: user.userId,
        action: 'ASSESSMENT_STARTED',
        resourceType: 'CandidateAssessment',
        resourceId: record.id,
      })
    }
    if (record.status !== 'IN_PROGRESS' && !['INVITED', 'NOT_STARTED'].includes(record.status))
      throw new AuthzError('Assessment cannot be started', 409)
    const durationEnd = (startedAt ?? now).getTime() + record.assessment.durationMinutes * 60_000
    const closingEnd = record.assessment.closesAt?.getTime() ?? Number.POSITIVE_INFINITY
    const secondsRemaining = Math.max(0, Math.floor((Math.min(durationEnd, closingEnd) - now.getTime()) / 1000))
    const savedAnswers = Object.fromEntries(
      record.answers.map((answer) => {
        try {
          return [answer.assessmentQuestionId, answer.answerJson ? JSON.parse(answer.answerJson) : '']
        } catch {
          return [answer.assessmentQuestionId, answer.answerJson ?? '']
        }
      })
    )
    const questions = record.assessment.randomizeQuestions
      ? deterministicShuffle(record.assessment.questions, record.id)
      : record.assessment.questions
    return Response.json({
      assessment: {
        id: record.id,
        title: record.assessment.title,
        description: record.assessment.description,
        status: 'IN_PROGRESS',
        secondsRemaining,
        autoSubmit: record.assessment.autoSubmit,
        savedAnswers,
        questions: questions.map((question) => ({
          id: question.id,
          questionType: question.questionType,
          prompt: question.prompt,
          optionsJson: question.optionsJson,
        })),
      },
    })
  } catch (error) {
    return authzResponse(error)
  }
}
