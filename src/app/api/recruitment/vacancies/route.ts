import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { parseBody, vacancySchema } from '@/lib/validation'
import { randomBytes } from 'crypto'

const createSchema = vacancySchema.and(
  z.object({
    referenceNumber: z.string().trim().min(1).max(80).optional(),
    projectId: z.string().optional().nullable(),
    screeningScorecardTemplateId: z.string().optional().nullable(),
    interviewScorecardTemplateId: z.string().optional().nullable(),
    preboardingPackageId: z.string().optional().nullable(),
    questions: z
      .array(
        z.object({
          fieldType: z.enum([
            'TEXT',
            'LONGTEXT',
            'NUMBER',
            'DATE',
            'YESNO',
            'SELECT',
            'MULTISELECT',
            'FILE',
            'DECLARATION',
          ]),
          label: z.string().trim().min(1).max(500),
          helpText: z.string().max(1000).optional(),
          required: z.boolean().optional(),
          configurationJson: z.any().optional(),
          conditionJson: z.any().optional(),
        })
      )
      .max(100)
      .optional(),
    requiredDocuments: z
      .array(
        z.object({
          documentType: z.string().trim().min(1).max(80),
          required: z.boolean().optional(),
          allowedFileTypes: z
            .string()
            .regex(/^[a-z0-9,]+$/i)
            .optional(),
          maximumFileSize: z.coerce.number().int().min(1).max(10_485_760).optional(),
          expiryRequired: z.boolean().optional(),
        })
      )
      .max(50)
      .optional(),
  })
)

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const readAll = await hasPermission(user.userId, 'vacancy.read.all')
    const readAssigned = await hasPermission(user.userId, 'vacancy.read.assigned')
    if (!readAll && !readAssigned) throw new AuthzError('Forbidden', 403)
    const vacancyWhere = readAll ? {} : { ownerUserId: user.userId }
    const [
      vacancies,
      departments,
      dutyStations,
      projects,
      categories,
      scorecards,
      packages,
      contractTypes,
      documentTypes,
    ] = await Promise.all([
      new URL(request.url).searchParams.get('reference') === '1'
        ? Promise.resolve([])
        : prisma.vacancy.findMany({
            where: vacancyWhere,
            include: {
              department: true,
              dutyStation: true,
              category: true,
              _count: { select: { applications: { where: { internalStatus: { not: 'DRAFT' } } } } },
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
          }),
      prisma.department.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.dutyStation.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.project.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.vacancyCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.scorecardTemplate.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.preboardingPackage.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      // Contract and document types are configured in the admin screens; the
      // vacancy form used to hardcode them, so configuring a new one had no effect.
      prisma.contractType.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true },
      }),
      prisma.documentType.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true },
      }),
    ])
    return NextResponse.json({
      vacancies,
      departments,
      dutyStations,
      projects,
      categories,
      scorecards,
      packages,
      contractTypes,
      documentTypes,
    })
  } catch (err) {
    return authzResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('vacancy.create.all')

    const body = await parseBody(request, createSchema)
    const {
      referenceNumber,
      title,
      departmentId,
      categoryId,
      dutyStationId,
      contractType,
      contractDuration,
      numberOfPositions,
      summary,
      responsibilities,
      essentialQualifications,
      desirableQualifications,
      desiredExperience,
      languageRequirements,
      technicalSkills,
      behaviouralCompetencies,
      safeguardingResponsibilities,
      travelRequirement,
      reportingLine,
      minimumExperienceYears,
      openingAt,
      closingAt,
      questions,
      requiredDocuments,
      projectId,
      screeningScorecardTemplateId,
      interviewScorecardTemplateId,
      preboardingPackageId,
    } = body

    let assignedReference = referenceNumber?.trim()
    if (assignedReference) {
      const existing = await prisma.vacancy.findUnique({ where: { referenceNumber: assignedReference } })
      if (existing)
        return NextResponse.json({ error: 'A vacancy with this reference number already exists' }, { status: 409 })
    } else {
      for (let attempt = 0; attempt < 5 && !assignedReference; attempt += 1) {
        const candidate = `FRAD-VAC-${new Date().getUTCFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`
        if (!(await prisma.vacancy.findUnique({ where: { referenceNumber: candidate }, select: { id: true } }))) {
          assignedReference = candidate
        }
      }
      if (!assignedReference) throw new AuthzError('Unable to assign a vacancy reference; try again', 503)
    }

    const [department, dutyStation, category, configuredContract] = await Promise.all([
      prisma.department.findFirst({ where: { id: departmentId, active: true }, select: { id: true } }),
      prisma.dutyStation.findFirst({ where: { id: dutyStationId, active: true }, select: { id: true } }),
      prisma.vacancyCategory.findFirst({ where: { id: categoryId, active: true }, select: { id: true } }),
      prisma.contractType.findFirst({ where: { code: contractType, active: true }, select: { id: true } }),
    ])
    if (!department || !dutyStation || !category || !configuredContract)
      throw new AuthzError('Choose active department, location, category and contract options', 400)

    // Default Scorecard Template
    const defaultScorecard = await prisma.scorecardTemplate.findFirst({
      where: { scorecardType: 'SCREENING' },
    })

    const openingDate = openingAt
    const closingDate = closingAt

    const vacancy = await prisma.vacancy.create({
      data: {
        referenceNumber: assignedReference,
        title: title.trim(),
        departmentId,
        categoryId,
        dutyStationId,
        contractType,
        contractDuration: contractDuration || null,
        numberOfPositions,
        summary: summary.trim(),
        responsibilities: responsibilities.trim(),
        essentialQualifications: essentialQualifications.trim(),
        desirableQualifications: desirableQualifications ? desirableQualifications.trim() : null,
        desiredExperience: desiredExperience?.trim() || null,
        languageRequirements: languageRequirements?.trim() || null,
        technicalSkills: technicalSkills?.trim() || null,
        behaviouralCompetencies: behaviouralCompetencies?.trim() || null,
        safeguardingResponsibilities: safeguardingResponsibilities?.trim() || null,
        travelRequirement: travelRequirement?.trim() || null,
        reportingLine: reportingLine?.trim() || null,
        minimumExperienceYears,
        openingAt: openingDate,
        closingAt: closingDate,
        status: 'DRAFT',
        ownerUserId: user.userId,
        projectId: projectId || null,
        screeningScorecardTemplateId: screeningScorecardTemplateId || defaultScorecard?.id || null,
        interviewScorecardTemplateId: interviewScorecardTemplateId || null,
        preboardingPackageId: preboardingPackageId || null,
        questions: Array.isArray(questions)
          ? {
              create: questions.map((q: any, index: number) => ({
                fieldType: q.fieldType || 'LONGTEXT',
                label: String(q.label || '').trim(),
                helpText: q.helpText || null,
                required: q.required !== false,
                configurationJson: q.configurationJson ? JSON.stringify(q.configurationJson) : null,
                conditionJson: q.conditionJson ? JSON.stringify(q.conditionJson) : null,
                displayOrder: index,
              })),
            }
          : undefined,
        requiredDocuments: Array.isArray(requiredDocuments)
          ? {
              create: requiredDocuments.map((d: any) => ({
                documentType: String(d.documentType || '').trim(),
                required: d.required !== false,
                allowedFileTypes: d.allowedFileTypes || 'pdf,jpg,png',
                maximumFileSize: Number(d.maximumFileSize) || 5_242_880,
                expiryRequired: !!d.expiryRequired,
              })),
            }
          : undefined,
      },
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'VACANCY_CREATED',
      resourceType: 'Vacancy',
      resourceId: vacancy.id,
      newValue: vacancy,
    })

    return NextResponse.json({ success: true, vacancyId: vacancy.id })
  } catch (err) {
    return authzResponse(err)
  }
}
