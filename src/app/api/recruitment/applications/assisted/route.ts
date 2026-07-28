import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

function questionIsVisible(
  question: { conditionJson: string | null },
  questions: Array<{ id: string }>,
  answerMap: Map<string, unknown>
) {
  if (!question.conditionJson) return true
  try {
    const condition = JSON.parse(question.conditionJson) as { dependsOnIndex: number; operator: string; value: unknown }
    const dependency = questions[condition.dependsOnIndex]
    if (!dependency) return false
    const actual = answerMap.get(dependency.id)
    if (condition.operator === 'CONTAINS')
      return Array.isArray(actual)
        ? actual.map(String).includes(String(condition.value))
        : String(actual ?? '').includes(String(condition.value))
    if (condition.operator === 'NOT_EQUALS') return String(actual ?? '') !== String(condition.value)
    return String(actual ?? '') === String(condition.value)
  } catch {
    return false
  }
}

export async function GET() {
  try {
    await requirePermission('application.stage.change')
    const [candidates, vacancies] = await Promise.all([
      prisma.candidateProfile.findMany({
        include: { user: { select: { email: true } } },
        orderBy: { lastName: 'asc' },
        take: 500,
      }),
      prisma.vacancy.findMany({
        where: { status: 'OPEN', openingAt: { lte: new Date() }, closingAt: { gt: new Date() } },
        include: { questions: { orderBy: { displayOrder: 'asc' } }, requiredDocuments: true },
        orderBy: { title: 'asc' },
        take: 200,
      }),
    ])
    return Response.json({
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        name: `${candidate.legalFirstName} ${candidate.lastName}`,
        email: candidate.user.email,
      })),
      vacancies,
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('application.stage.change')
    const input = await parseBody(
      request,
      z.object({
        candidateId: z.string().uuid(),
        vacancyId: z.string().uuid(),
        reason: z.string().trim().min(10).max(2000),
        answers: z
          .array(
            z.object({
              vacancyQuestionId: z.string().uuid(),
              answer: z.union([z.string().max(20_000), z.number(), z.boolean(), z.array(z.string()).max(100)]),
            })
          )
          .max(200),
      })
    )
    const [candidate, vacancy, existing] = await Promise.all([
      prisma.candidateProfile.findUnique({
        where: { id: input.candidateId },
        include: { user: true, education: true, employment: true },
      }),
      prisma.vacancy.findUnique({
        where: { id: input.vacancyId },
        include: { questions: { orderBy: { displayOrder: 'asc' } }, requiredDocuments: true },
      }),
      prisma.application.findUnique({
        where: { candidateId_vacancyId: { candidateId: input.candidateId, vacancyId: input.vacancyId } },
      }),
    ])
    if (!candidate) throw new AuthzError('Candidate profile not found', 404)
    if (!vacancy || vacancy.status !== 'OPEN' || vacancy.openingAt > new Date() || vacancy.closingAt <= new Date())
      throw new AuthzError('Vacancy is not accepting applications', 409)
    if (existing) throw new AuthzError('This candidate already has an application for the vacancy', 409)
    const allowed = new Set(vacancy.questions.map((question) => question.id))
    if (input.answers.some((answer) => !allowed.has(answer.vacancyQuestionId)))
      throw new AuthzError('An answer does not belong to this vacancy', 400)
    const answerMap = new Map(input.answers.map((answer) => [answer.vacancyQuestionId, answer.answer]))
    const visibleQuestionIds = new Set(
      vacancy.questions
        .filter((question) => questionIsVisible(question, vacancy.questions, answerMap))
        .map((question) => question.id)
    )
    const safeAnswers = input.answers.filter((answer) => visibleQuestionIds.has(answer.vacancyQuestionId))
    const missing = vacancy.questions.find((question) => {
      if (!visibleQuestionIds.has(question.id) || !question.required) return false
      const answer = answerMap.get(question.id)
      if (question.fieldType === 'DECLARATION') return answer !== true
      if (question.fieldType === 'MULTISELECT') return !Array.isArray(answer) || answer.length === 0
      return answer === null || answer === undefined || String(answer).trim() === ''
    })
    if (missing) throw new AuthzError(`Complete required question: ${missing.label}`, 400)
    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          candidateId: candidate.id,
          vacancyId: vacancy.id,
          internalStatus: 'SUBMITTED',
          candidateVisibleStatus: 'APPLICATION_RECEIVED',
          submittedAt: new Date(),
          answers: {
            create: safeAnswers.map((answer) => ({
              vacancyQuestionId: answer.vacancyQuestionId,
              answerJson: JSON.stringify(answer.answer),
            })),
          },
        },
      })
      await tx.applicationProfileSnapshot.create({
        data: {
          applicationId: created.id,
          profileJson: JSON.stringify({
            ...candidate,
            _assistedEntry: {
              enteredBy: user.userId,
              reason: input.reason,
              enteredAt: new Date().toISOString(),
              missingRequiredDocumentEvidence: vacancy.requiredDocuments.map((document) => document.documentType),
            },
          }),
        },
      })
      await tx.applicationStageHistory.create({
        data: {
          applicationId: created.id,
          fromStatus: 'DRAFT',
          toStatus: 'SUBMITTED',
          changedBy: user.userId,
          reason: `HR-assisted entry: ${input.reason}`,
        },
      })
      return created
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'HR_ASSISTED_APPLICATION_ENTERED',
      resourceType: 'Application',
      resourceId: application.id,
      newValue: { candidateId: candidate.id, vacancyId: vacancy.id, answerCount: safeAnswers.length },
      reason: input.reason,
    })
    await createNotification({
      userId: candidate.userId,
      type: 'APPLICATION_RECEIVED',
      title: 'Application entered with HR assistance',
      body: `HR recorded your supported application for ${vacancy.title}. Review your account and contact HR if anything is incorrect.`,
    })
    return Response.json({ success: true, applicationId: application.id })
  } catch (error) {
    return authzResponse(error)
  }
}
