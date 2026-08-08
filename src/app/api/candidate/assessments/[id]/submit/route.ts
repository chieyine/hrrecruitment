import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody, assessmentSubmitSchema } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

/** Normalise an answer value into a comparable, order-insensitive form. */
function normalize(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify([...value.map((v) => String(v).trim().toLowerCase())].sort())
  }
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value).trim().toLowerCase()
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const { answers } = await parseBody(request, assessmentSubmitSchema)

    const candidateAssessment = await prisma.candidateAssessment.findUnique({
      where: { id: params.id },
      include: {
        assessment: { include: { questions: true } },
        application: { include: { candidate: true, accommodationRequests: { where: { status: { in: ['APPROVED', 'PARTIALLY_APPROVED'] } }, take: 1 } } },
      },
    })

    if (!candidateAssessment) {
      return NextResponse.json({ error: 'Assessment record not found' }, { status: 404 })
    }

    // Ownership: assessment must belong to the signed-in candidate (fixes IDOR).
    if (candidateAssessment.application.candidate.userId !== user.userId) {
      throw new AuthzError('Forbidden', 403)
    }
    if (candidateAssessment.application.internalStatus !== 'ASSESSMENT_INVITED') {
      throw new AuthzError('This application is no longer awaiting an assessment', 409)
    }

    // Guard against re-submission.
    if (['SUBMITTED', 'AUTO_SUBMITTED', 'AWAITING_APPROVAL', 'PASSED', 'FAILED'].includes(candidateAssessment.status)) {
      return NextResponse.json({ error: 'Assessment has already been submitted' }, { status: 409 })
    }
    if (candidateAssessment.status !== 'IN_PROGRESS' || !candidateAssessment.startedAt)
      return NextResponse.json({ error: 'Start the assessment before submitting it' }, { status: 409 })
    const now = new Date()
    const accommodationMinutes = candidateAssessment.application.accommodationRequests.length
      ? candidateAssessment.assessment.accommodationExtraMinutes
      : 0
    const assessmentEnd = new Date(candidateAssessment.startedAt.getTime() + (candidateAssessment.assessment.durationMinutes + accommodationMinutes) * 60_000)
    if (candidateAssessment.assessment.opensAt && now < candidateAssessment.assessment.opensAt)
      return NextResponse.json({ error: 'Assessment is not open yet' }, { status: 409 })
    const graceMinutes = candidateAssessment.assessment.lateSubmissionPolicy === 'GRACE_PERIOD' ? candidateAssessment.assessment.lateGraceMinutes : 0
    const finalDeadline = new Date(assessmentEnd.getTime() + graceMinutes * 60_000)
    const timedOut = now >= finalDeadline || Boolean(candidateAssessment.assessment.closesAt && now >= new Date(candidateAssessment.assessment.closesAt.getTime() + graceMinutes * 60_000))
    if (timedOut && !candidateAssessment.assessment.autoSubmit && candidateAssessment.assessment.lateSubmissionPolicy !== 'HR_APPROVAL')
      return NextResponse.json({ error: 'The assessment submission window has closed' }, { status: 409 })

    const questions = candidateAssessment.assessment.questions
    // Normalise answers into a list regardless of whether the client sent an
    // array of {questionId, answer} or a { questionId: answer } map.
    const answerList: { questionId: string; answer: unknown }[] = Array.isArray(answers)
      ? answers
      : Object.entries(answers ?? {}).map(([questionId, answer]) => ({ questionId, answer }))
    const answerMap = new Map(answerList.map((a) => [a.questionId, a.answer]))
    const questionIds = new Set(questions.map((question) => question.id))
    if (answerList.some((answer) => !questionIds.has(answer.questionId)))
      return NextResponse.json({ error: 'An answer does not belong to this assessment' }, { status: 422 })
    if (!timedOut) {
      const unanswered = questions.find((question) => {
        const value = answerMap.get(question.id)
        return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
      })
      if (unanswered)
        return NextResponse.json({ error: `Answer the required question: ${unanswered.prompt}` }, { status: 422 })
    }
    const fileQuestionIds = new Set(
      questions.filter((question) => question.questionType === 'FILE').map((question) => question.id)
    )
    const submittedFileIds = answerList
      .filter((answer) => fileQuestionIds.has(answer.questionId) && answer.answer)
      .map((answer) => String(answer.answer))
    if (submittedFileIds.length) {
      const ownedFiles = await prisma.fileAsset.count({
        where: { id: { in: submittedFileIds }, ownerUserId: user.userId, virusScanStatus: 'CLEAN' },
      })
      if (ownedFiles !== new Set(submittedFileIds).size) {
        throw new AuthzError('An assessment file is unavailable or unsafe', 400)
      }
    }

    // Auto-scorable question types are graded against the stored key. Free-text
    // types (SHORTTEXT/LONGTEXT/FILE) are left for a marker (score null).
    const AUTO_TYPES = new Set(['MCQ', 'MULTISELECT', 'TRUEFALSE', 'NUMBER'])
    let awardedAuto = 0
    let possibleAuto = 0
    let requiresMarking = false

    const preparedAnswers = questions.map((question) => {
      const submitted = answerMap.get(question.id)
      const isAuto = AUTO_TYPES.has(question.questionType)
      let scoreForQuestion: number | null = null
      if (isAuto) {
        possibleAuto += question.maximumScore
        let correct: unknown = null
        try {
          correct = question.correctAnswerJson ? JSON.parse(question.correctAnswerJson) : null
        } catch {
          correct = question.correctAnswerJson
        }
        const correctValue =
          Array.isArray(correct) && correct.length === 1 && !Array.isArray(submitted) ? correct[0] : correct
        scoreForQuestion = normalize(submitted) === normalize(correctValue) ? question.maximumScore : 0
        awardedAuto += scoreForQuestion
      } else {
        requiresMarking = true
      }
      return { question, submitted, scoreForQuestion }
    })

    // Percentage score across auto-scorable questions (0 if none exist yet).
    const percentage = possibleAuto > 0 ? Math.round((awardedAuto / possibleAuto) * 1000) / 10 : 0
    const passMark = candidateAssessment.assessment.passMark
    const passed = requiresMarking ? null : percentage >= passMark
    const status = requiresMarking ? (timedOut ? 'AUTO_SUBMITTED' : 'SUBMITTED') : 'AWAITING_APPROVAL'

    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.candidateAssessment.updateMany({
        where: { id: params.id, status: 'IN_PROGRESS', startedAt: candidateAssessment.startedAt },
        data: {
          status,
          submittedAt: new Date(),
          autoSubmitted: timedOut,
          submittedLate: timedOut,
          score: possibleAuto > 0 ? percentage : null,
          passed,
        },
      })
      if (claimed.count !== 1) throw new AuthzError('Assessment was already submitted or changed', 409)
      for (const answer of preparedAnswers) {
        await tx.candidateAssessmentAnswer.upsert({
          where: {
            candidateAssessmentId_assessmentQuestionId: {
              candidateAssessmentId: candidateAssessment.id,
              assessmentQuestionId: answer.question.id,
            },
          },
          update: {
            answerJson: answer.submitted !== undefined ? JSON.stringify(answer.submitted) : null,
            score: answer.scoreForQuestion,
          },
          create: {
            candidateAssessmentId: candidateAssessment.id,
            assessmentQuestionId: answer.question.id,
            answerJson: answer.submitted !== undefined ? JSON.stringify(answer.submitted) : null,
            score: answer.scoreForQuestion,
          },
        })
      }
      await tx.application.updateMany({
        where: { id: candidateAssessment.applicationId, internalStatus: 'ASSESSMENT_INVITED' },
        data: { candidateVisibleStatus: 'ASSESSMENT_COMPLETED', lockVersion: { increment: 1 } },
      })
      return tx.candidateAssessment.findUniqueOrThrow({ where: { id: params.id } })
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'ASSESSMENT_SUBMITTED',
      resourceType: 'CandidateAssessment',
      resourceId: params.id,
      newValue: { score: updated.score, passed, requiresMarking },
    })

    return NextResponse.json({
      success: true,
      requiresMarking,
    })
  } catch (err) {
    return authzResponse(err)
  }
}
