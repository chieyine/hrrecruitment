import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody, offerResponseSchema } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { instantiatePreboardingPackage } from '@/lib/preboarding'
import { claimIdempotency, completeIdempotency, abandonIdempotency, type IdempotencyClaim } from '@/lib/idempotency'
import { clientIp } from '@/lib/rate-limit'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  let claim: IdempotencyClaim | null = null
  try {
    const user = await requireUser()
    const parsed = await parseBody(request, offerResponseSchema)
    const { action, candidateComment, signatureName, signedFileId, proposedStartDate, declarationAccepted } = parsed
    if (action !== 'CLARIFY' && !request.headers.get('idempotency-key')?.trim())
      throw new AuthzError('Idempotency-Key is required for an offer decision', 400)
    claim = await claimIdempotency({
      request,
      scope: `OFFER_RESPONSE:${params.id}`,
      actorUserId: user.userId,
      payload: parsed,
    })
    if (claim?.replay) return NextResponse.json(claim.body, { status: claim.statusCode })

    const offer = await prisma.offer.findUnique({
      where: { id: params.id },
      include: { application: { include: { candidate: true } } },
    })

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Ownership: the offer must belong to the signed-in candidate (fixes IDOR).
    if (offer.application.candidate.userId !== user.userId) {
      throw new AuthzError('Forbidden', 403)
    }

    // Only a live, sent offer may be actioned by the candidate.
    if (!['SENT', 'VIEWED'].includes(offer.status)) {
      return NextResponse.json(
        { error: `Offer cannot be ${action.toLowerCase()}ed in its current state (${offer.status})` },
        { status: 409 }
      )
    }

    if (offer.acceptanceDeadline <= new Date())
      throw new AuthzError('This offer has expired and can no longer be actioned', 409)
    if (action !== 'CLARIFY' && !offer.offerFileId)
      throw new AuthzError('The formal offer document is not available. Contact the recruitment team.', 409)
    if (proposedStartDate && proposedStartDate <= new Date())
      throw new AuthzError('Proposed start date must be in the future', 400)
    if (signedFileId) {
      const signedAsset = await prisma.fileAsset.findFirst({
        where: { id: signedFileId, ownerUserId: user.userId, virusScanStatus: 'CLEAN', mimeType: 'application/pdf' },
      })
      if (!signedAsset) throw new AuthzError('A clean PDF signed offer owned by you is required', 400)
    }

    if (action === 'CLARIFY') {
      const clarificationText =
        candidateComment?.trim() ||
        (proposedStartDate
          ? `I would like to propose ${proposedStartDate.toLocaleDateString('en-GB')} as my start date.`
          : '')
      const thread = await prisma.messageThread.create({
        data: {
          applicationId: offer.applicationId,
          subject: `Offer clarification: ${offer.position}`,
          category: 'OFFER_CLARIFICATION',
        },
      })
      await prisma.message.create({
        data: { messageThreadId: thread.id, senderUserId: user.userId, body: clarificationText },
      })
      const app = await prisma.application.findUnique({
        where: { id: offer.applicationId },
        include: { vacancy: { select: { ownerUserId: true } } },
      })
      if (app)
        await createNotification({
          userId: app.vacancy.ownerUserId,
          type: 'OFFER_CLARIFICATION',
          title: 'Offer clarification requested',
          body: `A candidate requested clarification about the ${offer.position} offer.`,
        })
      await prisma.offer.update({
        where: { id: offer.id },
        data: { candidateComment: candidateComment || null, candidateProposedStartDate: proposedStartDate || null },
      })
      await logAudit({
        actorUserId: user.userId,
        action: 'OFFER_CLARIFICATION_REQUESTED',
        resourceType: 'Offer',
        resourceId: offer.id,
      })
      const responseBody = { success: true, threadId: thread.id }
      await completeIdempotency(claim, 200, responseBody)
      return NextResponse.json(responseBody)
    }

    if (action === 'ACCEPT') {
      const checkTypes = [
        'OFFER_ACCEPTED',
        'ID_APPROVED',
        'QUALIFICATION_APPROVED',
        'FORMS_APPROVED',
        'POLICIES_SIGNED',
        'COURSES_COMPLETED',
        'TASKS_COMPLETED',
        'START_DATE_CONFIRMED',
        'REQUIRED_MEETINGS',
        'REPORTING_ACKNOWLEDGED',
        'REFERENCES_SATISFACTORY',
        'HR_REVIEW',
      ]
      const accepted = await prisma.$transaction(async (tx) => {
        const trustedIp = clientIp(request)
        const changed = await tx.offer.updateMany({
          where: { id: offer.id, version: offer.version, status: { in: ['SENT', 'VIEWED'] } },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            candidateComment: candidateComment || null,
            signedFileId: signedFileId || null,
            signatureName,
            signatureMethod: signedFileId ? (signatureName ? 'TYPED_NAME_AND_SIGNED_UPLOAD' : 'SIGNED_UPLOAD') : 'TYPED_NAME',
            signatureIpAddress: trustedIp === 'unknown' ? null : trustedIp,
            signatureUserAgent: request.headers.get('user-agent'),
          },
        })
        if (changed.count !== 1) throw new AuthzError('Offer changed; refresh and try again', 409)
        const appChanged = await tx.application.updateMany({
          where: { id: offer.applicationId, internalStatus: 'OFFER_SENT' },
          data: {
            offerStatus: 'ACCEPTED',
            internalStatus: 'OFFER_ACCEPTED',
            candidateVisibleStatus: 'PREBOARDING_IN_PROGRESS',
            preboardingStatus: 'IN_PROGRESS',
            lockVersion: { increment: 1 },
          },
        })
        if (appChanged.count !== 1) throw new AuthzError('Application is no longer awaiting an offer decision', 409)
        const preboarding = await tx.candidatePreboarding.upsert({
          where: { applicationId: offer.applicationId },
          update: {},
          create: {
            applicationId: offer.applicationId,
            status: 'IN_PROGRESS',
            readinessStatus: 'NOT_READY',
            overallCompletionPercentage: 0,
          },
        })
        for (const checkType of checkTypes)
          await tx.readinessCheck.upsert({
            where: { candidatePreboardingId_checkType: { candidatePreboardingId: preboarding.id, checkType } },
            update: {},
            create: {
              candidatePreboardingId: preboarding.id,
              checkType,
              required: true,
              status: checkType === 'OFFER_ACCEPTED' ? 'PASSED' : 'PENDING',
            },
          })
        await instantiatePreboardingPackage(preboarding.id, offer.applicationId, user.userId, undefined, tx)
        return { offer: await tx.offer.findUniqueOrThrow({ where: { id: offer.id } }), preboarding }
      })

      await logAudit({
        actorUserId: user.userId,
        action: 'OFFER_ACCEPTED',
        resourceType: 'Offer',
        resourceId: offer.id,
        newValue: { declarationAccepted, declarationVersion: 'offer-acceptance-v1' },
      })

      const responseBody = { success: true, offer: accepted.offer, preboardingId: accepted.preboarding.id }
      await completeIdempotency(claim, 200, responseBody)
      return NextResponse.json(responseBody)
    }

    // DECLINE
    const updatedOffer = await prisma.$transaction(async (tx) => {
      const changed = await tx.offer.updateMany({
        where: { id: offer.id, version: offer.version, status: { in: ['SENT', 'VIEWED'] } },
        data: { status: 'DECLINED', declinedAt: new Date(), candidateComment: candidateComment || null },
      })
      if (changed.count !== 1) throw new AuthzError('Offer changed; refresh and try again', 409)
      const appChanged = await tx.application.updateMany({
        where: { id: offer.applicationId, internalStatus: 'OFFER_SENT' },
        data: {
          offerStatus: 'DECLINED',
          internalStatus: 'OFFER_DECLINED',
          candidateVisibleStatus: 'RECRUITMENT_COMPLETED',
          lockVersion: { increment: 1 },
        },
      })
      if (appChanged.count !== 1) throw new AuthzError('Application is no longer awaiting an offer decision', 409)
      return tx.offer.findUniqueOrThrow({ where: { id: offer.id } })
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'OFFER_DECLINED',
      resourceType: 'Offer',
      resourceId: offer.id,
    })

    // Notify the vacancy owner that the offer was declined.
    const app = await prisma.application.findUnique({
      where: { id: offer.applicationId },
      include: { vacancy: { select: { ownerUserId: true, title: true } } },
    })
    if (app?.vacancy?.ownerUserId) {
      await createNotification({
        userId: app.vacancy.ownerUserId,
        type: 'OFFER_DECLINED',
        title: 'Offer declined',
        body: `A candidate declined the offer for ${app.vacancy.title}.`,
      })
    }

    const responseBody = { success: true, offer: updatedOffer }
    await completeIdempotency(claim, 200, responseBody)
    return NextResponse.json(responseBody)
  } catch (err) {
    await abandonIdempotency(claim)
    return authzResponse(err)
  }
}
