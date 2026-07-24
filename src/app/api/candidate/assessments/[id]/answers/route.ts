import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { boundedAnswerValueSchema, parseBody } from '@/lib/validation'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requireUser()
    const { answers } = await parseBody(request, z.object({
      answers: z.array(z.object({ questionId: z.string().min(1), answer: boundedAnswerValueSchema })).max(200),
    }))
    const record = await prisma.candidateAssessment.findFirst({ where: { id: params.id, application: { candidate: { userId: user.userId } } }, include: { assessment: { include: { questions: true } } } })
    if (!record) throw new AuthzError('Assessment not found', 404)
    if (record.status !== 'IN_PROGRESS' || !record.startedAt) throw new AuthzError('Assessment is not in progress', 409)
    const end = Math.min(record.startedAt.getTime() + record.assessment.durationMinutes * 60000, record.assessment.closesAt?.getTime() ?? Infinity)
    if (Date.now() >= end) throw new AuthzError('Assessment time has expired', 409)
    const allowed = new Set(record.assessment.questions.map((question) => question.id))
    if (answers.some((answer) => !allowed.has(answer.questionId))) throw new AuthzError('An answer does not belong to this assessment', 422)
    const fileQuestionIds = new Set(record.assessment.questions.filter((question) => question.questionType === 'FILE').map((question) => question.id))
    const fileAnswers = answers.filter((answer) => fileQuestionIds.has(answer.questionId) && answer.answer)
    if (fileAnswers.length) {
      const fileIds = fileAnswers.map((answer) => String(answer.answer))
      const ownedFiles = await prisma.fileAsset.count({
        where: { id: { in: fileIds }, ownerUserId: user.userId, virusScanStatus: 'CLEAN' },
      })
      if (ownedFiles !== new Set(fileIds).size) throw new AuthzError('An assessment file is unavailable or unsafe', 400)
    }
    await prisma.$transaction(async (tx) => {
      // Claim the still-active assessment inside the same transaction as the
      // answer writes. A concurrent final submission changes the status and
      // makes this claim fail, preventing late autosave from overwriting the
      // answers that were graded and locked.
      const active = await tx.candidateAssessment.updateMany({
        where: { id: record.id, status: 'IN_PROGRESS', startedAt: record.startedAt },
        data: { status: 'IN_PROGRESS' },
      })
      if (active.count !== 1) throw new AuthzError('Assessment was submitted or changed; answers were not saved', 409)
      for (const answer of answers) {
        await tx.candidateAssessmentAnswer.upsert({
          where: {
            candidateAssessmentId_assessmentQuestionId: {
              candidateAssessmentId: record.id,
              assessmentQuestionId: answer.questionId,
            },
          },
          update: { answerJson: JSON.stringify(answer.answer) },
          create: {
            candidateAssessmentId: record.id,
            assessmentQuestionId: answer.questionId,
            answerJson: JSON.stringify(answer.answer),
          },
        })
      }
    })
    return Response.json({ success: true, savedAt: new Date() })
  } catch (error) { return authzResponse(error) }
}
