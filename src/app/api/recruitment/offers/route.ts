import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { findIndependentApprover } from '@/lib/approvals'

const schema = z
  .object({
    applicationId: z.string().min(1),
    offerTemplateId: z.string().optional(),
    contractDuration: z.string().max(100).optional(),
    salary: z.string().trim().min(1).max(100),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    probationPeriod: z.string().max(100).optional(),
    reportingLine: z.string().max(200).optional(),
    conditions: z.string().max(5000).optional(),
    acceptanceDeadline: z.coerce.date(),
  })
  .superRefine((value, context) => {
    if (value.acceptanceDeadline <= new Date())
      context.addIssue({
        code: 'custom',
        path: ['acceptanceDeadline'],
        message: 'Acceptance deadline must be in the future',
      })
    if (value.startDate <= new Date())
      context.addIssue({ code: 'custom', path: ['startDate'], message: 'Start date must be in the future' })
    if (value.acceptanceDeadline >= value.startDate)
      context.addIssue({
        code: 'custom',
        path: ['acceptanceDeadline'],
        message: 'Acceptance deadline must be before the start date',
      })
    if (value.endDate && value.endDate <= value.startDate)
      context.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must follow start date' })
  })

export async function POST(request: Request) {
  try {
    const user = await requireRole('RECRUITMENT_OFFICER', 'HR_MANAGER')

    const body = await parseBody(request, schema)
    const {
      applicationId,
      contractDuration,
      salary,
      startDate,
      endDate,
      probationPeriod,
      reportingLine,
      conditions,
      acceptanceDeadline,
      offerTemplateId,
    } = body

    // Only issue an offer to an application at the recommended/offer-draft stage.
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        vacancy: { include: { dutyStation: { select: { name: true } } } },
        selectionDecisions: {
          where: { outcome: 'SELECTED', approvedAt: { not: null } },
          select: { id: true },
          take: 1,
        },
      },
    })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (!['RECOMMENDED', 'OFFER_DRAFT'].includes(application.internalStatus)) {
      return NextResponse.json(
        { error: `Cannot issue an offer from status ${application.internalStatus}` },
        { status: 422 }
      )
    }
    if (!application.selectionDecisions.length)
      throw new AuthzError('The selected candidate must complete selection approval before an offer is prepared', 409)
    const offerTemplate = offerTemplateId
      ? await prisma.offerTemplate.findFirst({
          where: { id: offerTemplateId, active: true },
          select: { id: true, name: true, candidateType: true, bodyTemplate: true, version: true },
        })
      : null
    if (offerTemplateId && !offerTemplate) throw new AuthzError('The selected offer template is not available', 422)
    const position = application.vacancy.title
    const dutyStation = application.vacancy.dutyStation.name
    const contractType = application.vacancy.contractType

    const existingOffer = await prisma.offer.findFirst({
      where: { applicationId, status: { notIn: ['DECLINED', 'EXPIRED', 'WITHDRAWN', 'SUPERSEDED'] } },
    })
    if (existingOffer)
      return NextResponse.json({ error: 'An active offer already exists for this application' }, { status: 409 })
    const approverUserId = await findIndependentApprover(user.userId)

    const offer = await prisma.$transaction(async (tx) => {
      const created = await tx.offer.create({
        data: {
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
          templateSnapshotJson: offerTemplate ? JSON.stringify(offerTemplate) : null,
          status: 'PENDING_APPROVAL',
        },
      })
      await tx.approval.create({
        data: {
          resourceType: 'OFFER',
          resourceId: created.id,
          stage: 1,
          approverUserId,
          requestedBy: user.userId,
          decision: 'PENDING',
        },
      })
      await tx.application.update({
        where: { id: applicationId },
        data: { offerStatus: 'PENDING_APPROVAL', internalStatus: 'OFFER_DRAFT', lockVersion: { increment: 1 } },
      })
      if (application.internalStatus !== 'OFFER_DRAFT')
        await tx.applicationStageHistory.create({
          data: {
            applicationId,
            fromStatus: application.internalStatus,
            toStatus: 'OFFER_DRAFT',
            changedBy: user.userId,
            reason: 'Offer submitted for approval',
          },
        })
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
