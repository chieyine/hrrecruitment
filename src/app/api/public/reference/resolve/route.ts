import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/tokens'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'

/** Resolve a reference token to the minimal context a referee needs
 *  (candidate name + position). Valid, unexpired, unanswered tokens only. */
export async function GET(request: Request) {
  try {
    const rl = await rateLimitDistributed(`ref-resolve:${clientIp(request)}`, 20, 60_000)
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const token = new URL(request.url).searchParams.get('token') || ''
    if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

    const refRequest = await prisma.referenceRequest.findFirst({
      where: {
        secureTokenHash: hashToken(token),
        status: { in: ['PENDING', 'SENT'] },
        expiresAt: { gt: new Date() },
      },
      include: {
        response: true,
        referee: {
          include: {
            application: {
              include: {
                candidate: { select: { legalFirstName: true, lastName: true } },
                vacancy: { select: { title: true } },
              },
            },
          },
        },
      },
    })

    if (!refRequest || refRequest.response) {
      return NextResponse.json({ error: 'Invalid, expired, or already-completed reference link' }, { status: 404 })
    }

    const app = refRequest.referee.application
    return NextResponse.json({
      candidateName: `${app.candidate.legalFirstName} ${app.candidate.lastName}`,
      position: app.vacancy.title,
      refereeName: refRequest.referee.name,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to resolve reference link' }, { status: 500 })
  }
}
