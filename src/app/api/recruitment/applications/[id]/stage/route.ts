import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { parseBody, stageChangeSchema } from '@/lib/validation'
import {
  canTransitionApplication,
  allowedApplicationTransitions,
  candidateVisibleStatusForInternal,
  isGenericApplicationStage,
} from '@/lib/state-machine'
import { logAudit } from '@/lib/audit'
import { expectedVersion, staleRecord } from '@/lib/concurrency'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('application.stage.change')
    const { internalStatus, reason, lockVersion } = await parseBody(request, stageChangeSchema)

    const application = await prisma.application.findUnique({ where: { id: params.id } })
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Enforce the §42.2 state machine — no arbitrary status jumps.
    if (!isGenericApplicationStage(internalStatus)) {
      return NextResponse.json(
        { error: 'This outcome must be recorded through its dedicated workflow' },
        { status: 409 }
      )
    }
    if (['INELIGIBLE', 'CANCELLED'].includes(internalStatus) && (!reason || reason.trim().length < 10)) {
      return NextResponse.json(
        { error: 'Record a clear reason of at least 10 characters for this outcome' },
        { status: 422 }
      )
    }
    if (!canTransitionApplication(application.internalStatus, internalStatus)) {
      return NextResponse.json(
        {
          error: `Invalid transition from ${application.internalStatus} to ${internalStatus}`,
          allowed: allowedApplicationTransitions(application.internalStatus),
        },
        { status: 422 }
      )
    }

    const version = expectedVersion(request, { lockVersion })
    if (!version) return NextResponse.json({ error: 'A current record version is required' }, { status: 428 })
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.application.updateMany({
        where: { id: params.id, lockVersion: version, internalStatus: application.internalStatus },
        data: {
          internalStatus,
          candidateVisibleStatus: candidateVisibleStatusForInternal(internalStatus),
          lockVersion: { increment: 1 },
        },
      })
      if (!changed.count) staleRecord()
      await tx.applicationStageHistory.create({
        data: {
          applicationId: params.id,
          fromStatus: application.internalStatus,
          toStatus: internalStatus,
          changedBy: user.userId,
          reason: reason || null,
        },
      })
      return tx.application.findUniqueOrThrow({ where: { id: params.id } })
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'STAGE_CHANGED',
      resourceType: 'Application',
      resourceId: params.id,
      previousValue: { internalStatus: application.internalStatus },
      newValue: { internalStatus },
      reason,
    })

    return NextResponse.json({ success: true, application: updated })
  } catch (err) {
    return authzResponse(err)
  }
}
