import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    await requirePermission('assessment.manage')
    const assessment = await prisma.assessment.findUnique({
      where: { id: params.id },
      include: { questions: { orderBy: { displayOrder: 'asc' } }, candidateAssessments: true },
    })
    if (!assessment) throw new AuthzError('Assessment not found', 404)
    return Response.json({ assessment })
  } catch (error) {
    return authzResponse(error)
  }
}

const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    durationMinutes: z.coerce.number().int().min(1).max(480).optional(),
    opensAt: z.coerce.date().nullable().optional(),
    closesAt: z.coerce.date().nullable().optional(),
    passMark: z.coerce.number().min(0).max(100).optional(),
    maximumAttempts: z.coerce.number().int().min(1).max(10).optional(),
    randomizeQuestions: z.boolean().optional(),
    autoSubmit: z.boolean().optional(),
    configuration: z.record(z.unknown()).nullable().optional(),
    lateSubmissionPolicy: z.enum(['REJECT', 'GRACE_PERIOD', 'HR_APPROVAL']).optional(),
    lateGraceMinutes: z.coerce.number().int().min(0).max(1440).optional(),
    accommodationExtraMinutes: z.coerce.number().int().min(0).max(480).optional(),
    accommodationInstructions: z.string().trim().max(2000).nullable().optional(),
    questions: z
      .array(
        z.object({
          questionType: z.enum(['MCQ', 'MULTISELECT', 'TRUEFALSE', 'SHORTTEXT', 'LONGTEXT', 'NUMBER', 'FILE']),
          prompt: z.string().trim().min(1),
          options: z.array(z.string()).optional(),
          correctAnswer: z.unknown().optional(),
          maximumScore: z.coerce.number().positive(),
        })
      )
      .min(1)
      .optional(),
  })
  .superRefine((value, context) => {
    value.questions?.forEach((question, index) => {
      if (['MCQ', 'MULTISELECT'].includes(question.questionType) && (question.options?.length || 0) < 2) {
        context.addIssue({
          code: 'custom',
          path: ['questions', index, 'options'],
          message: 'Add at least two answer options',
        })
      }
      if (
        ['MCQ', 'MULTISELECT', 'TRUEFALSE', 'NUMBER'].includes(question.questionType) &&
        (question.correctAnswer === undefined || question.correctAnswer === '')
      ) {
        context.addIssue({
          code: 'custom',
          path: ['questions', index, 'correctAnswer'],
          message: 'Add the correct answer for automatic marking',
        })
      }
    })
  })

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('assessment.manage')
    const input = await parseBody(request, updateSchema)
    const existing = await prisma.assessment.findUnique({
      where: { id: params.id },
      include: { candidateAssessments: { select: { id: true } } },
    })
    if (!existing) throw new AuthzError('Assessment not found', 404)
    if (input.questions && existing.candidateAssessments.length > 0)
      throw new AuthzError('Questions cannot be replaced after candidates have been invited', 409)
    const opensAt = input.opensAt === undefined ? existing.opensAt : input.opensAt
    const closesAt = input.closesAt === undefined ? existing.closesAt : input.closesAt
    if (opensAt && closesAt && closesAt <= opensAt) throw new AuthzError('Closing time must follow opening time', 422)
    const assessment = await prisma.$transaction(async (tx) => {
      if (input.questions) {
        await tx.assessmentQuestion.deleteMany({ where: { assessmentId: params.id } })
        await tx.assessmentQuestion.createMany({
          data: input.questions.map((question, index) => ({
            assessmentId: params.id,
            questionType: question.questionType,
            prompt: question.prompt,
            optionsJson: question.options ? JSON.stringify(question.options) : null,
            correctAnswerJson: question.correctAnswer === undefined ? null : JSON.stringify(question.correctAnswer),
            maximumScore: question.maximumScore,
            displayOrder: index,
          })),
        })
      }
      return tx.assessment.update({
        where: { id: params.id },
        data: {
          title: input.title,
          description: input.description,
          durationMinutes: input.durationMinutes,
          opensAt: input.opensAt,
          closesAt: input.closesAt,
          passMark: input.passMark,
          maximumAttempts: input.maximumAttempts,
          randomizeQuestions: input.randomizeQuestions,
          autoSubmit: input.autoSubmit,
          lateSubmissionPolicy: input.lateSubmissionPolicy,
          lateGraceMinutes: input.lateGraceMinutes,
          accommodationExtraMinutes: input.accommodationExtraMinutes,
          accommodationInstructions: input.accommodationInstructions,
          configurationJson:
            input.configuration === undefined
              ? undefined
              : input.configuration === null
                ? null
                : JSON.stringify(input.configuration),
        },
        include: { questions: { orderBy: { displayOrder: 'asc' } } },
      })
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'ASSESSMENT_UPDATED',
      resourceType: 'Assessment',
      resourceId: params.id,
      previousValue: existing,
      newValue: input,
    })
    return Response.json({ success: true, assessment })
  } catch (error) {
    return authzResponse(error)
  }
}
