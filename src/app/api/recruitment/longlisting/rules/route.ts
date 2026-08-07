import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { findIndependentApprover } from '@/lib/approvals'
import { canMakeHrManagerDecision } from '@/lib/recruitment-role-policy'
import { RULE_TYPES, RULE_CLASSIFICATIONS } from '@/lib/longlisting-rules'

/**
 * §11.1 / §11.7 Longlisting rule administration.
 *
 * Before publication rules are freely editable. Once the vacancy is published
 * they lock: every change becomes a proposal that an HR Manager must approve,
 * carries a before/after diff, and triggers a fairness review if applications
 * have already been received.
 */

const ruleBody = z.object({
  vacancyId: z.string().min(1),
  ruleType: z.enum(RULE_TYPES),
  classification: z.enum(RULE_CLASSIFICATIONS).default('MANDATORY_KNOCKOUT'),
  label: z.string().trim().min(3).max(300),
  field: z.string().trim().max(200).optional().nullable(),
  operator: z
    .enum(['GTE', 'LTE', 'EQUALS', 'IN', 'CONTAINS', 'TRUE', 'BEFORE', 'AFTER', 'EXISTS'])
    .default('GTE'),
  expected: z.unknown(),
  failureMessage: z.string().trim().min(5).max(500),
  weight: z.coerce.number().min(0).max(100).default(0),
  displayOrder: z.coerce.number().int().min(0).max(500).default(0),
})

const schema = z.discriminatedUnion('action', [
  ruleBody.extend({ action: z.literal('CREATE'), reason: z.string().trim().max(2000).optional() }),
  ruleBody.extend({
    action: z.literal('UPDATE'),
    ruleId: z.string().min(1),
    reason: z.string().trim().max(2000).optional(),
  }),
  z.object({
    action: z.literal('DEACTIVATE'),
    ruleId: z.string().min(1),
    reason: z.string().trim().min(10).max(2000),
  }),
  z.object({
    action: z.literal('DECIDE_CHANGE'),
    changeId: z.string().min(1),
    decision: z.enum(['APPROVED', 'REJECTED']),
    fairnessReviewNote: z.string().trim().max(2000).optional(),
  }),
])

export async function GET(request: Request) {
  try {
    await requirePermission('longlist.rule.manage')
    const vacancyId = new URL(request.url).searchParams.get('vacancyId')
    if (!vacancyId) throw new AuthzError('vacancyId is required', 400)

    const [vacancy, rules, pendingChanges, applicationCount] = await Promise.all([
      prisma.vacancy.findUnique({
        where: { id: vacancyId },
        select: {
          id: true,
          title: true,
          referenceNumber: true,
          status: true,
          longlistingRulesLockedAt: true,
          questions: { select: { id: true, label: true, fieldType: true }, orderBy: { displayOrder: 'asc' } },
          requiredDocuments: { select: { documentType: true, required: true } },
        },
      }),
      prisma.eligibilityRule.findMany({
        where: { vacancyId, active: true },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.eligibilityRuleChange.findMany({
        where: { vacancyId, status: 'PENDING' },
        orderBy: { requestedAt: 'desc' },
      }),
      prisma.application.count({ where: { vacancyId, internalStatus: { not: 'DRAFT' } } }),
    ])
    if (!vacancy) throw new AuthzError('Vacancy not found', 404)

    return NextResponse.json({
      vacancy,
      locked: Boolean(vacancy.longlistingRulesLockedAt),
      applicationCount,
      rules: rules.map((rule) => ({
        ...rule,
        weight: rule.weight.toString(),
        expected: JSON.parse(rule.expectedJson || 'null'),
      })),
      pendingChanges,
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('longlist.rule.manage')
    const input = await parseBody(request, schema)

    if (input.action === 'DECIDE_CHANGE') {
      // §11.7 only the HR Manager releases a change to a locked rule set.
      if (!canMakeHrManagerDecision(user.roles))
        throw new AuthzError('Only an HR manager may decide a longlisting rule change', 403)
      const change = await prisma.eligibilityRuleChange.findUnique({ where: { id: input.changeId } })
      if (!change) throw new AuthzError('Rule change not found', 404)
      if (change.status !== 'PENDING') throw new AuthzError('This change has already been decided', 422)
      if (change.requestedBy === user.userId)
        throw new AuthzError('You cannot approve a rule change you requested', 403)
      if (change.fairnessReviewRequired && input.decision === 'APPROVED' && !input.fairnessReviewNote?.trim())
        throw new AuthzError('A fairness review note is required for this change', 422)

      const proposed = JSON.parse(change.proposedJson)
      const result = await prisma.$transaction(async (tx) => {
        const decided = await tx.eligibilityRuleChange.update({
          where: { id: change.id },
          data: {
            status: input.decision,
            decidedBy: user.userId,
            decidedAt: new Date(),
            fairnessReviewNote: input.fairnessReviewNote?.trim() || null,
          },
        })
        if (input.decision === 'APPROVED') {
          if (change.changeType === 'DEACTIVATE') {
            await tx.eligibilityRule.update({ where: { id: change.ruleId }, data: { active: false } })
          } else {
            await tx.eligibilityRule.update({
              where: { id: change.ruleId },
              data: {
                ruleType: proposed.ruleType,
                classification: proposed.classification,
                label: proposed.label,
                field: proposed.field ?? null,
                operator: proposed.operator,
                expectedJson: JSON.stringify(proposed.expected ?? null),
                failureMessage: proposed.failureMessage,
                weight: proposed.weight ?? 0,
                displayOrder: proposed.displayOrder ?? 0,
                active: true,
                version: { increment: 1 },
              },
            })
          }
        }
        return decided
      })

      await logAudit({
        actorUserId: user.userId,
        action: `LONGLIST_RULE_CHANGE_${input.decision}`,
        resourceType: 'EligibilityRule',
        resourceId: change.ruleId,
        previousValue: change.previousJson ? JSON.parse(change.previousJson) : null,
        newValue: proposed,
        reason: input.fairnessReviewNote,
      })
      return NextResponse.json({ success: true, result })
    }

    const vacancyId =
      input.action === 'DEACTIVATE'
        ? (await prisma.eligibilityRule.findUnique({ where: { id: input.ruleId }, select: { vacancyId: true } }))
            ?.vacancyId
        : input.vacancyId
    if (!vacancyId) throw new AuthzError('Rule not found', 404)

    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancyId },
      select: { id: true, status: true, longlistingRulesLockedAt: true },
    })
    if (!vacancy) throw new AuthzError('Vacancy not found', 404)

    const locked = Boolean(vacancy.longlistingRulesLockedAt)
    const applicationsReceived = await prisma.application.count({
      where: { vacancyId, internalStatus: { not: 'DRAFT' } },
    })

    // --- Unlocked: direct edit, still fully audited. ---
    if (!locked) {
      if (input.action === 'CREATE') {
        const created = await prisma.eligibilityRule.create({
          data: {
            vacancyId,
            ruleType: input.ruleType,
            classification: input.classification,
            label: input.label,
            field: input.field || null,
            operator: input.operator,
            expectedJson: JSON.stringify(input.expected ?? null),
            failureMessage: input.failureMessage,
            weight: input.weight,
            displayOrder: input.displayOrder,
            createdBy: user.userId,
          },
        })
        await logAudit({
          actorUserId: user.userId,
          action: 'LONGLIST_RULE_CREATED',
          resourceType: 'EligibilityRule',
          resourceId: created.id,
          newValue: { ...input },
        })
        return NextResponse.json({ success: true, result: { ...created, weight: created.weight.toString() } })
      }
      if (input.action === 'UPDATE') {
        const previous = await prisma.eligibilityRule.findUnique({ where: { id: input.ruleId } })
        if (!previous) throw new AuthzError('Rule not found', 404)
        const updated = await prisma.eligibilityRule.update({
          where: { id: input.ruleId },
          data: {
            ruleType: input.ruleType,
            classification: input.classification,
            label: input.label,
            field: input.field || null,
            operator: input.operator,
            expectedJson: JSON.stringify(input.expected ?? null),
            failureMessage: input.failureMessage,
            weight: input.weight,
            displayOrder: input.displayOrder,
            version: { increment: 1 },
          },
        })
        await logAudit({
          actorUserId: user.userId,
          action: 'LONGLIST_RULE_UPDATED',
          resourceType: 'EligibilityRule',
          resourceId: updated.id,
          previousValue: { ...previous, weight: previous.weight.toString() },
          newValue: { ...input },
        })
        return NextResponse.json({ success: true, result: { ...updated, weight: updated.weight.toString() } })
      }
      const removed = await prisma.eligibilityRule.update({
        where: { id: input.ruleId },
        data: { active: false },
      })
      await logAudit({
        actorUserId: user.userId,
        action: 'LONGLIST_RULE_DEACTIVATED',
        resourceType: 'EligibilityRule',
        resourceId: removed.id,
        reason: input.reason,
      })
      return NextResponse.json({ success: true, result: { ...removed, weight: removed.weight.toString() } })
    }

    // --- Locked: everything becomes an approvable, diffed proposal (§11.7). ---
    if (input.action === 'CREATE')
      throw new AuthzError(
        'Longlisting rules are locked for this vacancy. Adding a new rule after publication requires a new vacancy version.',
        409
      )
    if (!input.reason?.trim())
      throw new AuthzError('A reason is required to change a locked longlisting rule', 422)

    const previous = await prisma.eligibilityRule.findUnique({ where: { id: input.ruleId } })
    if (!previous) throw new AuthzError('Rule not found', 404)

    const proposed =
      input.action === 'DEACTIVATE'
        ? { active: false }
        : {
            ruleType: input.ruleType,
            classification: input.classification,
            label: input.label,
            field: input.field ?? null,
            operator: input.operator,
            expected: input.expected ?? null,
            failureMessage: input.failureMessage,
            weight: input.weight,
            displayOrder: input.displayOrder,
          }

    const approverUserId = await findIndependentApprover(user.userId, ['HR_MANAGER'])
    const change = await prisma.$transaction(async (tx) => {
      const approval = await tx.approval.create({
        data: {
          resourceType: 'LONGLIST_RULE_CHANGE',
          resourceId: previous.id,
          stage: 1,
          approverUserId,
          requestedBy: user.userId,
          decision: 'PENDING',
        },
      })
      return tx.eligibilityRuleChange.create({
        data: {
          ruleId: previous.id,
          vacancyId,
          changeType: input.action === 'DEACTIVATE' ? 'DEACTIVATE' : 'UPDATE',
          previousJson: JSON.stringify({
            ruleType: previous.ruleType,
            classification: previous.classification,
            label: previous.label,
            field: previous.field,
            operator: previous.operator,
            expected: JSON.parse(previous.expectedJson || 'null'),
            failureMessage: previous.failureMessage,
            weight: previous.weight.toString(),
            displayOrder: previous.displayOrder,
          }),
          proposedJson: JSON.stringify(proposed),
          reason: input.reason!,
          requestedBy: user.userId,
          approvalId: approval.id,
          // §11.7 changing the bar after people have applied is the case that
          // needs a documented fairness review, not just an approval click.
          fairnessReviewRequired: applicationsReceived > 0,
          applicationsAtChange: applicationsReceived,
        },
      })
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'LONGLIST_RULE_CHANGE_REQUESTED',
      resourceType: 'EligibilityRule',
      resourceId: previous.id,
      previousValue: JSON.parse(change.previousJson || 'null'),
      newValue: proposed,
      reason: input.reason,
    })

    return NextResponse.json({
      success: true,
      result: change,
      requiresApproval: true,
      fairnessReviewRequired: change.fairnessReviewRequired,
    })
  } catch (error) {
    return authzResponse(error)
  }
}
