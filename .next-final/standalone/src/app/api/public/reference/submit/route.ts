import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/tokens'
import { logAudit } from '@/lib/audit'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { logger } from '@/lib/logger'

const schema = z.object({
  token: z.string().min(20).max(1000),
  answers: z.record(z.string(), z.unknown()).default({}),
  outcome: z.enum(['SATISFACTORY', 'SATISFACTORY_WITH_CONCERNS', 'UNSATISFACTORY']),
  confidentialComment: z.string().trim().max(5000).optional(),
})

function aggregateReferenceStatus(outcomes: string[], outstanding: number) {
  if (outcomes.includes('UNSATISFACTORY')) return 'UNSATISFACTORY'
  if (outstanding > 0) return 'PENDING'
  if (outcomes.includes('SATISFACTORY_WITH_CONCERNS')) return 'SATISFACTORY_WITH_CONCERNS'
  return outcomes.length > 0 ? 'SATISFACTORY' : 'NOT_REQUIRED'
}

export async function POST(request: Request) {
  try {
    const limit = await rateLimitDistributed(`reference:${clientIp(request)}`, 10, 60_000)
    if (!limit.allowed) return NextResponse.json({ error: 'Too many attempts' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })
    const { token, answers, outcome, confidentialComment } = await parseBody(request, schema)

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
          outcome,
          confidentialComment: confidentialComment || null,
        },
      })
      const requests = await tx.referenceRequest.findMany({
        where: { referee: { applicationId: refRequest.referee.applicationId } },
        select: { status: true, response: { select: { outcome: true } } },
      })
      const outcomes = requests.flatMap((item) => item.response ? [item.response.outcome] : [])
      const outstanding = requests.filter((item) => !['COMPLETED', 'EXPIRED'].includes(item.status)).length
      await tx.application.update({
        where: { id: refRequest.referee.applicationId },
        data: { referenceStatus: aggregateReferenceStatus(outcomes, outstanding) },
      })
      return created
    })

    await logAudit({
      action: 'REFERENCE_SUBMITTED',
      resourceType: 'ReferenceResponse',
      resourceId: response.id,
      newValue: { outcome },
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
