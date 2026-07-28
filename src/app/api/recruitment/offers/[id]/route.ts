import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { findIndependentApprover } from '@/lib/approvals'

const schema = z
  .object({
    position: z.string().trim().min(1).max(200).optional(),
    dutyStation: z.string().trim().min(1).max(200).optional(),
    contractType: z.string().trim().min(1).max(100).optional(),
    contractDuration: z.string().max(100).nullable().optional(),
    salary: z.string().trim().min(1).max(100).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
    probationPeriod: z.string().max(100).nullable().optional(),
    reportingLine: z.string().max(200).nullable().optional(),
    conditions: z.string().max(5000).nullable().optional(),
    acceptanceDeadline: z.coerce.date().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one corrected field is required')

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('offer.manage')
    const changes = await parseBody(request, schema)
    const old = await prisma.offer.findUnique({ where: { id: params.id } })
    if (!old) throw new AuthzError('Offer not found', 404)
    if (['ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN', 'SUPERSEDED'].includes(old.status))
      throw new AuthzError(`Offer cannot be corrected from ${old.status}`, 409)
    const startDate = changes.startDate ?? old.startDate
    const endDate = changes.endDate === undefined ? old.endDate : changes.endDate
    const deadline = changes.acceptanceDeadline ?? old.acceptanceDeadline
    if (endDate && endDate <= startDate) throw new AuthzError('End date must follow start date', 400)
    if (deadline <= new Date()) throw new AuthzError('Acceptance deadline must be in the future', 400)
    const approverUserId = await findIndependentApprover(user.userId)
    const corrected = await prisma.$transaction(async (tx) => {
      await tx.offer.update({ where: { id: old.id }, data: { status: 'SUPERSEDED' } })
      const created = await tx.offer.create({
        data: {
          applicationId: old.applicationId,
          offerTemplateId: old.offerTemplateId,
          position: changes.position ?? old.position,
          dutyStation: changes.dutyStation ?? old.dutyStation,
          contractType: changes.contractType ?? old.contractType,
          contractDuration: changes.contractDuration === undefined ? old.contractDuration : changes.contractDuration,
          salary: changes.salary ?? old.salary,
          startDate,
          endDate,
          probationPeriod: changes.probationPeriod === undefined ? old.probationPeriod : changes.probationPeriod,
          reportingLine: changes.reportingLine === undefined ? old.reportingLine : changes.reportingLine,
          conditions: changes.conditions === undefined ? old.conditions : changes.conditions,
          acceptanceDeadline: deadline,
          status: 'PENDING_APPROVAL',
          version: old.version + 1,
          supersedesOfferId: old.id,
        },
      })
      await tx.approval.create({
        data: {
          resourceType: 'OFFER',
          resourceId: created.id,
          approverUserId,
          requestedBy: user.userId,
          decision: 'PENDING',
        },
      })
      await tx.application.update({
        where: { id: old.applicationId },
        data: { offerStatus: 'PENDING_APPROVAL', internalStatus: 'OFFER_DRAFT' },
      })
      return created
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'OFFER_CORRECTED',
      resourceType: 'Offer',
      resourceId: corrected.id,
      previousValue: old,
      newValue: corrected,
    })
    return Response.json({ success: true, offer: corrected })
  } catch (error) {
    return authzResponse(error)
  }
}
