import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { findIndependentApprover } from '@/lib/approvals'
import {
  OVERRIDE_REASON_CODES,
  overrideRequiresEvidence,
  overrideRequiresApproval,
} from '@/lib/longlisting-rules'
import {
  parseAnonymisationPolicy,
  applyAnonymisation,
  stageAllowsAnonymisation,
} from '@/lib/anonymisation'

/**
 * §11.5 The exception-review queue, and §11.6 the override controls.
 *
 * HR only ever sees the applications the engine could not decide, which is what
 * makes longlisting fast without removing human oversight. An override never
 * erases the automatic result: `originalOutcome` is written once at evaluation
 * time and is not touched here.
 */

const schema = z.object({
  evaluationId: z.string().min(1),
  humanDecision: z.enum(['ELIGIBLE', 'INELIGIBLE', 'NEEDS_MORE_INFORMATION']),
  overrideReasonCode: z.enum(OVERRIDE_REASON_CODES),
  decisionReason: z.string().trim().min(10, 'Explain the decision in at least 10 characters').max(2000),
  evidenceFileId: z.string().uuid().optional().nullable(),
})

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    if (!(await hasPermission(user.userId, 'longlist.review'))) throw new AuthzError('Forbidden', 403)

    const url = new URL(request.url)
    const vacancyId = url.searchParams.get('vacancyId')
    const includeDecided = url.searchParams.get('includeDecided') === '1'

    const evaluations = await prisma.eligibilityEvaluation.findMany({
      where: {
        suggestedOutcome: { in: ['REQUIRES_REVIEW', 'INCOMPLETE_APPLICATION', 'DUPLICATE_APPLICATION'] },
        ...(includeDecided ? {} : { humanDecision: null }),
        ...(vacancyId ? { longlistRun: { vacancyId } } : {}),
      },
      orderBy: { evaluatedAt: 'desc' },
      take: 400,
      select: {
        id: true,
        applicationId: true,
        suggestedOutcome: true,
        originalOutcome: true,
        eligibilityScore: true,
        maximumScore: true,
        resultJson: true,
        decidingRuleId: true,
        humanDecision: true,
        decisionReason: true,
        overrideReasonCode: true,
        decidedBy: true,
        decidedAt: true,
        evaluatedAt: true,
        longlistRun: { select: { id: true, status: true, vacancyId: true } },
      },
    })

    const applicationIds = [...new Set(evaluations.map((item) => item.applicationId))]
    const applications = applicationIds.length
      ? await prisma.application.findMany({
          where: { id: { in: applicationIds } },
          select: {
            id: true,
            referenceNumber: true,
            internalStatus: true,
            submittedAt: true,
            candidate: {
              select: {
                id: true,
                legalFirstName: true,
                lastName: true,
                nationality: true,
                primaryPhone: true,
                user: { select: { email: true } },
              },
            },
            vacancy: {
              select: { id: true, title: true, referenceNumber: true, anonymisedReview: true, anonymisedFieldsJson: true },
            },
          },
        })
      : []
    const applicationById = new Map(applications.map((item) => [item.id, item]))

    return NextResponse.json({
      exceptions: evaluations.map((evaluation) => {
        const application = applicationById.get(evaluation.applicationId)
        // §28.3 apply the vacancy's configured field policy rather than an
        // all-or-nothing switch, so HR can hide a name while still letting a
        // reviewer see, say, nationality where the role genuinely requires it.
        const policy = application
          ? parseAnonymisationPolicy(application.vacancy)
          : { enabled: false, hidden: new Set<string>() }
        const active =
          policy.enabled && application ? stageAllowsAnonymisation(application.internalStatus) : false
        const candidate =
          application && active
            ? applyAnonymisation(application.candidate, policy, {
                applicationId: application.id,
                applicationReference: application.referenceNumber,
              })
            : null

        return {
          id: evaluation.id,
          applicationId: evaluation.applicationId,
          applicationReference: application?.referenceNumber ?? null,
          candidateName: active
            ? (candidate?.alias ?? null)
            : application
              ? `${application.candidate.legalFirstName} ${application.candidate.lastName}`.trim()
              : null,
          anonymised: active,
          hiddenFields: active ? (candidate?.hiddenFields ?? []) : [],
          vacancy: application?.vacancy ?? null,
          internalStatus: application?.internalStatus ?? null,
          submittedAt: application?.submittedAt ?? null,
          suggestedOutcome: evaluation.suggestedOutcome,
          originalOutcome: evaluation.originalOutcome,
          eligibilityScore: evaluation.eligibilityScore?.toString() ?? null,
          maximumScore: evaluation.maximumScore?.toString() ?? null,
          decidingRuleId: evaluation.decidingRuleId,
          results: JSON.parse(evaluation.resultJson || '[]'),
          humanDecision: evaluation.humanDecision,
          decisionReason: evaluation.decisionReason,
          overrideReasonCode: evaluation.overrideReasonCode,
          decidedAt: evaluation.decidedAt,
          evaluatedAt: evaluation.evaluatedAt,
          run: evaluation.longlistRun,
        }
      }),
      capabilities: { override: await hasPermission(user.userId, 'longlist.override') },
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('longlist.review')
    const input = await parseBody(request, schema)

    const evaluation = await prisma.eligibilityEvaluation.findUnique({
      where: { id: input.evaluationId },
      select: {
        id: true,
        applicationId: true,
        suggestedOutcome: true,
        originalOutcome: true,
        humanDecision: true,
      },
    })
    if (!evaluation) throw new AuthzError('Evaluation not found', 404)
    if (evaluation.humanDecision) throw new AuthzError('This exception has already been decided', 409)

    // §11.6 evidence is mandatory for the reason codes that assert a fact the
    // engine could not see.
    if (overrideRequiresEvidence(input.overrideReasonCode) && !input.evidenceFileId)
      throw new AuthzError('Attach supporting evidence for this override reason', 422)

    // Reversing a definite automatic outcome is a stronger act than resolving an
    // unclear one, and needs the override permission rather than review alone.
    const reversesAutomaticOutcome =
      (evaluation.originalOutcome === 'AUTOMATICALLY_INELIGIBLE' && input.humanDecision === 'ELIGIBLE') ||
      (evaluation.originalOutcome === 'AUTOMATICALLY_ELIGIBLE' && input.humanDecision === 'INELIGIBLE')
    if (reversesAutomaticOutcome && !(await hasPermission(user.userId, 'longlist.override')))
      throw new AuthzError('Reversing an automatic longlisting outcome requires override authority', 403)

    let overrideApprovalId: string | null = null
    if (overrideRequiresApproval(input.overrideReasonCode)) {
      const approverUserId = await findIndependentApprover(user.userId, ['HR_MANAGER'])
      const approval = await prisma.approval.create({
        data: {
          resourceType: 'LONGLIST_OVERRIDE',
          resourceId: evaluation.id,
          stage: 1,
          approverUserId,
          requestedBy: user.userId,
          decision: 'PENDING',
        },
      })
      overrideApprovalId = approval.id
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.eligibilityEvaluation.update({
        where: { id: evaluation.id },
        data: {
          humanDecision: input.humanDecision,
          decisionReason: input.decisionReason,
          overrideReasonCode: input.overrideReasonCode,
          overrideEvidenceFileId: input.evidenceFileId || null,
          overrideApprovalId,
          decidedBy: user.userId,
          decidedAt: new Date(),
        },
      })
      // The application-level flag mirrors the decision for list filtering, but
      // the stage itself only moves when the run is confirmed (§11.8).
      await tx.application.update({
        where: { id: evaluation.applicationId },
        data: {
          eligibilityResult:
            input.humanDecision === 'NEEDS_MORE_INFORMATION' ? 'REQUIRES_HUMAN_REVIEW' : input.humanDecision,
        },
      })
      return updated
    })

    await logAudit({
      actorUserId: user.userId,
      action: reversesAutomaticOutcome ? 'LONGLIST_OUTCOME_OVERRIDDEN' : 'LONGLIST_EXCEPTION_DECIDED',
      resourceType: 'EligibilityEvaluation',
      resourceId: evaluation.id,
      previousValue: { originalOutcome: evaluation.originalOutcome, suggestedOutcome: evaluation.suggestedOutcome },
      newValue: {
        humanDecision: input.humanDecision,
        overrideReasonCode: input.overrideReasonCode,
        evidenceFileId: input.evidenceFileId ?? null,
        pendingApprovalId: overrideApprovalId,
      },
      reason: input.decisionReason,
    })

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        eligibilityScore: result.eligibilityScore?.toString() ?? null,
        maximumScore: result.maximumScore?.toString() ?? null,
      },
      requiresApproval: Boolean(overrideApprovalId),
    })
  } catch (error) {
    return authzResponse(error)
  }
}
