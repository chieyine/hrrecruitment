import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { deterministicShuffle } from '@/lib/deterministic-shuffle'

/**
 * The candidate's submitted assessment answers, for the person marking it.
 *
 * Without this a marker was asked for a score between 0 and 100 with no way to
 * read what the candidate wrote — the answers were stored and never read back
 * anywhere in the application. `PATCH` additionally records per-question marks
 * so a long-text assessment can be marked question by question rather than
 * with one overall guess.
 */

/** Render a stored answer as something displayable, whatever shape it was saved in. */
function presentAnswer(answerJson: string | null): { value: unknown; display: string } {
  if (answerJson === null) return { value: null, display: '— no answer given —' }
  let value: unknown = answerJson
  try {
    value = JSON.parse(answerJson)
  } catch {
    // Older rows stored the raw string rather than JSON; show it as-is.
  }
  if (value === null || value === undefined || value === '') return { value, display: '— no answer given —' }
  if (Array.isArray(value)) return { value, display: value.map(String).join(', ') }
  if (typeof value === 'boolean') return { value, display: value ? 'True' : 'False' }
  return { value, display: String(value) }
}

function parseOptions(optionsJson: string | null): string[] {
  if (!optionsJson) return []
  try {
    const parsed = JSON.parse(optionsJson)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

const AUTO_MARKED = new Set(['MCQ', 'MULTISELECT', 'TRUEFALSE', 'NUMBER'])

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('assessment.manage')

    const record = await prisma.candidateAssessment.findUnique({
      where: { id: params.id },
      include: {
        assessment: { include: { questions: { orderBy: { displayOrder: 'asc' } } } },
        answers: true,
        application: {
          select: {
            id: true,
            candidate: { select: { legalFirstName: true, lastName: true } },
            vacancy: { select: { title: true, referenceNumber: true } },
          },
        },
      },
    })
    if (!record) throw new AuthzError('Candidate assessment not found', 404)
    if (record.assignedReviewerUserId && record.assignedReviewerUserId !== user.userId && !user.roles.includes('HR_MANAGER'))
      throw new AuthzError('This assessment is assigned to another reviewer', 403)

    // Answers may only be inspected once the candidate has finished, so a
    // marker cannot watch a live attempt.
    const readable = ['SUBMITTED', 'AUTO_SUBMITTED', 'AWAITING_APPROVAL', 'PASSED', 'FAILED']
    if (!readable.includes(record.status)) {
      throw new AuthzError('This assessment has not been submitted yet', 409)
    }

    const answerByQuestion = new Map(record.answers.map((answer) => [answer.assessmentQuestionId, answer]))

    // Present questions in the same order the candidate saw them, so a marker
    // reading a script alongside the screen is not confused.
    // Same seed the candidate's runner used (lib/deterministic-shuffle keyed on
    // the assignment id), so the marker sees the candidate's exact ordering.
    const ordered = record.assessment.randomizeQuestions
      ? deterministicShuffle(record.assessment.questions, record.id)
      : record.assessment.questions

    const questions = ordered.map((question, index) => {
      const answer = answerByQuestion.get(question.id)
      const presented = presentAnswer(answer?.answerJson ?? null)
      const expected = question.correctAnswerJson ? presentAnswer(question.correctAnswerJson) : null
      return {
        position: index + 1,
        questionId: question.id,
        questionType: question.questionType,
        prompt: question.prompt,
        options: parseOptions(question.optionsJson),
        maximumScore: question.maximumScore,
        answer: presented.value,
        answerDisplay: presented.display,
        answered: presented.display !== '— no answer given —',
        // Only meaningful for auto-markable types; a model answer for free text
        // would be misleading next to a candidate's prose.
        expectedAnswerDisplay: expected && AUTO_MARKED.has(question.questionType) ? expected.display : null,
        requiresHumanMark: !AUTO_MARKED.has(question.questionType) || answer?.score === null,
        score: answer?.score ?? null,
        markerComment: answer?.markerComment ?? null,
      }
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'ASSESSMENT_ANSWERS_VIEWED',
      resourceType: 'CandidateAssessment',
      resourceId: record.id,
    })

    return NextResponse.json({
      candidateAssessment: {
        id: record.id,
        status: record.status,
        submittedAt: record.submittedAt,
        autoSubmitted: record.autoSubmitted,
        score: record.score,
        passed: record.passed,
        markerComment: record.markerComment,
      },
      assessment: {
        id: record.assessment.id,
        title: record.assessment.title,
        type: record.assessment.type,
        passMark: record.assessment.passMark,
      },
      candidate: {
        name: `${record.application.candidate.legalFirstName} ${record.application.candidate.lastName}`,
        vacancy: `${record.application.vacancy.title} (${record.application.vacancy.referenceNumber})`,
      },
      questions,
      totals: {
        questions: questions.length,
        answered: questions.filter((question) => question.answered).length,
        awaitingHumanMark: questions.filter((question) => question.requiresHumanMark && question.score === null).length,
        maximumScore: questions.reduce((sum, question) => sum + question.maximumScore, 0),
        awardedScore: questions.reduce((sum, question) => sum + (question.score ?? 0), 0),
      },
    })
  } catch (error) {
    return authzResponse(error)
  }
}

const patchSchema = z.object({
  marks: z
    .array(
      z.object({
        questionId: z.string().min(1),
        score: z.coerce.number().min(0),
        comment: z.string().trim().max(2000).optional(),
      })
    )
    .min(1)
    .max(200),
})

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('assessment.manage')
    const { marks } = await parseBody(request, patchSchema)

    const record = await prisma.candidateAssessment.findUnique({
      where: { id: params.id },
      include: { assessment: { include: { questions: { select: { id: true, maximumScore: true } } } } },
    })
    if (!record) throw new AuthzError('Candidate assessment not found', 404)
    if (record.assignedReviewerUserId && record.assignedReviewerUserId !== user.userId)
      throw new AuthzError('This assessment is assigned to another reviewer', 403)
    if (['AWAITING_APPROVAL', 'PASSED', 'FAILED'].includes(record.status)) {
      throw new AuthzError('This assessment is already marked. Reset it to mark again.', 409)
    }

    const ceilings = new Map(record.assessment.questions.map((question) => [question.id, question.maximumScore]))
    for (const mark of marks) {
      const ceiling = ceilings.get(mark.questionId)
      if (ceiling === undefined) throw new AuthzError('A mark refers to a question outside this assessment', 400)
      if (mark.score > ceiling) {
        throw new AuthzError(`A score of ${mark.score} exceeds the ${ceiling} available for that question`, 400)
      }
    }

    await prisma.$transaction(
      marks.map((mark) =>
        prisma.candidateAssessmentAnswer.update({
          where: {
            candidateAssessmentId_assessmentQuestionId: {
              candidateAssessmentId: record.id,
              assessmentQuestionId: mark.questionId,
            },
          },
          data: { score: mark.score, markerComment: mark.comment || null },
        })
      )
    )

    await logAudit({
      actorUserId: user.userId,
      action: 'ASSESSMENT_QUESTIONS_MARKED',
      resourceType: 'CandidateAssessment',
      resourceId: record.id,
      newValue: { marked: marks.length },
    })

    // Report the running total so the marker can carry it into the overall score.
    const answers = await prisma.candidateAssessmentAnswer.findMany({
      where: { candidateAssessmentId: record.id },
      select: { score: true },
    })
    const awarded = answers.reduce((sum, answer) => sum + (answer.score ?? 0), 0)
    const maximum = record.assessment.questions.reduce((sum, question) => sum + question.maximumScore, 0)

    return NextResponse.json({
      success: true,
      awardedScore: awarded,
      maximumScore: maximum,
      percentage: maximum > 0 ? Math.round((awarded / maximum) * 10000) / 100 : null,
    })
  } catch (error) {
    return authzResponse(error)
  }
}
