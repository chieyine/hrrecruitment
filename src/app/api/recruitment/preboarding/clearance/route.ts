import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, requireRole, authzResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const user = await requirePermission('preboarding.clearance')

    const body = await request.json()
    const { preboardingId, comment, waivers } = body

    if (!preboardingId) {
      return NextResponse.json({ error: 'Preboarding ID is required' }, { status: 400 })
    }

    const preboarding = await prisma.candidatePreboarding.findUnique({
      where: { id: preboardingId },
      include: { application: true },
    })
    if (!preboarding) {
      return NextResponse.json({ error: 'Preboarding record not found' }, { status: 404 })
    }

    // Apply any HR waivers first (with reason for audit).
    if (Array.isArray(waivers)) {
      if (waivers.length) await requireRole('HR_MANAGER', 'SYSTEM_ADMIN')
      for (const w of waivers) {
        if (!w?.checkType || !String(w?.reason || '').trim()) return NextResponse.json({ error: 'Every waiver requires a check type and written reason' }, { status: 400 })
        await prisma.readinessCheck.updateMany({
          where: { candidatePreboardingId: preboardingId, checkType: w.checkType },
          data: { status: 'WAIVED', waivedBy: user.userId, waiverReason: w.reason, waivedAt: new Date() },
        })
      }
    }

    // A candidate may only be cleared when every REQUIRED check is PASSED or WAIVED.
    const outstanding = await prisma.readinessCheck.findMany({
      where: {
        candidatePreboardingId: preboardingId,
        required: true,
        status: { notIn: ['PASSED', 'WAIVED'] },
      },
      select: { checkType: true, status: true },
    })
    if (outstanding.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot confirm readiness: required checks are still outstanding.',
          outstanding,
        },
        { status: 422 }
      )
    }

    const confirmation = await prisma.readinessConfirmation.upsert({
      where: { candidatePreboardingId: preboardingId },
      update: { confirmedBy: user.userId, confirmedAt: new Date(), status: 'CONFIRMED', comment: comment || null },
      create: {
        candidatePreboardingId: preboardingId,
        confirmedBy: user.userId,
        confirmedAt: new Date(),
        status: 'CONFIRMED',
        summaryJson: JSON.stringify({ clearedAt: new Date() }),
        comment: comment || null,
      },
    })

    await prisma.candidatePreboarding.update({
      where: { id: preboardingId },
      data: { status: 'READY_TO_RESUME', readinessStatus: 'READY_TO_RESUME', readyAt: new Date(), overallCompletionPercentage: 100 },
    })

    await prisma.application.update({
      where: { id: preboarding.applicationId },
      data: {
        internalStatus: 'READY_TO_RESUME',
        candidateVisibleStatus: 'READY_TO_RESUME',
        preboardingStatus: 'READY_TO_RESUME',
      },
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'READINESS_CONFIRMED',
      resourceType: 'CandidatePreboarding',
      resourceId: preboardingId,
      newValue: { comment },
    })

    return NextResponse.json({ success: true, confirmationId: confirmation.id })
  } catch (err) {
    return authzResponse(err)
  }
}
