import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { evaluateApplicationEligibility } from '@/lib/eligibility'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    await requirePermission('application.read.all')
    const url = new URL(request.url)
    const applicationId = url.searchParams.get('applicationId')
    const vacancyId = url.searchParams.get('vacancyId')
    const evaluations = applicationId
      ? await prisma.eligibilityEvaluation.findMany({ where: { applicationId }, orderBy: { evaluatedAt: 'desc' } })
      : []
    const rules = vacancyId
      ? await prisma.eligibilityRule.findMany({ where: { vacancyId }, orderBy: { createdAt: 'asc' } })
      : []
    return Response.json({ evaluations, rules })
  } catch (error) {
    return authzResponse(error)
  }
}

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('CREATE_RULE'),
    vacancyId: z.string().min(1),
    ruleType: z.enum(['MINIMUM_EXPERIENCE', 'REQUIRED_LICENCE', 'REQUIRED_ANSWER']),
    field: z.string().optional(),
    operator: z.enum(['GTE', 'EQUALS', 'IN', 'TRUE']),
    expected: z.unknown(),
    failureMessage: z.string().trim().min(5).max(500),
    label: z.string().trim().min(3).max(200).optional(),
  }),
  z.object({ action: z.literal('EVALUATE'), applicationId: z.string().min(1) }),
  z.object({
    action: z.literal('DECIDE'),
    evaluationId: z.string().min(1),
    humanDecision: z.enum(['ELIGIBLE', 'INELIGIBLE', 'NEEDS_MORE_INFORMATION']),
    decisionReason: z.string().trim().min(10).max(2000),
  }),
])

export async function POST(request: Request) {
  try {
    const user = await requirePermission('application.stage.change')
    const input = await parseBody(request, schema)
    let result: any
    if (input.action === 'CREATE_RULE')
      result = await prisma.eligibilityRule.create({
        data: {
          vacancyId: input.vacancyId,
          label: input.label?.trim() || input.failureMessage,
          ruleType: input.ruleType,
          field: input.field || null,
          operator: input.operator,
          expectedJson: JSON.stringify(input.expected),
          failureMessage: input.failureMessage,
          createdBy: user.userId,
        },
      })
    else if (input.action === 'EVALUATE') result = await evaluateApplicationEligibility(input.applicationId)
    else {
      const evaluation = await prisma.eligibilityEvaluation.findUnique({ where: { id: input.evaluationId } })
      if (!evaluation) throw new AuthzError('Evaluation not found', 404)
      result = await prisma.eligibilityEvaluation.update({
        where: { id: input.evaluationId },
        data: {
          humanDecision: input.humanDecision,
          decisionReason: input.decisionReason,
          decidedBy: user.userId,
          decidedAt: new Date(),
        },
      })
      await prisma.application.update({
        where: { id: evaluation.applicationId },
        data: { eligibilityResult: input.humanDecision },
      })
    }
    await logAudit({
      actorUserId: user.userId,
      action: `ELIGIBILITY_${input.action}`,
      resourceType: 'Eligibility',
      resourceId: result.id,
      newValue: input,
    })
    return Response.json({ success: true, result })
  } catch (error) {
    return authzResponse(error)
  }
}
