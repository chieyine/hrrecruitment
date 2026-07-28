import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const { preboardingId, startDate } = await parseBody(
      request,
      z.object({ preboardingId: z.string().min(1), startDate: z.coerce.date() })
    )
    const preboarding = await prisma.candidatePreboarding.findFirst({
      where: { id: preboardingId, application: { candidate: { userId: user.userId } } },
      include: {
        application: {
          include: {
            vacancy: { select: { ownerUserId: true } },
            offers: { where: { status: 'ACCEPTED' }, orderBy: { acceptedAt: 'desc' }, take: 1 },
          },
        },
      },
    })
    if (!preboarding) throw new AuthzError('Preboarding record not found', 404)
    const offer = preboarding.application.offers[0]
    if (!offer) throw new AuthzError('An accepted offer is required', 409)
    const differenceDays = Math.abs(startDate.getTime() - offer.startDate.getTime()) / 86400000
    if (differenceDays > 30)
      throw new AuthzError(
        'The proposed start date must be within 30 days of the accepted offer date; contact HR for a larger change',
        400
      )
    await prisma.candidatePreboarding.update({
      where: { id: preboarding.id },
      data: { confirmedStartDate: startDate, startDateConfirmedAt: new Date() },
    })
    await prisma.readinessCheck.updateMany({
      where: {
        candidatePreboardingId: preboarding.id,
        checkType: 'START_DATE_CONFIRMED',
        status: { in: ['PENDING', 'PASSED'] },
      },
      data: { status: 'PASSED', reviewedAt: new Date() },
    })
    await createNotification({
      userId: preboarding.application.vacancy.ownerUserId,
      type: 'START_DATE_CONFIRMED',
      title: 'Candidate confirmed start date',
      body: `The candidate confirmed ${startDate.toLocaleDateString('en-GB')} as their start date.`,
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'START_DATE_CONFIRMED',
      resourceType: 'CandidatePreboarding',
      resourceId: preboarding.id,
      newValue: { startDate },
    })
    return Response.json({ success: true, confirmedStartDate: startDate })
  } catch (error) {
    return authzResponse(error)
  }
}
