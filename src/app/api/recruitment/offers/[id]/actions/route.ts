import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, requireRole, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { claimIdempotency, completeIdempotency, abandonIdempotency, type IdempotencyClaim } from '@/lib/idempotency'
import { uploadFileAsset } from '@/lib/s3'
import { textPdf } from '@/lib/simple-pdf'

const schema = z.object({ action: z.enum(['APPROVE', 'SEND', 'WITHDRAW']), comment: z.string().max(2000).optional() })

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  let claim: IdempotencyClaim | null = null
  try {
    const user = await requirePermission('offer.manage')
    const input = await parseBody(request, schema)
    claim = await claimIdempotency({ request, scope: `OFFER_ACTION:${params.id}:${input.action}`, actorUserId: user.userId, payload: input })
    if (claim?.replay) return NextResponse.json(claim.body, { status: claim.statusCode })
    const offer = await prisma.offer.findUnique({ where: { id: params.id }, include: { offerTemplate: true, application: { include: { candidate: true, vacancy: true } } } })
    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    if (input.action === 'APPROVE') {
      await requireRole('HR_MANAGER', 'APPROVER', 'SYSTEM_ADMIN')
      const approval = await prisma.approval.findFirst({ where: { resourceType: 'OFFER', resourceId: offer.id, decision: 'PENDING' }, orderBy: { id: 'desc' } })
      if (!approval) return NextResponse.json({ error: 'No pending approval exists' }, { status: 409 })
      if (approval.requestedBy === user.userId) return NextResponse.json({ error: 'The offer creator cannot approve their own offer' }, { status: 409 })
      if (approval.approverUserId !== user.userId && !user.roles.includes('SYSTEM_ADMIN')) return NextResponse.json({ error: 'This approval is assigned to another approver' }, { status: 403 })
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.approval.updateMany({ where: { id: approval.id, decision: 'PENDING', lockVersion: approval.lockVersion }, data: { decision: 'APPROVED', decidedAt: new Date(), comment: input.comment || null, lockVersion: { increment: 1 } } })
        if (claimed.count !== 1) throw new Error('APPROVAL_CHANGED')
        const updated = await tx.offer.updateMany({ where: { id: offer.id, status: 'PENDING_APPROVAL', version: offer.version }, data: { status: 'APPROVED', version: { increment: 1 } } })
        if (updated.count !== 1) throw new Error('OFFER_CHANGED')
      })
    } else if (input.action === 'SEND') {
      if (offer.status !== 'APPROVED') return NextResponse.json({ error: 'Only an approved offer can be sent' }, { status: 409 })
      let offerFileId = offer.offerFileId
      if (!offerFileId) {
        const candidateName = `${offer.application.candidate.legalFirstName} ${offer.application.candidate.lastName}`
        const variables: Record<string, string> = { candidate_name: candidateName, position: offer.position, duty_station: offer.dutyStation, contract_type: offer.contractType, contract_duration: offer.contractDuration || '', salary: offer.salary, start_date: offer.startDate.toLocaleDateString('en-GB'), end_date: offer.endDate?.toLocaleDateString('en-GB') || '', probation_period: offer.probationPeriod || '', reporting_line: offer.reportingLine || '', conditions: offer.conditions || '', acceptance_deadline: offer.acceptanceDeadline.toLocaleDateString('en-GB') }
        const template = offer.offerTemplate?.bodyTemplate || 'Dear {{candidate_name}},\n\nFRAD is pleased to offer you the position of {{position}} at {{duty_station}}.\n\nContract: {{contract_type}} {{contract_duration}}\nSalary: {{salary}}\nStart date: {{start_date}}\nReporting line: {{reporting_line}}\nConditions: {{conditions}}\n\nPlease respond by {{acceptance_deadline}}.'
        const rendered = template.replace(/\{\{([a-z_]+)\}\}/gi, (token, key) => variables[key] ?? token)
        const bytes = textPdf(`Offer of employment - ${offer.position}`, rendered.split(/\n+/))
        const uploaded = await uploadFileAsset({ ownerUserId: user.userId, originalName: `FRAD-offer-${offer.id}.pdf`, mimeType: 'application/pdf', sizeBytes: bytes.length, buffer: bytes, sensitivityClass: 'CONFIDENTIAL' })
        offerFileId = uploaded.fileAsset.id
      }
      await prisma.$transaction([
        prisma.offer.update({ where: { id: offer.id }, data: { status: 'SENT', sentAt: new Date(), offerFileId } }),
        prisma.application.update({ where: { id: offer.applicationId }, data: { offerStatus: 'SENT', internalStatus: 'OFFER_SENT', candidateVisibleStatus: 'OFFER_SENT', lockVersion: { increment: 1 } } }),
        prisma.applicationStageHistory.create({ data: { applicationId: offer.applicationId, fromStatus: offer.application.internalStatus, toStatus: 'OFFER_SENT', changedBy: user.userId, reason: 'Approved offer sent to candidate' } }),
      ])
      if (offer.application.candidate.userId) await createNotification({ userId: offer.application.candidate.userId, type: 'OFFER_SENT', title: 'Your FRAD job offer is ready', body: `Review and respond to your offer for ${offer.position}.` })
    } else {
      if (['ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN', 'SUPERSEDED'].includes(offer.status)) return NextResponse.json({ error: `Offer cannot be withdrawn from ${offer.status}` }, { status: 409 })
      if (!input.comment?.trim()) return NextResponse.json({ error: 'Withdrawal reason is required' }, { status: 400 })
      await prisma.$transaction([
        prisma.offer.update({ where: { id: offer.id }, data: { status: 'WITHDRAWN', candidateComment: input.comment } }),
        prisma.application.update({ where: { id: offer.applicationId }, data: { offerStatus: 'WITHDRAWN', internalStatus: 'RECOMMENDED', candidateVisibleStatus: 'UNDER_REVIEW', lockVersion: { increment: 1 } } }),
        prisma.applicationStageHistory.create({ data: { applicationId: offer.applicationId, fromStatus: offer.application.internalStatus, toStatus: 'RECOMMENDED', changedBy: user.userId, reason: `Offer withdrawn: ${input.comment}` } }),
      ])
      if (offer.application.candidate.userId) await createNotification({
        userId: offer.application.candidate.userId,
        type: 'OFFER_WITHDRAWN',
        title: 'Offer withdrawn',
        body: `The offer for ${offer.position} has been withdrawn. Open your application for the latest status or contact the recruitment team if you need clarification.`,
      })
    }
    await logAudit({ actorUserId: user.userId, action: `OFFER_${input.action}`, resourceType: 'Offer', resourceId: offer.id, reason: input.comment })
    const responseBody = { success: true }
    await completeIdempotency(claim, 200, responseBody)
    return NextResponse.json(responseBody)
  } catch (err) {
    await abandonIdempotency(claim)
    if (err instanceof Error && ['APPROVAL_CHANGED', 'OFFER_CHANGED'].includes(err.message)) {
      return NextResponse.json({ error: 'The offer or approval changed; refresh and try again' }, { status: 409 })
    }
    return authzResponse(err)
  }
}
