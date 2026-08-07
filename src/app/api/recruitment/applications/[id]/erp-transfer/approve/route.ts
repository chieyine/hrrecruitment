import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { canMakeHrManagerDecision } from '@/lib/recruitment-role-policy'
import { recordSignatureIn, logSignatureCaptured } from '@/lib/signatures'
import {
  assessTransferReadiness,
  checkForDuplicateEmployee,
  buildTransferDataset,
  statutoryGaps,
} from '@/lib/erp-handover'

/**
 * §19.1 HR Manager approval of an ERP transfer.
 *
 * Approval is separated from recording the transfer so the readiness conditions
 * and the duplicate-employee check are evaluated and signed *before* anyone
 * keys the person into the ERP, not after.
 */

const schema = z.object({
  acknowledgeDuplicate: z.boolean().default(false),
  duplicateNote: z.string().trim().max(2000).optional(),
  comment: z.string().trim().max(2000).optional(),
})

/** Readiness preview so HR can see what is outstanding before approving. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    await requirePermission('erp.transfer')
    const [readiness, duplicates] = await Promise.all([
      assessTransferReadiness(params.id),
      checkForDuplicateEmployee(params.id),
    ])
    // §19.2 A missing statutory block does not stop the transfer, but it must be
    // visible before the pack is issued rather than discovered by payroll.
    let statutory: string[] = []
    try {
      statutory = statutoryGaps(await buildTransferDataset(params.id))
    } catch {
      statutory = ['The transfer dataset could not be assembled; review the record before approving']
    }
    return NextResponse.json({
      readiness,
      duplicateCheck: duplicates,
      statutoryGaps: statutory,
      canApprove: canMakeHrManagerDecision(user.roles),
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('erp.transfer')
    // §3.10 / §19.1 releasing a person to the ERP is an HR Manager act.
    if (!canMakeHrManagerDecision(user.roles))
      throw new AuthzError('Only an HR manager may approve an ERP transfer', 403)

    const input = await parseBody(request, schema)

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      select: { id: true, referenceNumber: true, internalStatus: true, erpTransferRecord: { select: { id: true } } },
    })
    if (!application) throw new AuthzError('Application not found', 404)
    if (application.erpTransferRecord) throw new AuthzError('This candidate has already been transferred', 409)

    const readiness = await assessTransferReadiness(params.id)
    // The offer/clearance blockers are genuine gates. The only one that cannot
    // be satisfied yet is the approval this request is granting.
    const outstanding = readiness.blockers.filter(
      (blocker) => !blocker.startsWith('HR Manager approval')
    )
    if (outstanding.length)
      return NextResponse.json(
        { error: `Transfer is not ready: ${outstanding.join('; ')}`, blockers: outstanding },
        { status: 422 }
      )

    const duplicates = await checkForDuplicateEmployee(params.id)
    // §19.3 a possible duplicate must be acknowledged in writing, not clicked past.
    if (duplicates.status === 'POSSIBLE_DUPLICATE' && !input.acknowledgeDuplicate)
      return NextResponse.json(
        {
          error: 'A possible duplicate employee was found. Review and acknowledge it before approving.',
          duplicateCheck: duplicates,
        },
        { status: 409 }
      )
    if (duplicates.status === 'POSSIBLE_DUPLICATE' && !input.duplicateNote?.trim())
      throw new AuthzError('Explain why this is not a duplicate before approving', 422)

    const approvedAt = new Date()
    const signatureInput = {
      resourceType: 'ERP_TRANSFER_APPROVAL' as const,
      resourceId: params.id,
      signatoryUserId: user.userId,
      signatoryName: user.email,
      signatoryEmail: user.email,
      signatoryRole: 'HR_MANAGER',
      signatureMethod: 'APPROVAL_CLICK' as const,
      payload: {
        application: application.referenceNumber,
        duplicateCheck: duplicates.status,
        approvedAt: approvedAt.toISOString(),
      },
      request,
    }

    // §19.1 Releasing a person to the ERP is the last and least reversible
    // decision in the process. The approval, the stage change and the signature
    // are written together, so an unsigned approval cannot exist.
    const { record, signature } = await prisma.$transaction(async (tx) => {
      // The record is created in an approved-but-not-yet-transferred state. The
      // personnel number stays null until the ERP issues one, so the field never
      // holds anything but a real number.
      const created = await tx.eRPTransferRecord.create({
        data: {
          applicationId: params.id,
          erpPersonnelNumber: null,
          transferStatus: 'APPROVED',
          approvedBy: user.userId,
          approvedAt,
          comment: input.comment?.trim() || null,
          duplicateCheckStatus: duplicates.status === 'POSSIBLE_DUPLICATE' ? 'OVERRIDDEN' : 'CLEAR',
          duplicateCheckNote: input.duplicateNote?.trim() || null,
        },
        select: { id: true, approvedAt: true, transferStatus: true, duplicateCheckStatus: true },
      })

      if (application.internalStatus === 'RESUMED')
        await tx.application.update({
          where: { id: params.id },
          data: { internalStatus: 'READY_FOR_ERP_TRANSFER' },
        })

      const written = await recordSignatureIn(tx, { ...signatureInput, resourceId: created.id })
      return { record: created, signature: written }
    })

    await logSignatureCaptured({ ...signatureInput, resourceId: record.id }, signature)

    await logAudit({
      actorUserId: user.userId,
      action: 'ERP_TRANSFER_APPROVED',
      resourceType: 'ERPTransferRecord',
      resourceId: record.id,
      newValue: { duplicateCheck: duplicates.status, warnings: readiness.warnings },
      reason: input.comment,
    })

    return NextResponse.json({ success: true, record, duplicateCheck: duplicates, warnings: readiness.warnings })
  } catch (error) {
    return authzResponse(error)
  }
}
