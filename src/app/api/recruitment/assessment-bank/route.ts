import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

const questionFields = z.object({
  title: z.string().trim().min(3).max(200),
  category: z.string().trim().min(2).max(100),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  jobFamily: z.string().trim().max(150).optional(),
  questionType: z.enum(['MCQ', 'MULTISELECT', 'TRUEFALSE', 'SHORTTEXT', 'LONGTEXT', 'NUMBER', 'FILE']),
  prompt: z.string().trim().min(5).max(10000),
  options: z.array(z.string().trim().min(1).max(1000)).max(50).optional(),
  correctAnswer: z.unknown().optional(),
  maximumScore: z.coerce.number().positive().max(1000),
  accessLevel: z.enum(['RESTRICTED', 'HR', 'ASSESSOR']).default('RESTRICTED'),
  reviewDueAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
})

const schema = z.discriminatedUnion('action', [
  questionFields.extend({ action: z.literal('CREATE') }),
  questionFields.extend({ action: z.literal('NEW_VERSION'), questionId: z.string().uuid() }),
  z.object({ action: z.literal('APPROVE'), questionId: z.string().uuid() }),
  z.object({ action: z.literal('RETIRE'), questionId: z.string().uuid(), reason: z.string().trim().min(5).max(1000) }),
  z.object({ action: z.literal('COPY_TO_ASSESSMENT'), questionId: z.string().uuid(), assessmentId: z.string().uuid() }),
])

export async function GET() {
  try {
    await requirePermission('assessment.manage')
    const questions = await prisma.assessmentBankQuestion.findMany({
      orderBy: [{ status: 'asc' }, { category: 'asc' }, { title: 'asc' }, { version: 'desc' }],
      take: 1000,
    })
    return Response.json({ questions })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('assessment.manage')
    const input = await parseBody(request, schema)
    if (input.action === 'APPROVE') {
      const question = await prisma.assessmentBankQuestion.findUnique({ where: { id: input.questionId } })
      if (!question) throw new AuthzError('Question not found', 404)
      if (question.createdBy === user.userId) throw new AuthzError('A different assessor must approve this question', 409)
      if (question.status !== 'DRAFT') throw new AuthzError('Only draft questions can be approved', 409)
      await prisma.assessmentBankQuestion.update({
        where: { id: question.id },
        data: { status: 'ACTIVE', approvedBy: user.userId, approvedAt: new Date() },
      })
      await logAudit({ actorUserId: user.userId, action: 'ASSESSMENT_BANK_QUESTION_APPROVED', resourceType: 'AssessmentBankQuestion', resourceId: question.id })
      return Response.json({ success: true })
    }
    if (input.action === 'RETIRE') {
      const question = await prisma.assessmentBankQuestion.update({ where: { id: input.questionId }, data: { status: 'RETIRED' } })
      await logAudit({ actorUserId: user.userId, action: 'ASSESSMENT_BANK_QUESTION_RETIRED', resourceType: 'AssessmentBankQuestion', resourceId: question.id, reason: input.reason })
      return Response.json({ success: true })
    }
    if (input.action === 'COPY_TO_ASSESSMENT') {
      const [question, assessment] = await Promise.all([
        prisma.assessmentBankQuestion.findFirst({ where: { id: input.questionId, status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }),
        prisma.assessment.findUnique({ where: { id: input.assessmentId }, include: { _count: { select: { candidateAssessments: true, questions: true } } } }),
      ])
      if (!question) throw new AuthzError('Only a current, approved question can be used', 409)
      if (!assessment) throw new AuthzError('Assessment not found', 404)
      if (assessment._count.candidateAssessments) throw new AuthzError('Questions are locked after candidates have been invited', 409)
      const copied = await prisma.assessmentQuestion.create({
        data: {
          assessmentId: assessment.id,
          questionType: question.questionType,
          prompt: question.prompt,
          optionsJson: question.optionsJson,
          correctAnswerJson: question.correctAnswerJson,
          maximumScore: question.maximumScore,
          displayOrder: assessment._count.questions,
        },
      })
      await logAudit({ actorUserId: user.userId, action: 'ASSESSMENT_BANK_QUESTION_USED', resourceType: 'AssessmentQuestion', resourceId: copied.id, newValue: { bankQuestionId: question.id, bankVersion: question.version } })
      return Response.json({ success: true, question: copied })
    }

    if (['MCQ', 'MULTISELECT'].includes(input.questionType) && (input.options?.length || 0) < 2)
      throw new AuthzError('Add at least two answer options', 422)
    if (['MCQ', 'MULTISELECT', 'TRUEFALSE', 'NUMBER'].includes(input.questionType) && (input.correctAnswer === undefined || input.correctAnswer === ''))
      throw new AuthzError('Add the correct answer for automatic marking', 422)

    const previous = input.action === 'NEW_VERSION'
      ? await prisma.assessmentBankQuestion.findUnique({ where: { id: input.questionId } })
      : null
    if (input.action === 'NEW_VERSION' && !previous) throw new AuthzError('Question not found', 404)
    const stableKey = previous?.stableKey || crypto.randomUUID()
    const version = previous ? previous.version + 1 : 1
    const created = await prisma.$transaction(async (tx) => {
      const question = await tx.assessmentBankQuestion.create({
        data: {
          stableKey,
          version,
          title: input.title,
          category: input.category,
          difficulty: input.difficulty,
          jobFamily: input.jobFamily || null,
          questionType: input.questionType,
          prompt: input.prompt,
          optionsJson: input.options ? JSON.stringify(input.options) : null,
          correctAnswerJson: input.correctAnswer === undefined ? null : JSON.stringify(input.correctAnswer),
          maximumScore: input.maximumScore,
          accessLevel: input.accessLevel,
          reviewDueAt: input.reviewDueAt || null,
          expiresAt: input.expiresAt || null,
          createdBy: user.userId,
        },
      })
      if (previous) await tx.assessmentBankQuestion.update({ where: { id: previous.id }, data: { status: 'RETIRED', supersededById: question.id } })
      return question
    })
    await logAudit({ actorUserId: user.userId, action: previous ? 'ASSESSMENT_BANK_QUESTION_VERSIONED' : 'ASSESSMENT_BANK_QUESTION_CREATED', resourceType: 'AssessmentBankQuestion', resourceId: created.id, newValue: { stableKey, version } })
    return Response.json({ success: true, question: created }, { status: 201 })
  } catch (error) {
    return authzResponse(error)
  }
}
