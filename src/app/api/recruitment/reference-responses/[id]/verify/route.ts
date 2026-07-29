import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { recalculateApplicationReferenceStatus } from '@/lib/references'

const schema = z.object({
  outcome: z.enum(['SATISFACTORY', 'SATISFACTORY_WITH_CONCERNS', 'UNSATISFACTORY']),
  reviewNote: z.string().trim().min(10).max(3000),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('reference.manage')
    const input = await parseBody(request, schema)
    const response = await prisma.referenceResponse.findUnique({
      where: { id: params.id },
      include: { referenceRequest: { select: { referee: { select: { applicationId: true } } } } },
    })
    if (!response) return NextResponse.json({ error: 'Reference response not found' }, { status: 404 })
    if (response.verifiedAt)
      return NextResponse.json({ error: 'This reference has already been reviewed' }, { status: 409 })

    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.referenceResponse.updateMany({
        where: { id: response.id, verifiedAt: null },
        data: { outcome: input.outcome, verifiedBy: user.userId, verifiedAt: new Date() },
      })
      if (claimed.count !== 1) throw new Error('REFERENCE_ALREADY_REVIEWED')
      await recalculateApplicationReferenceStatus(tx, response.referenceRequest.referee.applicationId)
      return tx.referenceResponse.findUniqueOrThrow({ where: { id: response.id } })
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'REFERENCE_VERIFIED',
      resourceType: 'ReferenceResponse',
      resourceId: updated.id,
      previousValue: { outcome: response.outcome, verifiedAt: response.verifiedAt },
      newValue: { outcome: input.outcome, verifiedAt: updated.verifiedAt },
      reason: input.reviewNote,
    })
    return NextResponse.json({ success: true, outcome: updated.outcome })
  } catch (err) {
    if (err instanceof Error && err.message === 'REFERENCE_ALREADY_REVIEWED')
      return NextResponse.json({ error: 'This reference has already been reviewed' }, { status: 409 })
    return authzResponse(err)
  }
}
