import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { parseBody, erpTransferSchema } from '@/lib/validation'
import { canTransitionApplication } from '@/lib/state-machine'
import { logAudit } from '@/lib/audit'
import { claimIdempotency, completeIdempotency, abandonIdempotency, type IdempotencyClaim } from '@/lib/idempotency'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  let claim: IdempotencyClaim | null = null
  try {
    const user = await requirePermission('erp.transfer')
    const { erpPersonnelNumber, comment, createdInErpAt } = await parseBody(request, erpTransferSchema)
    if (!request.headers.get('idempotency-key')?.trim()) {
      return NextResponse.json({ error: 'Idempotency-Key header is required' }, { status: 400 })
    }
    claim = await claimIdempotency({
      request,
      scope: `ERP_TRANSFER:${params.id}`,
      actorUserId: user.userId,
      payload: { erpPersonnelNumber, comment, createdInErpAt },
    })
    if (claim?.replay) return NextResponse.json(claim.body, { status: claim.statusCode })

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: { resumptionRecord: true },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Only a resumed candidate may be transferred to the ERP (§42.2).
    if (!canTransitionApplication(application.internalStatus, 'TRANSFERRED_TO_ERP')) {
      return NextResponse.json(
        { error: `Cannot transfer to ERP from status ${application.internalStatus}` },
        { status: 422 }
      )
    }
    if (
      !application.resumptionRecord ||
      application.resumptionRecord.outcome !== 'RESUMED' ||
      !application.resumptionRecord.actualStartDate
    ) {
      return NextResponse.json({ error: 'Confirmed resumption must be recorded before ERP transfer' }, { status: 422 })
    }

    const erpRecord = await prisma.$transaction(async (tx) => {
      const transitioned = await tx.application.updateMany({
        where: { id: params.id, internalStatus: 'RESUMED', lockVersion: application.lockVersion },
        data: {
          internalStatus: 'TRANSFERRED_TO_ERP',
          candidateVisibleStatus: 'RECRUITMENT_COMPLETED',
          preboardingStatus: 'COMPLETED',
          lockVersion: { increment: 1 },
        },
      })
      if (transitioned.count !== 1) throw new Error('APPLICATION_CHANGED')
      return tx.eRPTransferRecord.create({
        data: {
          applicationId: params.id,
          erpPersonnelNumber: erpPersonnelNumber.trim(),
          createdInErpAt: createdInErpAt || new Date(),
          recordedBy: user.userId,
          comment: comment || null,
          status: 'CREATED_IN_ERP',
        },
      })
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'ERP_TRANSFER_RECORDED',
      resourceType: 'ERPTransferRecord',
      resourceId: erpRecord.id,
      newValue: { erpPersonnelNumber },
    })

    const responseBody = { success: true, erpPersonnelNumber: erpRecord.erpPersonnelNumber }
    await completeIdempotency(claim, 200, responseBody)
    return NextResponse.json(responseBody)
  } catch (err) {
    await abandonIdempotency(claim)
    if (err instanceof Error && err.message === 'APPLICATION_CHANGED') {
      return NextResponse.json({ error: 'The application changed; refresh and try again' }, { status: 409 })
    }
    return authzResponse(err)
  }
}
