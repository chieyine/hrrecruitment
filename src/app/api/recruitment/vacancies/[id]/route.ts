import { NextResponse } from 'next/server'
import { requirePermission, requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { expectedVersion, staleRecord } from '@/lib/concurrency'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const readAll = await hasPermission(user.userId, 'vacancy.read.all')
    const readAssigned = await hasPermission(user.userId, 'vacancy.read.assigned')
    if (!readAll && !readAssigned) throw new AuthzError('Forbidden', 403)
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: params.id },
      include: {
        department: true,
        project: true,
        category: true,
        dutyStation: true,
        questions: true,
        requiredDocuments: true,
        // Vacancy readers need pipeline counts, not every applicant's profile.
        // Candidate PII is served only by the application endpoint, which
        // enforces application.read.all/assigned.
        applications: { select: { id: true, internalStatus: true, createdAt: true } },
      },
    })
    if (!vacancy) return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 })
    if (!readAll && vacancy.ownerUserId !== user.userId) throw new AuthzError('Forbidden', 403)
    const approval = await prisma.approval.findFirst({
      where: { resourceType: 'VACANCY', resourceId: vacancy.id },
      orderBy: { id: 'desc' },
    })
    const canExportDocumentation = await hasPermission(user.userId, 'report.export')
    return NextResponse.json({
      vacancy: {
        ...vacancy,
        approvalStatus: approval?.decision || null,
        capabilities: { exportDocumentation: canExportDocumentation },
      },
    })
  } catch (err) {
    return authzResponse(err)
  }
}

// Only these fields may be edited; status is handled separately via the
// state machine, and identity/ownership fields can never be reassigned.
const EDITABLE_VACANCY_FIELDS = [
  'title',
  'departmentId',
  'projectId',
  'categoryId',
  'dutyStationId',
  'numberOfPositions',
  'contractType',
  'contractDuration',
  'reportingLine',
  'summary',
  'responsibilities',
  'essentialQualifications',
  'desirableQualifications',
  'minimumExperienceYears',
  'desiredExperience',
  'languageRequirements',
  'technicalSkills',
  'behaviouralCompetencies',
  'safeguardingResponsibilities',
  'travelRequirement',
  'openingAt',
  'closingAt',
  'screeningScorecardTemplateId',
  'interviewScorecardTemplateId',
  'preboardingPackageId',
] as const

const INT_FIELDS = new Set(['numberOfPositions', 'minimumExperienceYears'])
const DATE_FIELDS = new Set(['openingAt', 'closingAt'])

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('vacancy.update.all')
    const body = await request.json()

    const previous = await prisma.vacancy.findUnique({ where: { id: params.id } })
    if (!previous) return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 })
    if (previous.status !== 'DRAFT')
      return NextResponse.json(
        { error: 'Return the vacancy to draft before changing its specification' },
        { status: 409 }
      )

    const data: Record<string, any> = {}
    for (const key of EDITABLE_VACANCY_FIELDS) {
      if (!(key in body)) continue
      if (INT_FIELDS.has(key)) data[key] = parseInt(body[key], 10)
      else if (DATE_FIELDS.has(key)) data[key] = body[key] ? new Date(body[key]) : null
      else data[key] = body[key]
    }
    if ('numberOfPositions' in data && (!Number.isInteger(data.numberOfPositions) || data.numberOfPositions < 1))
      return NextResponse.json({ error: 'Number of positions must be at least one' }, { status: 400 })
    if (
      'minimumExperienceYears' in data &&
      (!Number.isInteger(data.minimumExperienceYears) || data.minimumExperienceYears < 0)
    )
      return NextResponse.json({ error: 'Minimum experience cannot be negative' }, { status: 400 })
    const nextOpening = data.openingAt ?? previous.openingAt
    const nextClosing = data.closingAt ?? previous.closingAt
    if (
      !(nextOpening instanceof Date) ||
      Number.isNaN(nextOpening.getTime()) ||
      !(nextClosing instanceof Date) ||
      Number.isNaN(nextClosing.getTime()) ||
      nextClosing <= nextOpening
    )
      return NextResponse.json({ error: 'Closing date must follow opening date' }, { status: 400 })

    const questions = Array.isArray(body.questions) ? body.questions : null
    const requiredDocuments = Array.isArray(body.requiredDocuments) ? body.requiredDocuments : null
    if ((questions || requiredDocuments) && !['DRAFT', 'PENDING_APPROVAL'].includes(previous.status))
      return NextResponse.json(
        { error: 'Application questions and document requirements can only be edited before publication' },
        { status: 409 }
      )
    if (questions?.some((question: any) => !String(question.label || '').trim()))
      return NextResponse.json({ error: 'Every application question requires a label' }, { status: 400 })
    if (questions && questions.length > 100)
      return NextResponse.json({ error: 'A vacancy cannot have more than 100 application questions' }, { status: 400 })
    const allowedQuestionTypes = new Set([
      'TEXT',
      'LONGTEXT',
      'NUMBER',
      'DATE',
      'YESNO',
      'SELECT',
      'MULTISELECT',
      'DECLARATION',
    ])
    if (questions?.some((question: any) => !allowedQuestionTypes.has(String(question.fieldType))))
      return NextResponse.json({ error: 'One or more application question types are not supported' }, { status: 400 })
    if (
      questions?.some(
        (question: any) =>
          ['SELECT', 'MULTISELECT'].includes(question.fieldType) &&
          (!Array.isArray(question.configurationJson?.options) || question.configurationJson.options.length < 2)
      )
    )
      return NextResponse.json({ error: 'Selection questions require at least two options' }, { status: 400 })
    if (requiredDocuments?.some((document: any) => !String(document.documentType || '').trim()))
      return NextResponse.json({ error: 'Every document requirement requires a type' }, { status: 400 })
    if (
      requiredDocuments &&
      new Set(requiredDocuments.map((document: any) => document.documentType)).size !== requiredDocuments.length
    )
      return NextResponse.json({ error: 'Each document type may be requested only once' }, { status: 400 })
    const configuredDocuments = requiredDocuments?.length
      ? await prisma.documentType.findMany({
          where: { code: { in: requiredDocuments.map((document: any) => document.documentType) }, active: true },
        })
      : []
    if (requiredDocuments && configuredDocuments.length !== requiredDocuments.length)
      return NextResponse.json({ error: 'Choose active configured document types' }, { status: 400 })
    const documentConfiguration = new Map(configuredDocuments.map((document) => [document.code, document]))

    if (body.status && body.status !== previous.status)
      return NextResponse.json(
        { error: 'Use the approval/publication workflow to change vacancy status' },
        { status: 409 }
      )

    const updated = await prisma.$transaction(async (tx) => {
      const version = expectedVersion(request, body) ?? previous.lockVersion
      const claimed = await tx.vacancy.updateMany({
        where: { id: params.id, lockVersion: version },
        data: { ...data, lockVersion: { increment: 1 } },
      })
      if (!claimed.count) staleRecord()
      if (questions) {
        await tx.vacancyQuestion.deleteMany({ where: { vacancyId: params.id } })
        if (questions.length)
          await tx.vacancyQuestion.createMany({
            data: questions.map((question: any, index: number) => ({
              vacancyId: params.id,
              fieldType: String(question.fieldType || 'LONGTEXT'),
              label: String(question.label).trim(),
              helpText: question.helpText || null,
              required: question.required !== false,
              configurationJson: question.configurationJson ? JSON.stringify(question.configurationJson) : null,
              conditionJson: null,
              displayOrder: index,
            })),
          })
      }
      if (requiredDocuments) {
        await tx.vacancyRequiredDocument.deleteMany({ where: { vacancyId: params.id } })
        if (requiredDocuments.length)
          await tx.vacancyRequiredDocument.createMany({
            data: requiredDocuments.map((document: any) => ({
              vacancyId: params.id,
              documentType: String(document.documentType).trim(),
              required: document.required !== false,
              allowedFileTypes: documentConfiguration.get(document.documentType)?.allowedFileTypes || 'pdf,jpg,png',
              maximumFileSize: documentConfiguration.get(document.documentType)?.maximumFileSize || 5_242_880,
              expiryRequired: false,
            })),
          })
      }
      return tx.vacancy.findUniqueOrThrow({ where: { id: params.id } })
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'UPDATE_VACANCY',
      resourceType: 'Vacancy',
      resourceId: params.id,
      previousValue: previous,
      newValue: updated,
    })

    return NextResponse.json({ vacancy: updated })
  } catch (err) {
    return authzResponse(err)
  }
}
