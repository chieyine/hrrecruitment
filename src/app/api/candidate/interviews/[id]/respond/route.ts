import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const input = await parseBody(
      request,
      z.object({
        response: z.enum(['CONFIRMED', 'RESCHEDULE_REQUESTED', 'DECLINED']),
        comment: z.string().max(2000).optional(),
      })
    )
    const interview = await prisma.interview.findUnique({
      where: { id: params.id },
      include: { application: { include: { candidate: true } } },
    })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    if (interview.application.candidate.userId !== user.userId) throw new AuthzError('Forbidden', 403)
    if (['ATTENDED', 'DID_NOT_ATTEND', 'CANCELLED'].includes(interview.status))
      return NextResponse.json({ error: 'Interview response is locked' }, { status: 409 })
    const updated = await prisma.interview.updateMany({
      where: {
        id: interview.id,
        lockVersion: interview.lockVersion,
        status: { notIn: ['ATTENDED', 'DID_NOT_ATTEND', 'CANCELLED'] },
      },
      data: {
        candidateResponse: input.response,
        candidateComment: input.comment || null,
        status: input.response === 'CONFIRMED' ? 'CONFIRMED' : interview.status,
        lockVersion: { increment: 1 },
      },
    })
    if (updated.count !== 1) throw new AuthzError('Interview changed; refresh and try again', 409)
    await logAudit({
      actorUserId: user.userId,
      action: 'INTERVIEW_RESPONSE',
      resourceType: 'Interview',
      resourceId: interview.id,
      newValue: { response: input.response, commentProvided: Boolean(input.comment) },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return authzResponse(err)
  }
}
