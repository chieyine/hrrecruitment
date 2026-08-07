import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { findIndependentApprover } from '@/lib/approvals'
import { createNotification } from '@/lib/notifications'
import { requireOpenRecruitmentFile } from '@/lib/recruitment-file'

const schema = z
  .object({
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
    const user = await requireRole('RECRUITMENT_OFFICER', 'HR_MANAGER')
    const changes = await parseBody(request, schema)
    const old = await prisma.offer.findUnique({
      where: { id: params.id },
      include: { application: { select: { internalStatus: true } } },
    })
    if (!old) throw new AuthzError('Offer not found', 404)
    requireOpenRecruitmentFile(old.application.internalStatus)
    if (['ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN', 'SUPERSEDED'].includes(old.status))
      throw new AuthzError(`Offer cannot be corrected from ${old.status}`, 409)
    const startDate = changes.startDate ?? old.startDate
    const endDate = changes.endDate === undefined ? old.endDate : changes.endDate
    const deadline = changes.acceptanceDeadline ?? old.acceptanceDeadline
    if (endDate && endDate <= startDate) throw new AuthzError('End date must follow start date', 400)
    if (startDate <= new Date()) throw new AuthzError('Start date must be in the future', 400)
    if (deadline <= new Date()) throw new AuthzError('Acceptance deadline must be in the future', 400)
    if (deadline >= startDate) throw new AuthzError('Acceptance deadline must be before the start date', 400)
    const approverUserId = await findIndependentApprover(user.userId)
    const corrected = await prisma.$transaction(async (tx) => {
      await tx.offer.update({ where: { id: old.id }, data: { status: 'SUPERSEDED' } })
      await tx.approval.updateMany({
        where: { resourceType: 'OFFER', resourceId: old.id, decision: { in: ['PENDING', 'CONDITIONS_PENDING'] } },
        data: {
          decision: 'RETURNED',
          comment: 'Superseded by a corrected offer',
          decidedAt: new Date(),
          lockVersion: { increment: 1 },
        },
      })
      const created = await tx.offer.create({
        data: {
          applicationId: old.applicationId,
          offerTemplateId: old.offerTemplateId,
          templateSnapshotJson: old.templateSnapshotJson,
          position: old.position,
          dutyStation: old.dutyStation,
          contractType: old.contractType,
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
        data: {
          offerStatus: 'PENDING_APPROVAL',
          internalStatus: 'OFFER_DRAFT',
          candidateVisibleStatus: 'DECISION_IN_PROGRESS',
          lockVersion: { increment: 1 },
        },
      })
      if (old.status === 'SENT' || old.status === 'VIEWED')
        await tx.applicationStageHistory.create({
          data: {
            applicationId: old.applicationId,
            fromStatus: 'OFFER_SENT',
            toStatus: 'OFFER_DRAFT',
            changedBy: user.userId,
            reason: 'Issued offer superseded for correction',
          },
        })
      return created
    })
    if (old.status === 'SENT' || old.status === 'VIEWED') {
      const candidate = await prisma.candidateProfile.findFirst({
        where: { applications: { some: { id: old.applicationId } } },
        select: { userId: true },
      })
      if (candidate)
        await createNotification({
          userId: candidate.userId,
          type: 'OFFER_CORRECTION_IN_PROGRESS',
          title: 'Your offer is being corrected',
          body: 'The recruitment team is correcting the offer document. You will be notified when the revised offer is ready.',
          applicationId: old.applicationId,
        })
    }
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
