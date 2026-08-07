import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { buildTransferDataset, renderHandoverPdf, checkForDuplicateEmployee } from '@/lib/erp-handover'

/**
 * §19.3 The ERP handover pack.
 *
 * Transfer is manual, so this PDF is the transfer mechanism: it carries exactly
 * the §19.2 data set and nothing else. Every download is audited, because this
 * is the single document in the platform that concentrates a person's bank, tax
 * and pension details in one place.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('erp.transfer')

    const record = await prisma.eRPTransferRecord.findUnique({
      where: { applicationId: params.id },
      select: {
        id: true,
        erpPersonnelNumber: true,
        transferStatus: true,
        approvedBy: true,
        approvedAt: true,
        duplicateCheckStatus: true,
      },
    })
    if (!record) throw new AuthzError('This transfer has not been approved yet', 409)
    if (!record.approvedAt) throw new AuthzError('HR Manager approval is required before the pack can be issued', 409)

    const [dataset, duplicates, approver] = await Promise.all([
      buildTransferDataset(params.id),
      checkForDuplicateEmployee(params.id),
      record.approvedBy
        ? prisma.user.findUnique({ where: { id: record.approvedBy }, select: { email: true } })
        : Promise.resolve(null),
    ])

    const generatedAt = new Date()
    const pdf = renderHandoverPdf({
      dataset,
      // Until the ERP issues a number the pack says so plainly and shows the
      // recruitment reference it will be filed under.
      erpPersonnelNumber:
        record.erpPersonnelNumber ??
        `To be assigned (${dataset.recruitmentReference ?? params.id.slice(0, 8)})`,
      approvedByEmail: approver?.email ?? 'Unknown approver',
      approvedAt: record.approvedAt,
      generatedAt,
      duplicateCheck: duplicates,
    })

    await prisma.eRPTransferRecord.update({
      where: { id: record.id },
      data: {
        handoverPackGeneratedAt: generatedAt,
        // The snapshot is what makes the handover reconstructable later (§28.24).
        transferredDataJson: JSON.stringify(dataset),
      },
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'ERP_HANDOVER_PACK_DOWNLOADED',
      resourceType: 'ERPTransferRecord',
      resourceId: record.id,
      newValue: { generatedAt: generatedAt.toISOString() },
    })

    const filename = `erp-handover-${(dataset.recruitmentReference ?? params.id).replace(/[^A-Za-z0-9-]/g, '')}.pdf`
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        // This document must never sit in a shared or browser cache.
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    })
  } catch (error) {
    return authzResponse(error)
  }
}
