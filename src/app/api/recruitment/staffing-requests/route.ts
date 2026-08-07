import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireUser, requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { parseBody, staffingRequestSchema } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { requiresExecutiveApproval, executiveApprovalReason } from '@/lib/staffing-request'

/**
 * §5 Staffing requests.
 *
 * Visibility follows §3.6 and §25: a hiring department representative sees only
 * their own requests, HR and the auditor see everything, and a Budget Holder
 * sees the requests whose funding they are being asked to confirm.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')

    const [readAll, readAssigned, canConfirmFunding] = await Promise.all([
      hasPermission(user.userId, 'staffing.request.read.all'),
      hasPermission(user.userId, 'staffing.request.read.assigned'),
      hasPermission(user.userId, 'funding.confirm'),
    ])
    if (!readAll && !readAssigned) throw new AuthzError('Forbidden', 403)

    // A Budget Holder has no departmental scope of their own; their queue is
    // defined by the requests that have reached the funding stage.
    const scopeFilter = readAll
      ? {}
      : canConfirmFunding
        ? {
            OR: [
              { createdBy: user.userId },
              { status: { in: ['AWAITING_FUNDING_CONFIRMATION', 'FUNDING_CONFIRMED', 'FUNDING_REJECTED'] } },
              { fundingConfirmations: { some: { budgetHolderUserId: user.userId } } },
            ],
          }
        : { OR: [{ createdBy: user.userId }, { hiringManagerUserId: user.userId }] }

    const requests = await prisma.staffingRequest.findMany({
      where: {
        ...scopeFilter,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      select: {
        id: true,
        referenceNumber: true,
        positionTitle: true,
        numberOfPositions: true,
        status: true,
        urgency: true,
        jobGrade: true,
        contractType: true,
        budgetLine: true,
        fundingSource: true,
        proposedSalaryCeiling: true,
        expectedStartDate: true,
        hiringManagerName: true,
        hiringManagerUserId: true,
        createdBy: true,
        createdAt: true,
        submittedAt: true,
        decisionReason: true,
        lockVersion: true,
        department: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, code: true } },
        dutyStation: { select: { id: true, name: true, state: true } },
        fundingConfirmations: {
          where: { supersededAt: null },
          orderBy: { decidedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            decision: true,
            budgetLine: true,
            salaryCeilingAmount: true,
            salaryCeilingCurrency: true,
            maximumRecruitmentCost: true,
            fundingEndDate: true,
            grantFunded: true,
            donorApprovalRequired: true,
            comment: true,
            decidedAt: true,
          },
        },
        vacancies: { select: { id: true, referenceNumber: true, status: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 500,
    })

    const [departments, dutyStations, projects, contractTypes] = await Promise.all([
      prisma.department.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      prisma.dutyStation.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, state: true },
      }),
      prisma.project.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true },
      }),
      prisma.contractType.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true },
      }),
    ])

    return NextResponse.json({
      requests: requests.map((item) => ({
        ...item,
        salaryCeilingAmount: item.fundingConfirmations[0]?.salaryCeilingAmount?.toString() ?? null,
        maximumRecruitmentCost: item.fundingConfirmations[0]?.maximumRecruitmentCost?.toString() ?? null,
        fundingConfirmations: item.fundingConfirmations.map((confirmation) => ({
          ...confirmation,
          salaryCeilingAmount: confirmation.salaryCeilingAmount?.toString() ?? null,
          maximumRecruitmentCost: confirmation.maximumRecruitmentCost?.toString() ?? null,
        })),
      })),
      departments,
      dutyStations,
      projects,
      contractTypes,
      capabilities: {
        create: await hasPermission(user.userId, 'staffing.request.create'),
        review: await hasPermission(user.userId, 'staffing.request.review'),
        approve: await hasPermission(user.userId, 'staffing.request.approve'),
        confirmFunding: canConfirmFunding,
      },
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('staffing.request.create')
    const input = await parseBody(request, staffingRequestSchema)

    const [department, dutyStation, project] = await Promise.all([
      prisma.department.findFirst({ where: { id: input.departmentId, active: true }, select: { id: true } }),
      prisma.dutyStation.findFirst({ where: { id: input.dutyStationId, active: true }, select: { id: true } }),
      input.projectId
        ? prisma.project.findFirst({ where: { id: input.projectId, active: true }, select: { id: true } })
        : Promise.resolve(null),
    ])
    if (!department || !dutyStation) throw new AuthzError('Choose an active department and duty station', 400)
    if (input.projectId && !project) throw new AuthzError('Choose an active project', 400)

    let reference: string | undefined
    for (let attempt = 0; attempt < 5 && !reference; attempt += 1) {
      const candidate = `FRAD-SR-${new Date().getUTCFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`
      const clash = await prisma.staffingRequest.findUnique({
        where: { referenceNumber: candidate },
        select: { id: true },
      })
      if (!clash) reference = candidate
    }
    if (!reference) throw new AuthzError('Unable to assign a staffing request reference; try again', 503)

    const created = await prisma.staffingRequest.create({
      data: {
        referenceNumber: reference,
        positionTitle: input.positionTitle.trim(),
        departmentId: input.departmentId,
        projectId: input.projectId || null,
        dutyStationId: input.dutyStationId,
        numberOfPositions: input.numberOfPositions,
        isReplacement: input.isReplacement,
        previousHolder: input.previousHolder?.trim() || null,
        recruitmentReason: input.recruitmentReason.trim(),
        reportingLine: input.reportingLine.trim(),
        contractType: input.contractType.trim(),
        contractDurationMonths: input.contractDurationMonths ?? null,
        expectedStartDate: input.expectedStartDate,
        jobGrade: input.jobGrade.trim(),
        urgency: input.urgency,
        budgetLine: input.budgetLine.trim(),
        fundingSource: input.fundingSource,
        fundingEndDate: input.fundingEndDate ?? null,
        proposedSalaryCeiling: input.proposedSalaryCeiling?.trim() || null,
        donorRestrictions: input.donorRestrictions?.trim() || null,
        jobDescriptionFileId: input.jobDescriptionFileId || null,
        requiredQualifications: input.requiredQualifications.trim(),
        requiredExperience: input.requiredExperience.trim(),
        requiredLanguages: input.requiredLanguages?.trim() || null,
        safeguardingSensitivity: input.safeguardingSensitivity,
        proposedAssessmentMethod: input.proposedAssessmentMethod?.trim() || null,
        proposedPanel: input.proposedPanel?.trim() || null,
        hiringManagerUserId: user.userId,
        hiringManagerName: input.hiringManagerName.trim(),
        hiringManagerEmail: input.hiringManagerEmail,
        hiringManagerPhone: input.hiringManagerPhone?.trim() || null,
        status: 'DRAFT',
        createdBy: user.userId,
      },
      select: { id: true, referenceNumber: true, status: true },
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'STAFFING_REQUEST_CREATED',
      resourceType: 'StaffingRequest',
      resourceId: created.id,
      newValue: created,
    })

    return NextResponse.json({
      success: true,
      request: created,
      executiveApprovalExpected: requiresExecutiveApproval({
        ...input,
        urgency: input.urgency ?? 'STANDARD',
        isReplacement: input.isReplacement ?? false,
      }),
      executiveApprovalReason: executiveApprovalReason({
        ...input,
        urgency: input.urgency ?? 'STANDARD',
        isReplacement: input.isReplacement ?? false,
      }),
    })
  } catch (error) {
    return authzResponse(error)
  }
}
