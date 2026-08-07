import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { claimIdempotency, completeIdempotency, abandonIdempotency, type IdempotencyClaim } from '@/lib/idempotency'
import { uploadFileAsset } from '@/lib/s3'
import { buildOfferDocument } from '@/lib/offer-document'
import { snapshottedOfferBody } from '@/lib/offer-template'
import { requireOpenRecruitmentFile } from '@/lib/recruitment-file'

const schema = z.object({ action: z.enum(['SEND', 'WITHDRAW']), comment: z.string().max(2000).optional() })

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  let claim: IdempotencyClaim | null = null
  try {
    const user = await requireRole('RECRUITMENT_OFFICER', 'HR_MANAGER')
    const input = await parseBody(request, schema)
    claim = await claimIdempotency({
      request,
      scope: `OFFER_ACTION:${params.id}:${input.action}`,
      actorUserId: user.userId,
      payload: input,
    })
    if (claim?.replay) return NextResponse.json(claim.body, { status: claim.statusCode })
    const offer = await prisma.offer.findUnique({
      where: { id: params.id },
      include: { offerTemplate: true, application: { include: { candidate: true, vacancy: true } } },
    })
    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    requireOpenRecruitmentFile(offer.application.internalStatus)
    if (input.action === 'SEND') {
      if (offer.status !== 'APPROVED')
        return NextResponse.json({ error: 'Only an approved offer can be sent' }, { status: 409 })
      let offerFileId = offer.offerFileId
      if (!offerFileId) {
        const candidateName = `${offer.application.candidate.legalFirstName} ${offer.application.candidate.lastName}`
        const bytes = buildOfferDocument(
          {
            ...offer,
            candidateName,
            templateBody: snapshottedOfferBody(offer.templateSnapshotJson, offer.offerTemplate?.bodyTemplate),
          },
          'ISSUED'
        )
        const uploaded = await uploadFileAsset({
          ownerUserId: user.userId,
          originalName: `FRAD-offer-${offer.id}.pdf`,
          mimeType: 'application/pdf',
          sizeBytes: bytes.length,
          buffer: bytes,
          sensitivityClass: 'CONFIDENTIAL',
        })
        offerFileId = uploaded.fileAsset.id
      }
      await prisma.$transaction([
        prisma.offer.update({ where: { id: offer.id }, data: { status: 'SENT', sentAt: new Date(), offerFileId } }),
        prisma.application.update({
          where: { id: offer.applicationId },
          data: {
            offerStatus: 'SENT',
            internalStatus: 'OFFER_SENT',
            candidateVisibleStatus: 'OFFER_SENT',
            lockVersion: { increment: 1 },
          },
        }),
        prisma.applicationStageHistory.create({
          data: {
            applicationId: offer.applicationId,
            fromStatus: offer.application.internalStatus,
            toStatus: 'OFFER_SENT',
            changedBy: user.userId,
            reason: 'Approved offer sent to candidate',
          },
        }),
      ])
      if (offer.application.candidate.userId)
        await createNotification({
          userId: offer.application.candidate.userId,
          type: 'OFFER_SENT',
          title: 'Your FRAD job offer is ready',
          body: `Review and respond to your offer for ${offer.position}.`,
          applicationId: offer.applicationId,
        })
    } else {
      await requireRole('HR_MANAGER')
      if (['ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN', 'SUPERSEDED'].includes(offer.status))
        return NextResponse.json({ error: `Offer cannot be withdrawn from ${offer.status}` }, { status: 409 })
      if (!input.comment?.trim()) return NextResponse.json({ error: 'Withdrawal reason is required' }, { status: 400 })
      await prisma.$transaction([
        prisma.offer.update({
          where: { id: offer.id },
          data: { status: 'WITHDRAWN', candidateComment: input.comment },
        }),
        prisma.approval.updateMany({
          where: {
            resourceType: 'OFFER',
            resourceId: offer.id,
            decision: { in: ['PENDING', 'CONDITIONS_PENDING'] },
          },
          data: {
            decision: 'RETURNED',
            comment: `Offer withdrawn: ${input.comment}`,
            decidedAt: new Date(),
            lockVersion: { increment: 1 },
          },
        }),
        prisma.application.update({
          where: { id: offer.applicationId },
          data: {
            offerStatus: 'WITHDRAWN',
            internalStatus: 'RECOMMENDED',
            candidateVisibleStatus: 'UNDER_REVIEW',
            lockVersion: { increment: 1 },
          },
        }),
        prisma.applicationStageHistory.create({
          data: {
            applicationId: offer.applicationId,
            fromStatus: offer.application.internalStatus,
            toStatus: 'RECOMMENDED',
            changedBy: user.userId,
            reason: `Offer withdrawn: ${input.comment}`,
          },
        }),
      ])
      if (offer.application.candidate.userId)
        await createNotification({
          userId: offer.application.candidate.userId,
          type: 'OFFER_WITHDRAWN',
          title: 'Offer withdrawn',
          body: `The offer for ${offer.position} has been withdrawn. Open your application for the latest status or contact the recruitment team if you need clarification.`,
          applicationId: offer.applicationId,
        })
    }
    await logAudit({
      actorUserId: user.userId,
      action: `OFFER_${input.action}`,
      resourceType: 'Offer',
      resourceId: offer.id,
      reason: input.comment,
    })
    const responseBody = { success: true }
    await completeIdempotency(claim, 200, responseBody)
    return NextResponse.json(responseBody)
  } catch (err) {
    await abandonIdempotency(claim)
    if (err instanceof Error && err.message === 'OFFER_CHANGED') {
      return NextResponse.json({ error: 'The offer or approval changed; refresh and try again' }, { status: 409 })
    }
    return authzResponse(err)
  }
}
