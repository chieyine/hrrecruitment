import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { runLonglisting, confirmLonglistRun } from '@/lib/eligibility'
import { canMakeHrManagerDecision } from '@/lib/recruitment-role-policy'
import { recordSignatureIn, logSignatureCaptured } from '@/lib/signatures'

/** §11.3 / §11.8 Longlisting runs and the confirmed longlist. */

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('RUN'),
    vacancyId: z.string().min(1),
    trigger: z.enum(['DEADLINE_CLOSE', 'MANUAL', 'RERUN']).default('MANUAL'),
  }),
  z.object({
    action: z.literal('CONFIRM'),
    runId: z.string().min(1),
    note: z.string().trim().max(2000).optional(),
  }),
])

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    if (!(await hasPermission(user.userId, 'longlist.review'))) throw new AuthzError('Forbidden', 403)
    const url = new URL(request.url)
    const vacancyId = url.searchParams.get('vacancyId')

    const runs = await prisma.longlistRun.findMany({
      where: vacancyId ? { vacancyId } : {},
      orderBy: { startedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        vacancyId: true,
        trigger: true,
        status: true,
        totalApplications: true,
        completeApplications: true,
        incompleteApplications: true,
        automaticallyEligible: true,
        automaticallyIneligible: true,
        requiresReview: true,
        duplicateApplications: true,
        withdrawnApplications: true,
        reasonDistributionJson: true,
        ruleSnapshotJson: true,
        startedAt: true,
        completedAt: true,
        confirmedBy: true,
        confirmedAt: true,
        confirmationNote: true,
        vacancy: { select: { id: true, title: true, referenceNumber: true, status: true } },
        _count: { select: { evaluations: true } },
      },
    })

    // §11.8 the reason distribution is stored keyed by rule id; resolve the
    // labels so the summary reads as a report rather than a set of uuids.
    const ruleIds = new Set<string>()
    for (const run of runs)
      for (const key of Object.keys(JSON.parse(run.reasonDistributionJson || '{}'))) ruleIds.add(key)
    const ruleLabels = ruleIds.size
      ? await prisma.eligibilityRule.findMany({
          where: { id: { in: [...ruleIds] } },
          select: { id: true, label: true, ruleType: true },
        })
      : []
    const labelById = new Map(ruleLabels.map((rule) => [rule.id, rule]))

    return NextResponse.json({
      runs: runs.map((run) => {
        const distribution = JSON.parse(run.reasonDistributionJson || '{}') as Record<string, number>
        return {
          ...run,
          reasonDistribution: Object.entries(distribution)
            .map(([ruleId, count]) => ({
              ruleId,
              count,
              label: labelById.get(ruleId)?.label ?? 'Unknown rule',
              ruleType: labelById.get(ruleId)?.ruleType ?? null,
            }))
            .sort((a, b) => b.count - a.count),
        }
      }),
      capabilities: {
        run: await hasPermission(user.userId, 'longlist.run'),
        confirm: await hasPermission(user.userId, 'longlist.confirm'),
        override: await hasPermission(user.userId, 'longlist.override'),
      },
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(request, schema)

    if (input.action === 'RUN') {
      await requirePermission('longlist.run')
      const vacancy = await prisma.vacancy.findUnique({
        where: { id: input.vacancyId },
        select: { id: true, status: true, referenceNumber: true, longlistingRulesLockedAt: true },
      })
      if (!vacancy) throw new AuthzError('Vacancy not found', 404)
      // §11.3 longlisting assesses submitted applications; running it against an
      // unpublished draft would evaluate nothing and imply a result that is not real.
      if (['DRAFT', 'PENDING_APPROVAL', 'RETURNED_FOR_CORRECTION'].includes(vacancy.status))
        throw new AuthzError('Publish the vacancy before running longlisting', 422)

      const activeRules = await prisma.eligibilityRule.count({
        where: { vacancyId: vacancy.id, active: true, classification: 'MANDATORY_KNOCKOUT' },
      })
      if (!activeRules)
        throw new AuthzError(
          'Define at least one mandatory longlisting rule before running automatic longlisting',
          422
        )

      const run = await runLonglisting({
        vacancyId: vacancy.id,
        startedBy: user.userId,
        trigger: input.trigger ?? 'MANUAL',
      })

      await logAudit({
        actorUserId: user.userId,
        action: 'LONGLIST_RUN_COMPLETED',
        resourceType: 'LonglistRun',
        resourceId: run.id,
        newValue: {
          vacancy: vacancy.referenceNumber,
          total: run.totalApplications,
          eligible: run.automaticallyEligible,
          ineligible: run.automaticallyIneligible,
          review: run.requiresReview,
        },
      })
      return NextResponse.json({ success: true, run })
    }

    // §11.8 confirmation is the approval record for the longlist itself.
    await requirePermission('longlist.confirm')
    if (!canMakeHrManagerDecision(user.roles))
      throw new AuthzError('Only an HR manager may confirm a longlist', 403)

    const run = await prisma.longlistRun.findUnique({
      where: { id: input.runId },
      select: { id: true, vacancyId: true, startedBy: true, status: true, vacancy: { select: { referenceNumber: true } } },
    })
    if (!run) throw new AuthzError('Longlist run not found', 404)

    const signatureBase = {
      resourceType: 'LONGLIST_APPROVAL' as const,
      resourceId: run.id,
      signatoryUserId: user.userId,
      signatoryName: user.email,
      signatoryEmail: user.email,
      signatoryRole: 'HR_MANAGER',
      signatureMethod: 'APPROVAL_CLICK' as const,
      request,
    }

    let result: { runId: string; moved: number }
    let signature: { id: string; documentHash: string } | null = null
    let signaturePayload: unknown = null
    try {
      result = await confirmLonglistRun({
        runId: input.runId,
        confirmedBy: user.userId,
        note: input.note,
        // §11.8 The confirmation *is* the longlisting approval record, so it is
        // signed within the same transaction as the applications it moves.
        sign: async (tx, moved) => {
          signaturePayload = { runId: run.id, vacancy: run.vacancy.referenceNumber, moved }
          signature = await recordSignatureIn(tx, { ...signatureBase, payload: signaturePayload })
        },
      })
    } catch (error) {
      // A validation failure is the caller's problem; a signature failure is not
      // — both leave the longlist unconfirmed, which is the safe outcome.
      throw new AuthzError(error instanceof Error ? error.message : 'Unable to confirm this longlist', 422)
    }

    if (signature) await logSignatureCaptured({ ...signatureBase, payload: signaturePayload }, signature)

    await logAudit({
      actorUserId: user.userId,
      action: 'LONGLIST_CONFIRMED',
      resourceType: 'LonglistRun',
      resourceId: run.id,
      newValue: result,
      reason: input.note,
    })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    return authzResponse(error)
  }
}
