import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { findIndependentApprover } from '@/lib/approvals'

const schema = z.object({ applicationId: z.string().min(1), offerTemplateId: z.string().optional(), position: z.string().trim().min(1).max(200), dutyStation: z.string().trim().min(1).max(200), contractType: z.string().trim().min(1).max(100), contractDuration: z.string().max(100).optional(), salary: z.string().trim().min(1).max(100), startDate: z.coerce.date(), endDate: z.coerce.date().optional(), probationPeriod: z.string().max(100).optional(), reportingLine: z.string().max(200).optional(), conditions: z.string().max(5000).optional(), acceptanceDeadline: z.coerce.date() }).superRefine((value, context) => { if (value.acceptanceDeadline <= new Date()) context.addIssue({ code: 'custom', path: ['acceptanceDeadline'], message: 'Acceptance deadline must be in the future' }); if (value.endDate && value.endDate <= value.startDate) context.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must follow start date' }) })

export async function POST(request: Request) {
  try {
    const user = await requirePermission('offer.manage')

    const body = await parseBody(request, schema)
    const { applicationId, position, dutyStation, contractType, contractDuration, salary, startDate, endDate, probationPeriod, reportingLine, conditions, acceptanceDeadline, offerTemplateId } = body

    // Only issue an offer to an application at the recommended/offer-draft stage.
    const application = await prisma.application.findUnique({ where: { id: applicationId } })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (!['RECOMMENDED', 'OFFER_DRAFT'].includes(application.internalStatus)) {
      return NextResponse.json(
        { error: `Cannot issue an offer from status ${application.internalStatus}` },
        { status: 422 }
      )
    }

    const existingOffer = await prisma.offer.findFirst({ where: { applicationId, status: { notIn: ['DECLINED', 'EXPIRED', 'WITHDRAWN', 'SUPERSEDED'] } } })
    if (existingOffer) return NextResponse.json({ error: 'An active offer already exists for this application' }, { status: 409 })
    const approverUserId = await findIndependentApprover(user.userId)

    const offer = await prisma.$transaction(async (tx) => {
      const created = await tx.offer.create({ data: {
        applicationId,
        position,
        dutyStation,
        contractType,
        contractDuration: contractDuration || null,
        salary,
        startDate,
        endDate: endDate || null,
        probationPeriod: probationPeriod || null,
        reportingLine: reportingLine || null,
        conditions: conditions || null,
        acceptanceDeadline,
        offerTemplateId: offerTemplateId || null,
        status: 'PENDING_APPROVAL',
      } })
      await tx.approval.create({ data: { resourceType: 'OFFER', resourceId: created.id, stage: 1, approverUserId, requestedBy: user.userId, decision: 'PENDING' } })
      await tx.application.update({ where: { id: applicationId }, data: { offerStatus: 'PENDING_APPROVAL', internalStatus: 'OFFER_DRAFT' } })
      return created
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'OFFER_SUBMITTED_FOR_APPROVAL',
      resourceType: 'Offer',
      resourceId: offer.id,
      newValue: { position, salary, startDate },
    })

    return NextResponse.json({ success: true, offerId: offer.id })
  } catch (err) {
    return authzResponse(err)
  }
}
