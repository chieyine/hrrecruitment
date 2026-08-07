import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody, fundingConfirmationSchema } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { canTransitionStaffingRequest } from '@/lib/staffing-request'
import { recordSignatureIn, logSignatureCaptured } from '@/lib/signatures'

/**
 * §3.7 Budget Holder funding decision.
 *
 * The Budget Holder — not Finance — determines whether a position is funded and
 * within what ceiling. A confirmation supersedes any earlier one so the current
 * financial envelope is always a single unambiguous record.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('funding.confirm')
    const input = await parseBody(request, fundingConfirmationSchema)

    const staffingRequest = await prisma.staffingRequest.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        positionTitle: true,
        numberOfPositions: true,
        budgetLine: true,
        fundingSource: true,
        fundingEndDate: true,
        createdBy: true,
        hiringManagerUserId: true,
        lockVersion: true,
      },
    })
    if (!staffingRequest) throw new AuthzError('Staffing request not found', 404)

    // §24 A Budget Holder who also raised the request cannot fund their own ask.
    if (staffingRequest.createdBy === user.userId || staffingRequest.hiringManagerUserId === user.userId)
      throw new AuthzError('You cannot confirm funding for a staffing request you raised', 403)

    if (staffingRequest.status !== 'AWAITING_FUNDING_CONFIRMATION')
      throw new AuthzError('This request is not awaiting funding confirmation', 422)

    const nextStatus =
      input.decision === 'CONFIRMED'
        ? 'FUNDING_CONFIRMED'
        : input.decision === 'REJECTED'
          ? 'FUNDING_REJECTED'
          : 'RETURNED_FOR_CORRECTION'

    if (!canTransitionStaffingRequest(staffingRequest.status, nextStatus))
      throw new AuthzError(`Cannot move a request from ${staffingRequest.status} to ${nextStatus}`, 422)

    // §28.10 The Budget Holder's signature is the record of financial authority,
    // so it is written in the same transaction as the decision. If it cannot be
    // written, no funding decision is recorded at all.
    const signatureInput = {
      resourceType: 'FUNDING_CONFIRMATION' as const,
      resourceId: staffingRequest.id,
      signatoryUserId: user.userId,
      signatoryName: user.email,
      signatoryEmail: user.email,
      signatoryRole: 'BUDGET_HOLDER',
      signatureMethod: 'APPROVAL_CLICK' as const,
      documentVersion: staffingRequest.lockVersion,
      payload: {
        staffingRequest: staffingRequest.referenceNumber,
        decision: input.decision,
        budgetLine: input.budgetLine ?? null,
        salaryCeilingAmount: input.salaryCeilingAmount ?? null,
        salaryCeilingCurrency: input.salaryCeilingCurrency ?? 'NGN',
        maximumRecruitmentCost: input.maximumRecruitmentCost ?? null,
        fundingEndDate: input.fundingEndDate?.toISOString() ?? null,
      },
      request,
    }

    const result = await prisma.$transaction(async (tx) => {
      // Only one confirmation is ever current. Earlier ones stay for audit.
      await tx.fundingConfirmation.updateMany({
        where: { staffingRequestId: staffingRequest.id, supersededAt: null },
        data: { supersededAt: new Date() },
      })

      const confirmation = await tx.fundingConfirmation.create({
        data: {
          staffingRequestId: staffingRequest.id,
          budgetHolderUserId: user.userId,
          decision: input.decision,
          budgetLine: input.budgetLine?.trim() || null,
          fundingSource: input.fundingSource || null,
          fundingStartDate: input.fundingStartDate ?? null,
          fundingEndDate: input.fundingEndDate ?? null,
          salaryCeilingAmount: input.salaryCeilingAmount ?? null,
          salaryCeilingCurrency: input.salaryCeilingCurrency || 'NGN',
          maximumRecruitmentCost: input.maximumRecruitmentCost ?? null,
          grantFunded: input.grantFunded,
          donorApprovalRequired: input.donorApprovalRequired,
          donorApprovalReference: input.donorApprovalReference?.trim() || null,
          comment: input.comment?.trim() || null,
        },
      })

      // A confirmed request goes straight on to HR review; anything else stops
      // and waits for the department to act.
      const updated = await tx.staffingRequest.update({
        where: { id: staffingRequest.id },
        data: {
          status: input.decision === 'CONFIRMED' ? 'AWAITING_HR_REVIEW' : nextStatus,
          decisionReason: input.comment?.trim() || null,
          // Adopt the confirmed budget line so the vacancy inherits the real one.
          ...(input.decision === 'CONFIRMED' && input.budgetLine ? { budgetLine: input.budgetLine.trim() } : {}),
          ...(input.decision === 'CONFIRMED' && input.fundingEndDate
            ? { fundingEndDate: input.fundingEndDate }
            : {}),
          lockVersion: { increment: 1 },
        },
        select: { id: true, status: true, lockVersion: true },
      })

      // Signed against the confirmation that was just created, inside the same
      // transaction — a rollback here takes the funding decision with it.
      const signature = await recordSignatureIn(tx, { ...signatureInput, resourceId: confirmation.id })

      return { confirmation, updated, signature }
    })

    await logSignatureCaptured({ ...signatureInput, resourceId: result.confirmation.id }, result.signature)

    await logAudit({
      actorUserId: user.userId,
      action: `FUNDING_${input.decision}`,
      resourceType: 'StaffingRequest',
      resourceId: staffingRequest.id,
      previousValue: { status: staffingRequest.status },
      newValue: {
        status: result.updated.status,
        confirmationId: result.confirmation.id,
        salaryCeilingAmount: input.salaryCeilingAmount ?? null,
        budgetLine: input.budgetLine ?? null,
      },
      reason: input.comment || undefined,
    })

    return NextResponse.json({
      success: true,
      result: {
        ...result.updated,
        confirmation: {
          ...result.confirmation,
          salaryCeilingAmount: result.confirmation.salaryCeilingAmount?.toString() ?? null,
          maximumRecruitmentCost: result.confirmation.maximumRecruitmentCost?.toString() ?? null,
        },
      },
    })
  } catch (error) {
    return authzResponse(error)
  }
}
