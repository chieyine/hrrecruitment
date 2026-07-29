import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

const schema = z
  .object({
    vacancyId: z.string().min(1),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).optional(),
    type: z.enum([
      'ONLINE_MCQ',
      'ONLINE_SHORT_ANSWER',
      'ESSAY',
      'SCENARIO',
      'FILE_UPLOAD',
      'OFFLINE_WRITTEN',
      'PRACTICAL',
      'PRESENTATION',
      'DRIVING_TEST',
      'SPREADSHEET',
      'SIMULATION',
    ]),
    durationMinutes: z.coerce.number().int().min(1).max(480),
    passMark: z.coerce.number().min(0).max(100),
    opensAt: z.coerce.date().optional(),
    closesAt: z.coerce.date().optional(),
    maximumAttempts: z.coerce.number().int().min(1).max(10).default(1),
    randomizeQuestions: z.boolean().default(false),
    autoSubmit: z.boolean().default(true),
    configuration: z.record(z.unknown()).optional(),
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
      .default([]),
  })
  .refine((v) => !v.opensAt || !v.closesAt || v.closesAt > v.opensAt, {
    message: 'Closing time must follow opening time',
    path: ['closesAt'],
  })
  .superRefine((value, context) => {
    const offlineTypes = new Set(['OFFLINE_WRITTEN', 'PRACTICAL', 'PRESENTATION', 'DRIVING_TEST', 'SIMULATION'])
    if (!offlineTypes.has(value.type) && value.questions.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['questions'],
        message: 'Add at least one question to an online assessment',
      })
    }
    value.questions.forEach((question, index) => {
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

export async function GET() {
  try {
    await requirePermission('assessment.manage')
    return NextResponse.json({
      assessments: await prisma.assessment.findMany({
        include: { vacancy: true, questions: true, candidateAssessments: true },
        orderBy: { title: 'asc' },
      }),
    })
  } catch (err) {
    return authzResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('assessment.manage')
    const input = await parseBody(request, schema)
    const vacancy = await prisma.vacancy.findUnique({ where: { id: input.vacancyId } })
    if (!vacancy) return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 })
    if (['CANCELLED', 'COMPLETED', 'ARCHIVED'].includes(vacancy.status))
      return NextResponse.json({ error: 'Assessments cannot be added to this vacancy' }, { status: 409 })
    const assessment = await prisma.assessment.create({
      data: {
        vacancyId: input.vacancyId,
        title: input.title,
        description: input.description || null,
        type: input.type,
        durationMinutes: input.durationMinutes,
        passMark: input.passMark,
        opensAt: input.opensAt || null,
        closesAt: input.closesAt || null,
        maximumAttempts: input.maximumAttempts,
        randomizeQuestions: input.randomizeQuestions,
        autoSubmit: input.autoSubmit,
        configurationJson: input.configuration ? JSON.stringify(input.configuration) : null,
        questions: {
          create:
            input.questions?.map((q, index) => ({
              questionType: q.questionType,
              prompt: q.prompt,
              optionsJson: q.options ? JSON.stringify(q.options) : null,
              correctAnswerJson: q.correctAnswer === undefined ? null : JSON.stringify(q.correctAnswer),
              maximumScore: q.maximumScore,
              displayOrder: index,
            })) || [],
        },
      },
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'ASSESSMENT_CREATED',
      resourceType: 'Assessment',
      resourceId: assessment.id,
    })
    return NextResponse.json({ success: true, assessment })
  } catch (err) {
    return authzResponse(err)
  }
}
