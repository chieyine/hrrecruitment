import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { deterministicShuffle } from '@/lib/deterministic-shuffle'

/**
 * A candidate's read-only view of what they submitted.
 *
 * Deliberately narrower than the marker's view: it never returns correct
 * answers, per-question marks, or marker comments, because a candidate could
 * otherwise learn the answer key from their own submission.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()

    const record = await prisma.candidateAssessment.findFirst({
      where: { id: params.id, application: { candidate: { userId: user.userId } } },
      include: {
        assessment: {
          select: {
            title: true,
            type: true,
            randomizeQuestions: true,
            questions: {
              orderBy: { displayOrder: 'asc' },
              select: { id: true, prompt: true, questionType: true, displayOrder: true },
            },
          },
        },
        answers: { select: { assessmentQuestionId: true, answerJson: true } },
      },
    })
    if (!record) throw new AuthzError('Assessment not found', 404)

    if (!['SUBMITTED', 'AUTO_SUBMITTED', 'AWAITING_APPROVAL', 'PASSED', 'FAILED'].includes(record.status)) {
      throw new AuthzError('You can review your answers once the assessment is submitted', 409)
    }

    const answerByQuestion = new Map(record.answers.map((answer) => [answer.assessmentQuestionId, answer.answerJson]))
    const ordered = record.assessment.randomizeQuestions
      ? deterministicShuffle(record.assessment.questions, record.id)
      : record.assessment.questions

    return NextResponse.json({
      assessment: { title: record.assessment.title, type: record.assessment.type },
      status: record.status,
      submittedAt: record.submittedAt,
      autoSubmitted: record.autoSubmitted,
      // Released only once marking is complete.
      score: ['PASSED', 'FAILED'].includes(record.status) ? record.score : null,
      passed: ['PASSED', 'FAILED'].includes(record.status) ? record.passed : null,
      questions: ordered.map((question, index) => {
        const raw = answerByQuestion.get(question.id) ?? null
        let value: unknown = raw
        if (raw !== null) {
          try {
            value = JSON.parse(raw)
          } catch {
            /* older rows stored the raw string */
          }
        }
        return {
          position: index + 1,
          prompt: question.prompt,
          questionType: question.questionType,
          answerDisplay:
            value === null || value === undefined || value === ''
              ? '— you did not answer this question —'
              : Array.isArray(value)
                ? value.map(String).join(', ')
                : typeof value === 'boolean'
                  ? value
                    ? 'True'
                    : 'False'
                  : String(value),
        }
      }),
    })
  } catch (error) {
    return authzResponse(error)
  }
}
