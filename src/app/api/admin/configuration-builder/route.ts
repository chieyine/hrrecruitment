import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    const mode = new URL(request.url).searchParams.get('mode')
    if (mode === 'courses') {
      await requirePermission('course.manage')
      const courses = await prisma.course.findMany({
        include: {
          contents: { orderBy: { displayOrder: 'asc' } },
          quizQuestions: { orderBy: { displayOrder: 'asc' } },
          candidateCourses: {
            include: {
              candidatePreboarding: {
                include: { application: { include: { candidate: true, vacancy: { select: { title: true } } } } },
              },
              courseAttempts: { orderBy: { attemptNumber: 'desc' } },
            },
            orderBy: { assignedAt: 'desc' },
          },
        },
        orderBy: { title: 'asc' },
      })
      return Response.json({ scorecards: [], packages: [], courses, forms: [], documents: [], policies: [], tasks: [] })
    }
    await requireRole('SYSTEM_ADMIN')
    const [scorecards, packages, courses, forms, documents, policies, tasks] = await Promise.all([
      prisma.scorecardTemplate.findMany({
        include: { criteria: { orderBy: { displayOrder: 'asc' } } },
        orderBy: { name: 'asc' },
      }),
      prisma.preboardingPackage.findMany({
        include: {
          packageForms: { include: { formTemplate: true } },
          packageDocuments: { include: { documentRequirement: true } },
          packagePolicies: { include: { policyDocument: true } },
          packageCourses: { include: { course: true } },
          packageTasks: { include: { taskTemplate: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.course.findMany({
        include: {
          contents: { orderBy: { displayOrder: 'asc' } },
          quizQuestions: { orderBy: { displayOrder: 'asc' } },
        },
        orderBy: { title: 'asc' },
      }),
      prisma.preboardingFormTemplate.findMany({ where: { active: true }, orderBy: { title: 'asc' } }),
      prisma.documentRequirement.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.policyDocument.findMany({ where: { active: true }, orderBy: { title: 'asc' } }),
      prisma.preboardingTaskTemplate.findMany({ where: { active: true }, orderBy: { title: 'asc' } }),
    ])
    return Response.json({ scorecards, packages, courses, forms, documents, policies, tasks })
  } catch (error) {
    return authzResponse(error)
  }
}

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('ADD_CRITERION'),
    templateId: z.string().min(1),
    name: z.string().trim().min(2),
    maximumScore: z.coerce.number().positive(),
    weight: z.coerce.number().positive(),
    guidance: z.string().max(1000).optional(),
    required: z.boolean().default(true),
    commentRequired: z.boolean().default(false),
  }),
  z.object({ action: z.literal('REMOVE_CRITERION'), id: z.string().min(1) }),
  z.object({
    action: z.literal('ADD_PACKAGE_ITEM'),
    packageId: z.string().min(1),
    itemType: z.enum(['FORM', 'DOCUMENT', 'POLICY', 'COURSE', 'TASK']),
    resourceId: z.string().min(1),
    required: z.boolean().default(true),
    dueOffsetDays: z.coerce.number().int().min(0).max(365),
    timing: z.enum(['BEFORE_RESUMPTION', 'FIRST_WEEK', 'FIRST_MONTH', 'OPTIONAL']).optional(),
  }),
  z.object({
    action: z.literal('REMOVE_PACKAGE_ITEM'),
    itemType: z.enum(['FORM', 'DOCUMENT', 'POLICY', 'COURSE', 'TASK']),
    id: z.string().min(1),
  }),
  z.object({
    action: z.literal('ADD_COURSE_CONTENT'),
    courseId: z.string().min(1),
    contentType: z.enum(['READING', 'VIDEO', 'SLIDES', 'ATTACHMENT']),
    title: z.string().trim().min(2),
    content: z.string().max(10_000).optional(),
    fileAssetId: z.string().optional(),
  }),
  z.object({
    action: z.literal('ADD_COURSE_QUESTION'),
    courseId: z.string().min(1),
    questionType: z.enum(['MCQ', 'MULTISELECT', 'TRUEFALSE', 'SHORTTEXT']),
    question: z.string().trim().min(2),
    options: z.array(z.string().min(1)),
    correctAnswer: z.unknown(),
    score: z.coerce.number().positive(),
  }),
  z.object({ action: z.literal('REMOVE_COURSE_CONTENT'), id: z.string().min(1) }),
  z.object({ action: z.literal('REMOVE_COURSE_QUESTION'), id: z.string().min(1) }),
  z.object({
    action: z.literal('RESET_COURSE_ATTEMPT'),
    candidateCourseId: z.string().min(1),
    reason: z.string().trim().min(5).max(1000),
  }),
])

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, schema)
    const user = input.action.includes('COURSE')
      ? await requirePermission('course.manage')
      : await requireRole('SYSTEM_ADMIN')
    let result: any
    if (input.action === 'ADD_CRITERION') {
      const displayOrder = await prisma.scorecardCriterion.count({ where: { scorecardTemplateId: input.templateId } })
      result = await prisma.scorecardCriterion.create({
        data: {
          scorecardTemplateId: input.templateId,
          name: input.name,
          maximumScore: input.maximumScore,
          weight: input.weight,
          guidance: input.guidance || null,
          required: input.required,
          commentRequired: input.commentRequired,
          displayOrder,
        },
      })
    } else if (input.action === 'REMOVE_CRITERION') {
      if (await prisma.candidateCriterionScore.count({ where: { criterionId: input.id } }))
        throw new AuthzError('A criterion used in submitted scoring cannot be deleted', 409)
      result = await prisma.scorecardCriterion.delete({ where: { id: input.id } })
    } else if (input.action === 'ADD_PACKAGE_ITEM') {
      const common = {
        preboardingPackageId: input.packageId,
        required: input.required,
        dueOffsetDays: input.dueOffsetDays,
      }
      if (input.itemType === 'FORM')
        result = await prisma.packageForm.create({ data: { ...common, formTemplateId: input.resourceId } })
      else if (input.itemType === 'DOCUMENT')
        result = await prisma.packageDocumentRequirement.create({
          data: { ...common, documentRequirementId: input.resourceId },
        })
      else if (input.itemType === 'POLICY')
        result = await prisma.packagePolicy.create({ data: { ...common, policyDocumentId: input.resourceId } })
      else if (input.itemType === 'COURSE')
        result = await prisma.packageCourse.create({
          data: { ...common, courseId: input.resourceId, timing: input.timing || 'BEFORE_RESUMPTION' },
        })
      else result = await prisma.packageTask.create({ data: { ...common, taskTemplateId: input.resourceId } })
    } else if (input.action === 'REMOVE_PACKAGE_ITEM') {
      if (input.itemType === 'FORM') result = await prisma.packageForm.delete({ where: { id: input.id } })
      else if (input.itemType === 'DOCUMENT')
        result = await prisma.packageDocumentRequirement.delete({ where: { id: input.id } })
      else if (input.itemType === 'POLICY') result = await prisma.packagePolicy.delete({ where: { id: input.id } })
      else if (input.itemType === 'COURSE') result = await prisma.packageCourse.delete({ where: { id: input.id } })
      else result = await prisma.packageTask.delete({ where: { id: input.id } })
    } else if (input.action === 'ADD_COURSE_CONTENT') {
      if (
        input.fileAssetId &&
        !(await prisma.fileAsset.findFirst({
          where: { id: input.fileAssetId, ownerUserId: user.userId, virusScanStatus: 'CLEAN' },
        }))
      )
        throw new AuthzError('Course file is unavailable or unsafe', 400)
      const displayOrder = await prisma.courseContent.count({ where: { courseId: input.courseId } })
      result = await prisma.courseContent.create({
        data: {
          courseId: input.courseId,
          contentType: input.contentType,
          title: input.title,
          content: input.content || null,
          fileAssetId: input.fileAssetId || null,
          displayOrder,
        },
      })
    } else if (input.action === 'ADD_COURSE_QUESTION') {
      if (input.questionType !== 'SHORTTEXT' && input.options.length < 2)
        throw new AuthzError('At least two answer options are required', 400)
      const displayOrder = await prisma.courseQuizQuestion.count({ where: { courseId: input.courseId } })
      result = await prisma.courseQuizQuestion.create({
        data: {
          courseId: input.courseId,
          questionType: input.questionType,
          question: input.question,
          optionsJson: JSON.stringify(input.options),
          correctAnswerJson: JSON.stringify(input.correctAnswer),
          score: input.score,
          displayOrder,
        },
      })
    } else if (input.action === 'REMOVE_COURSE_CONTENT')
      result = await prisma.courseContent.delete({ where: { id: input.id } })
    else if (input.action === 'REMOVE_COURSE_QUESTION')
      result = await prisma.courseQuizQuestion.delete({ where: { id: input.id } })
    else {
      result = await prisma.$transaction(async (tx) => {
        const existing = await tx.candidateCourse.findUnique({ where: { id: input.candidateCourseId } })
        if (!existing) throw new AuthzError('Candidate course assignment not found', 404)
        await tx.candidateCourseAttempt.deleteMany({ where: { candidateCourseId: existing.id } })
        return tx.candidateCourse.update({
          where: { id: existing.id },
          data: {
            status: 'ASSIGNED',
            startedAt: null,
            completedAt: null,
            score: null,
            attempts: 0,
            certificateFileId: null,
          },
        })
      })
    }
    await logAudit({
      actorUserId: user.userId,
      action: `CONFIGURATION_${input.action}`,
      resourceType: 'ConfigurationBuilder',
      resourceId: result.id,
      newValue: input,
      reason: 'reason' in input ? input.reason : undefined,
    })
    return Response.json({ success: true, result })
  } catch (error) {
    return authzResponse(error)
  }
}
