import { NextResponse } from 'next/server'
import { requirePermission, authzResponse } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { generateToken, hashToken } from '@/lib/tokens'
import { protectOutboxPayload } from '@/lib/outbox'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('reference.manage')

    const referee = await prisma.referee.findUnique({ where: { id: params.id } })
    if (!referee) return NextResponse.json({ error: 'Referee not found' }, { status: 404 })
    if (!referee.permissionToContact)
      return NextResponse.json({ error: 'The candidate has not authorised contact with this referee' }, { status: 409 })
    if (referee.contactStatus !== 'READY')
      return NextResponse.json(
        { error: `This referee is marked ${referee.contactStatus.toLowerCase().replace(/_/g, ' ')}` },
        { status: 409 }
      )
    if (referee.preferredContactMethod === 'PHONE')
      return NextResponse.json(
        { error: 'This referee prefers telephone contact. Record the verified call outcome as a manual reference.' },
        { status: 409 }
      )

    const appUrl = process.env.APP_URL
    if (!appUrl) throw new Error('APP_URL is required to send reference-request links')

    // Store only the HASH; the raw token lives only in the emailed link.
    const rawToken = generateToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const link = new URL(`/public/reference/${encodeURIComponent(rawToken)}`, appUrl).toString()
    const refereeName = referee.name.replace(
      /[<>&"']/g,
      (character) =>
        ({
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#39;',
        })[character]!
    )

    const subject = 'Reference request for a FRAD candidate'
    const html = `<p>Dear ${refereeName},</p>
             <p>You have been listed as a referee. Please complete the confidential reference form:</p>
             <p><a href="${link}">Complete reference</a> (link expires on ${expiresAt.toDateString()}).</p>`

    const referenceRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.referenceRequest.create({
        data: {
          refereeId: referee.id,
          secureTokenHash: hashToken(rawToken),
          expiresAt,
          sentAt: new Date(),
          status: 'SENT',
        },
      })
      await tx.outboxMessage.create({
        data: {
          channel: 'EMAIL',
          recipient: referee.email,
          subject,
          payloadJson: protectOutboxPayload({ html }),
          deduplicationKey: `reference-request:${created.id}`,
        },
      })
      return created
    })

    try {
      await logAudit({
        actorUserId: user.userId,
        action: 'REFERENCE_REQUEST_SENT',
        resourceType: 'ReferenceRequest',
        resourceId: referenceRequest.id,
      })
    } catch (error) {
      logger.error('reference_request.audit_failed', { referenceRequestId: referenceRequest.id, error })
    }

    return NextResponse.json({ success: true, referenceRequestId: referenceRequest.id, publicLink: link })
  } catch (err) {
    return authzResponse(err)
  }
}
