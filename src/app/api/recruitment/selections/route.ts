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

const decisionSchema = z.object({
  applicationId: z.string().min(1),
  outcome: z.enum(['SELECTED', 'FIRST_RESERVE', 'SECOND_RESERVE', 'NOT_SELECTED']),
  justification: z.string().trim().max(5000).optional(),
})

export async function GET(request: Request) {
  try {
    const user = await requirePermission('application.stage.change')
    const vacancyId = new URL(request.url).searchParams.get('vacancyId')
    const readAll = await hasPermission(user.userId, 'application.read.all')
    const candidatesToRefresh = await prisma.application.findMany({
      where: {
        internalStatus: { in: ['INTERVIEW_COMPLETED', 'REFERENCE_CHECK', 'RECOMMENDED', 'RESERVE'] },
        ...(vacancyId ? { vacancyId } : {}),
        ...(readAll ? {} : assignedApplicationWhere(user.userId)),
      },
      select: { id: true },
      take: 500,
    })
    await Promise.all(candidatesToRefresh.map((candidate) => refreshApplicationFinalScore(candidate.id)))
    const applications = await prisma.application.findMany({
      where: {
        internalStatus: { in: ['INTERVIEW_COMPLETED', 'REFERENCE_CHECK', 'RECOMMENDED', 'RESERVE'] },
        ...(vacancyId ? { vacancyId } : {}),
        ...(readAll ? {} : assignedApplicationWhere(user.userId)),
      },
      include: {
        candidate: { include: { user: { select: { email: true } } } },
        vacancy: { select: { id: true, title: true, referenceNumber: true, numberOfPositions: true } },
        selectionDecisions: { orderBy: { id: 'desc' }, take: 1 },
      },
      orderBy: [{ finalScore: 'desc' }, { interviewScore: 'desc' }, { id: 'asc' }],
      take: 500,
    })
    return NextResponse.json({
      candidates: (() => {
        const vacancyRanks = new Map<string, number>()
        return applications.map((application) => {
          const rank = (vacancyRanks.get(application.vacancyId) ?? 0) + 1
          vacancyRanks.set(application.vacancyId, rank)
          return {
            id: application.id,
            name: `${application.candidate.legalFirstName} ${application.candidate.lastName}`,
            email: application.candidate.user?.email || '',
            vacancyId: application.vacancy.id,
            vacancyTitle: application.vacancy.title,
            vacancyReference: application.vacancy.referenceNumber,
            fundedPositions: application.vacancy.numberOfPositions,
            screeningScore: application.screeningScore,
            assessmentScore: application.assessmentScore,
            interviewScore: application.interviewScore,
            weightedFinalScore: application.finalScore,
            rank,
            recommendation: application.selectionDecisions[0]?.outcome || null,
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

    const ranked = await prisma.application.findMany({
      where: {
        vacancyId: application.vacancyId,
        internalStatus: { in: ['INTERVIEW_COMPLETED', 'REFERENCE_CHECK', 'RECOMMENDED', 'RESERVE'] },
      },
      orderBy: [{ finalScore: 'desc' }, { interviewScore: 'desc' }, { id: 'asc' }],
      select: { id: true },
    })
    const computedRank = ranked.findIndex((item) => item.id === application.id) + 1
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
