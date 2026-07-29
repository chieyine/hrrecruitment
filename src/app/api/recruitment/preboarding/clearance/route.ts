import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

const schema = z.object({
  preboardingId: z.string().min(1),
  comment: z.string().trim().min(10).max(2000),
  lockVersion: z.coerce.number().int().positive(),
})

export async function POST(request: Request) {
  try {
    const user = await requireRole('HR_MANAGER')
    const input = await parseBody(request, schema)
    const preboarding = await prisma.candidatePreboarding.findUnique({
      where: { id: input.preboardingId },
      include: {
        application: {
          select: {
            id: true,
            internalStatus: true,
            candidate: { select: { userId: true } },
          },
        },
      },
    })
    if (!preboarding) throw new AuthzError('Preboarding record not found', 404)
    if (['READY_TO_RESUME', 'COMPLETED'].includes(preboarding.status))
      throw new AuthzError('This preboarding record has already been cleared', 409)

    // HR_REVIEW is the decision made by this action. Every evidence-derived
    // check must already have passed or carry its own separately audited waiver.
    const outstanding = await prisma.readinessCheck.findMany({
      where: {
        candidatePreboardingId: preboarding.id,
        required: true,
        checkType: { not: 'HR_REVIEW' },
        status: { notIn: ['PASSED', 'WAIVED'] },
      },
      select: { checkType: true, status: true },
    })
    if (outstanding.length)
      return NextResponse.json({ error: 'Required evidence is still outstanding.', outstanding }, { status: 422 })

    const confirmation = await prisma.$transaction(async (tx) => {
      const claimed = await tx.candidatePreboarding.updateMany({
        where: { id: preboarding.id, lockVersion: input.lockVersion },
        data: {
          status: 'READY_TO_RESUME',
          readinessStatus: 'READY_TO_RESUME',
          readyAt: new Date(),
          overallCompletionPercentage: 100,
          lockVersion: { increment: 1 },
        },
      })
      if (!claimed.count) throw new AuthzError('This record changed; refresh before clearing it', 409)
      await tx.readinessCheck.updateMany({
        where: { candidatePreboardingId: preboarding.id, checkType: 'HR_REVIEW' },
        data: { status: 'PASSED', reviewedAt: new Date() },
      })
      const saved = await tx.readinessConfirmation.upsert({
        where: { candidatePreboardingId: preboarding.id },
        update: {
          confirmedBy: user.userId,
          confirmedAt: new Date(),
          status: 'CONFIRMED',
          comment: input.comment,
        },
        create: {
          candidatePreboardingId: preboarding.id,
          confirmedBy: user.userId,
          confirmedAt: new Date(),
          status: 'CONFIRMED',
          summaryJson: JSON.stringify({ clearedAt: new Date() }),
          comment: input.comment,
        },
      })
      await tx.application.update({
        where: { id: preboarding.application.id },
        data: {
          internalStatus: 'READY_TO_RESUME',
          candidateVisibleStatus: 'READY_TO_RESUME',
          preboardingStatus: 'READY_TO_RESUME',
          lockVersion: { increment: 1 },
        },
      })
      await tx.applicationStageHistory.create({
        data: {
          applicationId: preboarding.application.id,
          fromStatus: preboarding.application.internalStatus,
          toStatus: 'READY_TO_RESUME',
          changedBy: user.userId,
          reason: 'Preboarding clearance confirmed',
        },
      })
      return saved
    })

    await createNotification({
      userId: preboarding.application.candidate.userId,
      type: 'PREBOARDING_CLEARED',
      title: 'Your preboarding checks are complete',
      body: 'Your required preboarding checks are complete. Review your application for the confirmed next step.',
      applicationId: preboarding.application.id,
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'READINESS_CONFIRMED',
      resourceType: 'CandidatePreboarding',
      resourceId: preboarding.id,
      reason: input.comment,
      newValue: { status: 'READY_TO_RESUME' },
    })
    return NextResponse.json({ success: true, confirmationId: confirmation.id })
  } catch (error) {
    return authzResponse(error)
  }
}
