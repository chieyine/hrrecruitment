import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/tokens'
import { logAudit } from '@/lib/audit'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { logger } from '@/lib/logger'

const rating = z.enum(['Exceptional', 'Strong', 'Satisfactory', 'Concern', 'Not observed'])
const referenceAnswers = z.object({
  refereeAuthorityConfirmed: z.literal(true),
  confirmDates: z.string().trim().min(3).max(1000),
  responsibilities: z.string().trim().min(10).max(5000),
  workQuality: rating,
  integrity: rating,
  teamwork: rating,
  management: rating,
  reasonForLeaving: z.string().trim().min(2).max(2000),
  strengths: z.string().trim().min(5).max(3000),
  developmentAreas: z.string().trim().max(3000).default(''),
  rehire: z.enum(['Yes', 'No', 'Conditional', 'Not known']),
  safeguardingConcerns: z.string().trim().min(3).max(3000),
})
const schema = z.object({
  token: z.string().min(20).max(1000),
  answers: referenceAnswers,
  confidentialComment: z.string().trim().max(5000).optional(),
})

export async function POST(request: Request) {
  try {
    const limit = await rateLimitDistributed(`reference:${clientIp(request)}`, 10, 60_000)
    if (!limit.allowed)
      return NextResponse.json(
        { error: 'Too many attempts' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    const { token, answers, confidentialComment } = await parseBody(request, schema)

    // Look up by the HASH of the presented token, and enforce not-expired.
    const refRequest = await prisma.referenceRequest.findFirst({
      where: {
        secureTokenHash: hashToken(token),
        status: { in: ['PENDING', 'SENT'] },
        expiresAt: { gt: new Date() },
      },
      include: { referee: true, response: true },
    })

    if (!refRequest) {
      return NextResponse.json({ error: 'Invalid or expired reference request link' }, { status: 404 })
    }
    if (refRequest.response) {
      return NextResponse.json({ error: 'This reference has already been submitted' }, { status: 409 })
    }

    const response = await prisma.$transaction(async (tx) => {
      const claimed = await tx.referenceRequest.updateMany({
        where: { id: refRequest.id, status: { in: ['PENDING', 'SENT'] } },
        data: { status: 'COMPLETED', responseReceivedAt: new Date() },
      })
      if (claimed.count !== 1) throw new Error('REFERENCE_ALREADY_COMPLETED')
      const created = await tx.referenceResponse.create({
        data: {
          referenceRequestId: refRequest.id,
          answersJson: JSON.stringify(answers),
          outcome: 'PENDING_REVIEW',
          confidentialComment: confidentialComment || null,
        },
      })
      await tx.application.update({
        where: { id: refRequest.referee.applicationId },
        data: { referenceStatus: 'PENDING' },
      })
      return created
    })

    await logAudit({
      action: 'REFERENCE_SUBMITTED',
      resourceType: 'ReferenceResponse',
      resourceId: response.id,
      newValue: { status: 'PENDING_REVIEW' },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'REFERENCE_ALREADY_COMPLETED') {
      return NextResponse.json({ error: 'This reference has already been submitted' }, { status: 409 })
    }
    logger.error('Reference submission failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to submit reference' }, { status: 500 })
  }
}
