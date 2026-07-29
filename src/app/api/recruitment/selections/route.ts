import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { findIndependentApprover } from '@/lib/approvals'
import { refreshApplicationFinalScore } from '@/lib/recruitment-scoring.server'
import { hasPermission } from '@/lib/rbac'
import { assignedApplicationWhere, applicationAccess } from '@/lib/recruitment-access'
import { canRunRecruitmentOperations } from '@/lib/recruitment-role-policy'

const decisionSchema = z.object({
  applicationId: z.string().min(1),
  outcome: z.enum(['SELECTED', 'FIRST_RESERVE', 'SECOND_RESERVE', 'NOT_SELECTED']),
  justification: z.string().trim().min(10).max(5000),
})

export async function GET(request: Request) {
  try {
    const user = await requirePermission('application.stage.change')
    if (!canRunRecruitmentOperations(user.roles))
      throw new AuthzError('Selection preparation is restricted to the recruitment HR team', 403)
    const vacancyId = new URL(request.url).searchParams.get('vacancyId')
    const readAll = await hasPermission(user.userId, 'application.read.all')
    const applications = await prisma.application.findMany({
      where: {
        internalStatus: { in: ['INTERVIEW_COMPLETED', 'REFERENCE_CHECK', 'RECOMMENDED', 'RESERVE'] },
        ...(vacancyId ? { vacancyId } : {}),
        ...(readAll ? {} : assignedApplicationWhere(user.userId)),
      },
      include: {
        candidate: { select: { legalFirstName: true, lastName: true } },
        vacancy: { select: { id: true, title: true, referenceNumber: true, numberOfPositions: true } },
        selectionDecisions: { orderBy: { id: 'desc' }, take: 1 },
      },
      orderBy: [{ finalScore: 'desc' }, { interviewScore: 'desc' }, { id: 'asc' }],
      take: 500,
    })
    const decisionIds = applications.flatMap((application) =>
      application.selectionDecisions[0] ? [application.selectionDecisions[0].id] : []
    )
    const approvals = decisionIds.length
      ? await prisma.approval.findMany({
          where: { resourceType: 'SELECTION', resourceId: { in: decisionIds } },
          select: { resourceId: true, stage: true, decision: true },
          orderBy: { stage: 'desc' },
        })
      : []
    const approvalByDecision = new Map<string, (typeof approvals)[number]>()
    for (const approval of approvals) {
      if (!approvalByDecision.has(approval.resourceId)) approvalByDecision.set(approval.resourceId, approval)
    }
    return NextResponse.json({
      candidates: (() => {
        const vacancyRanks = new Map<string, number>()
        const requiredByVacancy = new Map<
          string,
          { screeningScore: boolean; assessmentScore: boolean; interviewScore: boolean }
        >()
        for (const application of applications) {
          const required = requiredByVacancy.get(application.vacancyId) || {
            screeningScore: false,
            assessmentScore: false,
            interviewScore: false,
          }
          required.screeningScore ||= application.screeningScore !== null
          required.assessmentScore ||= application.assessmentScore !== null
          required.interviewScore ||= application.interviewScore !== null
          requiredByVacancy.set(application.vacancyId, required)
        }
        return applications.map((application) => {
          const required = requiredByVacancy.get(application.vacancyId)!
          const scoreComplete =
            (!required.screeningScore || application.screeningScore !== null) &&
            (!required.assessmentScore || application.assessmentScore !== null) &&
            (!required.interviewScore || application.interviewScore !== null)
          const rank = scoreComplete ? (vacancyRanks.get(application.vacancyId) ?? 0) + 1 : null
          if (rank) vacancyRanks.set(application.vacancyId, rank)
          return {
            id: application.id,
            name: `${application.candidate.legalFirstName} ${application.candidate.lastName}`,
            vacancyId: application.vacancy.id,
            vacancyTitle: application.vacancy.title,
            vacancyReference: application.vacancy.referenceNumber,
            fundedPositions: application.vacancy.numberOfPositions,
            screeningScore: application.screeningScore,
            assessmentScore: application.assessmentScore,
            interviewScore: application.interviewScore,
            weightedFinalScore: application.finalScore,
            rank,
            scoreComplete,
            recommendation: application.selectionDecisions[0]?.outcome || null,
            decisionStatus: application.selectionDecisions[0]?.approvedAt
              ? 'APPROVED'
              : application.selectionDecisions[0]
                ? approvalByDecision.get(application.selectionDecisions[0].id)?.decision || 'PENDING'
                : null,
            internalStatus: application.internalStatus,
            referenceStatus: application.referenceStatus,
          }
        })
      })(),
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('application.stage.change')
    if (!canRunRecruitmentOperations(user.roles))
      throw new AuthzError('Selection preparation is restricted to the recruitment HR team', 403)
    const input = await parseBody(request, decisionSchema)
    const access = await applicationAccess(user.userId, input.applicationId)
    if (!access.readAll && !access.vacancyOwner && !access.assignedReviewer)
      throw new AuthzError('Application not found or outside your assigned scope', 404)
    await refreshApplicationFinalScore(input.applicationId)
    const application = await prisma.application.findUnique({
      where: { id: input.applicationId },
      include: { vacancy: { select: { numberOfPositions: true } } },
    })
    if (!application) throw new AuthzError('Application not found', 404)
    if (!['INTERVIEW_COMPLETED', 'REFERENCE_CHECK'].includes(application.internalStatus)) {
      throw new AuthzError(`A selection decision cannot be created from ${application.internalStatus}`, 422)
    }
    if (
      application.internalStatus === 'REFERENCE_CHECK' &&
      !['SATISFACTORY', 'SATISFACTORY_WITH_CONCERNS', 'WAIVED'].includes(application.referenceStatus)
    ) {
      throw new AuthzError('Complete and review all required references before selection', 422)
    }
    const priorDecisions = await prisma.selectionDecision.findMany({
      where: { applicationId: application.id, approvedAt: null },
      select: { id: true },
    })
    const pendingDecision = priorDecisions.length
      ? await prisma.approval.findFirst({
          where: {
            resourceType: 'SELECTION',
            resourceId: { in: priorDecisions.map((decision) => decision.id) },
            decision: 'PENDING',
          },
          select: { id: true },
        })
      : null
    if (pendingDecision) throw new AuthzError('A selection decision is already awaiting approval', 409)

    const rankingPool = await prisma.application.findMany({
      where: {
        vacancyId: application.vacancyId,
        internalStatus: { in: ['INTERVIEW_COMPLETED', 'REFERENCE_CHECK', 'RECOMMENDED', 'RESERVE'] },
      },
      orderBy: [{ finalScore: 'desc' }, { interviewScore: 'desc' }, { id: 'asc' }],
      select: { id: true, screeningScore: true, assessmentScore: true, interviewScore: true },
    })
    const required = {
      screeningScore: rankingPool.some((item) => item.screeningScore !== null),
      assessmentScore: rankingPool.some((item) => item.assessmentScore !== null),
      interviewScore: rankingPool.some((item) => item.interviewScore !== null),
    }
    const ranked = rankingPool.filter(
      (item) =>
        (!required.screeningScore || item.screeningScore !== null) &&
        (!required.assessmentScore || item.assessmentScore !== null) &&
        (!required.interviewScore || item.interviewScore !== null)
    )
    const computedRank = ranked.findIndex((item) => item.id === application.id) + 1
    if (!computedRank)
      throw new AuthzError('Complete the same scoring components used for the other candidates before selection', 422)
    const rankOverride = input.outcome === 'SELECTED' && computedRank > application.vacancy.numberOfPositions
    if (rankOverride && (!input.justification || input.justification.length < 20)) {
      throw new AuthzError(
        'Selecting outside the funded positions requires a justification of at least 20 characters',
        422
      )
    }
    const approverUserId = await findIndependentApprover(user.userId, ['HIRING_MANAGER', 'HR_MANAGER', 'APPROVER'])
    const selection = await prisma.$transaction(async (tx) => {
      const created = await tx.selectionDecision.create({
        data: {
          applicationId: application.id,
          outcome: input.outcome,
          rank: computedRank,
          justification: input.justification || null,
          overrideFlag: rankOverride,
          createdBy: user.userId,
        },
      })
      await tx.approval.create({
        data: {
          resourceType: 'SELECTION',
          resourceId: created.id,
          stage: 1,
          approverUserId,
          requestedBy: user.userId,
          decision: 'PENDING',
        },
      })
      return created
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'SELECTION_SUBMITTED',
      resourceType: 'SelectionDecision',
      resourceId: selection.id,
      newValue: { outcome: input.outcome, computedRank, overrideFlag: rankOverride, approved: false },
    })
    return NextResponse.json({ success: true, selectionId: selection.id, status: 'AWAITING_APPROVAL' })
  } catch (error) {
    return authzResponse(error)
  }
}
