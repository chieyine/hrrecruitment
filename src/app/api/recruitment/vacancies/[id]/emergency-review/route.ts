import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { canMakeHrManagerDecision } from '@/lib/recruitment-role-policy'
import {
  assessEmergencyControls,
  buildComplianceReview,
  MINIMUM_EMERGENCY_ADVERT_HOURS,
} from '@/lib/emergency-recruitment'

/**
 * §28.7 Post-recruitment compliance review for an emergency exercise.
 *
 * Assembled from what actually happened rather than from a form someone fills
 * in afterwards, so it cannot be written to look tidier than the record.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('vacancy.read.all')

    const vacancy = await prisma.vacancy.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        referenceNumber: true,
        emergencyRecruitment: true,
        emergencyJustification: true,
        emergencyApprovedBy: true,
        emergencyApprovedAt: true,
        openingAt: true,
        closingAt: true,
        staffingRequest: {
          select: {
            jobDescriptionFileId: true,
            proposedAssessmentMethod: true,
            fundingConfirmations: {
              where: { supersededAt: null },
              take: 1,
              orderBy: { decidedAt: 'desc' },
              select: { decision: true },
            },
          },
        },
        applications: {
          select: {
            id: true,
            internalStatus: true,
            submittedAt: true,
            candidateId: true,
            backgroundChecks: { select: { checkType: true, status: true } },
            referees: { select: { requests: { select: { response: { select: { outcome: true } } } } } },
            offers: {
              where: { status: { in: ['APPROVED', 'SENT', 'ACCEPTED'] } },
              select: { status: true, sentAt: true },
              take: 1,
            },
          },
        },
      },
    })
    if (!vacancy) throw new AuthzError('Vacancy not found', 404)
    if (!vacancy.emergencyRecruitment)
      throw new AuthzError('This vacancy was not run as an emergency recruitment', 422)

    // The hired (or offered) candidate is the one the review concerns.
    const offered = vacancy.applications.find((application) => application.offers.length > 0)

    const referenceOutcomes = (offered?.referees ?? []).flatMap((referee) =>
      referee.requests.map((request) => request.response?.outcome).filter(Boolean)
    ) as string[]

    const controls = assessEmergencyControls({
      backgroundChecks: offered?.backgroundChecks ?? [],
      referenceOutcomes,
      fundingConfirmed: vacancy.staffingRequest?.fundingConfirmations[0]?.decision === 'CONFIRMED',
      offerApproved: Boolean(offered?.offers.length),
    })

    const advertHours = (vacancy.closingAt.getTime() - vacancy.openingAt.getTime()) / 3_600_000
    const offerSentAt = offered?.offers[0]?.sentAt ?? null
    const timeToOfferHours =
      offerSentAt && vacancy.openingAt
        ? Math.round((offerSentAt.getTime() - vacancy.openingAt.getTime()) / 3_600_000)
        : null

    // §28.7 roster reuse is evidenced by the candidate already sitting in a pool.
    const usedRoster = offered
      ? (await prisma.talentPoolMember.count({
          where: { candidateId: offered.candidateId, status: { not: 'REMOVED' } },
        })) > 0
      : false

    const review = buildComplianceReview({
      vacancyReference: vacancy.referenceNumber,
      emergencyJustification: vacancy.emergencyJustification,
      approvedBy: vacancy.emergencyApprovedBy,
      approvedAt: vacancy.emergencyApprovedAt,
      advertHours,
      usedRoster,
      usedPreApprovedJobDescription: Boolean(vacancy.staffingRequest?.jobDescriptionFileId),
      usedPreApprovedAssessment: Boolean(vacancy.staffingRequest?.proposedAssessmentMethod),
      controls,
      timeToOfferHours,
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'EMERGENCY_COMPLIANCE_REVIEWED',
      resourceType: 'Vacancy',
      resourceId: vacancy.id,
      newValue: { outcome: review.outcome, findings: review.findings.length },
    })

    return NextResponse.json({
      review,
      minimumAdvertHours: MINIMUM_EMERGENCY_ADVERT_HOURS,
      canRecordOutcome: canMakeHrManagerDecision(user.roles),
    })
  } catch (error) {
    return authzResponse(error)
  }
}
