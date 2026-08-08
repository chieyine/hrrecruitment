import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { parseBody, staffingRequestSchema } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { findIndependentApprover } from '@/lib/approvals'
import { canTransitionStaffingRequest, requiresExecutiveApproval } from '@/lib/staffing-request'
import { recordSignatureIn, logSignatureCaptured, type RecordSignatureInput } from '@/lib/signatures'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('UPDATE'), lockVersion: z.coerce.number().int().positive(), data: staffingRequestSchema }),
  z.object({ action: z.literal('SUBMIT'), lockVersion: z.coerce.number().int().positive() }),
  z.object({
    action: z.literal('RETURN'),
    lockVersion: z.coerce.number().int().positive(),
    reason: z.string().trim().min(10).max(2000),
  }),
  z.object({
    action: z.literal('HR_APPROVE'),
    lockVersion: z.coerce.number().int().positive(),
    comment: z.string().trim().max(2000).optional(),
  }),
  z.object({
    action: z.literal('EXECUTIVE_APPROVE'),
    lockVersion: z.coerce.number().int().positive(),
    comment: z.string().trim().max(2000).optional(),
  }),
  z.object({
    action: z.literal('REJECT'),
    lockVersion: z.coerce.number().int().positive(),
    reason: z.string().trim().min(10).max(2000),
  }),
  z.object({
    action: z.literal('CANCEL'),
    lockVersion: z.coerce.number().int().positive(),
    reason: z.string().trim().min(10).max(2000),
  }),
])

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const input = await parseBody(request, schema)

    const existing = await prisma.staffingRequest.findUnique({
      where: { id: params.id },
      include: {
        fundingConfirmations: { where: { supersededAt: null }, orderBy: { decidedAt: 'desc' }, take: 1 },
      },
    })
    if (!existing) throw new AuthzError('Staffing request not found', 404)

    // Optimistic concurrency: two people working the same request must not
    // silently overwrite one another's decision.
    if (existing.lockVersion !== input.lockVersion)
      throw new AuthzError('This request changed since you opened it. Reload and try again.', 409)

    const isOwner = existing.createdBy === user.userId || existing.hiringManagerUserId === user.userId
    const [canCreate, canReview, canApprove] = await Promise.all([
      hasPermission(user.userId, 'staffing.request.create'),
      hasPermission(user.userId, 'staffing.request.review'),
      hasPermission(user.userId, 'staffing.request.approve'),
    ])

    let nextStatus = existing.status
    let decisionReason: string | null = existing.decisionReason
    const extra: Record<string, unknown> = {}
    /** §28.10 Captured with the status change rather than beside it. */
    let pendingSignature: RecordSignatureInput | null = null
    let approvalToClose: string | null = null

    if (input.action === 'UPDATE') {
      if (!isOwner && !canReview) throw new AuthzError('Only the requester or HR may edit this request', 403)
      if (!['DRAFT', 'RETURNED_FOR_CORRECTION'].includes(existing.status))
        throw new AuthzError('Only a draft or returned request may be edited', 422)
      if (!canCreate && !canReview) throw new AuthzError('Forbidden', 403)

      const updated = await prisma.staffingRequest.update({
        where: { id: existing.id },
        data: {
          positionTitle: input.data.positionTitle.trim(),
          departmentId: input.data.departmentId,
          projectId: input.data.projectId || null,
          dutyStationId: input.data.dutyStationId,
          numberOfPositions: input.data.numberOfPositions,
          isReplacement: input.data.isReplacement,
          previousHolder: input.data.previousHolder?.trim() || null,
          recruitmentReason: input.data.recruitmentReason.trim(),
          reportingLine: input.data.reportingLine.trim(),
          contractType: input.data.contractType.trim(),
          contractDurationMonths: input.data.contractDurationMonths ?? null,
          expectedStartDate: input.data.expectedStartDate,
          jobGrade: input.data.jobGrade.trim(),
          urgency: input.data.urgency,
          budgetLine: input.data.budgetLine.trim(),
          fundingSource: input.data.fundingSource,
          fundingEndDate: input.data.fundingEndDate ?? null,
          proposedSalaryCeiling: input.data.proposedSalaryCeiling?.trim() || null,
          donorRestrictions: input.data.donorRestrictions?.trim() || null,
          jobDescriptionFileId: input.data.jobDescriptionFileId || null,
          requiredQualifications: input.data.requiredQualifications.trim(),
          requiredExperience: input.data.requiredExperience.trim(),
          requiredLanguages: input.data.requiredLanguages?.trim() || null,
          safeguardingSensitivity: input.data.safeguardingSensitivity,
          proposedAssessmentMethod: input.data.proposedAssessmentMethod?.trim() || null,
          proposedPanel: input.data.proposedPanel?.trim() || null,
          hiringManagerName: input.data.hiringManagerName.trim(),
          hiringManagerEmail: input.data.hiringManagerEmail,
          hiringManagerPhone: input.data.hiringManagerPhone?.trim() || null,
          lockVersion: { increment: 1 },
        },
        select: { id: true, lockVersion: true, status: true },
      })
      await logAudit({
        actorUserId: user.userId,
        action: 'STAFFING_REQUEST_UPDATED',
        resourceType: 'StaffingRequest',
        resourceId: existing.id,
        previousValue: { positionTitle: existing.positionTitle, budgetLine: existing.budgetLine },
        newValue: input.data,
      })
      return NextResponse.json({ success: true, result: updated })
    }

    if (input.action === 'SUBMIT') {
      if (!isOwner && !canReview) throw new AuthzError('Only the requester may submit this request', 403)
      // §5.1 A job description is what HR and the panel actually recruit
      // against, so it is required before the request can move.
      if (!existing.jobDescriptionFileId)
        throw new AuthzError('Attach the job description before submitting', 422)
      nextStatus = 'AWAITING_FUNDING_CONFIRMATION'
      extra.submittedAt = new Date()
      decisionReason = null

      // §28.10 the requester signs the submission. Deferred to the transaction
      // below so an unsigned submission cannot be recorded.
      pendingSignature = {
        resourceType: 'STAFFING_REQUEST',
        resourceId: existing.id,
        signatoryUserId: user.userId,
        signatoryName: existing.hiringManagerName,
        signatoryEmail: existing.hiringManagerEmail,
        signatoryRole: 'HIRING_MANAGER',
        signatureMethod: 'APPROVAL_CLICK',
        documentVersion: existing.lockVersion,
        payload: {
          positionTitle: existing.positionTitle,
          numberOfPositions: existing.numberOfPositions,
          budgetLine: existing.budgetLine,
          jobGrade: existing.jobGrade,
        },
        request,
      }
    } else if (input.action === 'RETURN') {
      if (!canReview) throw new AuthzError('Only HR may return a request for correction', 403)
      nextStatus = 'RETURNED_FOR_CORRECTION'
      decisionReason = input.reason
    } else if (input.action === 'HR_APPROVE') {
      if (!canReview) throw new AuthzError('Only HR may review a staffing request', 403)
      if (existing.status !== 'AWAITING_HR_REVIEW')
        throw new AuthzError('The request must be awaiting HR review', 422)
      // §7.1 HR cannot pass a request that has no confirmed funding behind it.
      const confirmation = existing.fundingConfirmations[0]
      if (!confirmation || confirmation.decision !== 'CONFIRMED')
        throw new AuthzError('Budget Holder funding confirmation is required before HR approval', 409)

      const hrOwnedRequest = user.roles.includes('HR_MANAGER') && existing.hiringManagerUserId === user.userId
      const needsExecutive = !hrOwnedRequest && requiresExecutiveApproval({
        jobGrade: existing.jobGrade,
        urgency: existing.urgency,
        isReplacement: existing.isReplacement,
        numberOfPositions: existing.numberOfPositions,
      })
      nextStatus = needsExecutive ? 'AWAITING_EXECUTIVE_APPROVAL' : 'APPROVED_FOR_VACANCY'
      decisionReason = input.comment?.trim() || null
      if (!needsExecutive) extra.decidedAt = new Date()

      if (needsExecutive) {
        // §3.9 route to an approver who is independent of the HR reviewer and
        // of the person who raised the request.
        const approverUserId = await findIndependentApprover(user.userId, ['APPROVER', 'HR_MANAGER'], [
          existing.createdBy,
          existing.hiringManagerUserId,
        ])
        await prisma.approval.create({
          data: {
            resourceType: 'STAFFING_REQUEST',
            resourceId: existing.id,
            stage: 1,
            approverUserId,
            requestedBy: user.userId,
            decision: 'PENDING',
          },
        })
      }
    } else if (input.action === 'EXECUTIVE_APPROVE') {
      if (!canApprove) throw new AuthzError('Only an authorised approver may approve this request', 403)
      if (existing.status !== 'AWAITING_EXECUTIVE_APPROVAL')
        throw new AuthzError('The request is not awaiting executive approval', 422)
      // §24 no self-approval: the escalation exists precisely to add a second pair of eyes.
      if (existing.createdBy === user.userId || existing.hiringManagerUserId === user.userId)
        throw new AuthzError('You cannot approve a staffing request you raised', 403)
      const assigned = await prisma.approval.findFirst({
        where: { resourceType: 'STAFFING_REQUEST', resourceId: existing.id, decision: 'PENDING' },
      })
      if (assigned && assigned.approverUserId !== user.userId)
        throw new AuthzError('This approval is assigned to another approver', 403)
      approvalToClose = assigned?.id ?? null
      nextStatus = 'APPROVED_FOR_VACANCY'
      decisionReason = input.comment?.trim() || null
      extra.decidedAt = new Date()

      pendingSignature = {
        resourceType: 'STAFFING_REQUEST',
        resourceId: existing.id,
        signatoryUserId: user.userId,
        signatoryName: user.email,
        signatoryEmail: user.email,
        signatoryRole: 'EXECUTIVE_APPROVER',
        signatureMethod: 'APPROVAL_CLICK',
        documentVersion: existing.lockVersion,
        payload: { decision: 'APPROVED_FOR_VACANCY', comment: input.comment ?? null },
        request,
      }
    } else if (input.action === 'REJECT') {
      if (!canReview && !canApprove) throw new AuthzError('Forbidden', 403)
      if (existing.createdBy === user.userId)
        throw new AuthzError('You cannot decide a staffing request you raised', 403)
      nextStatus = 'REJECTED'
      decisionReason = input.reason
      extra.decidedAt = new Date()
    } else {
      if (!isOwner && !canReview) throw new AuthzError('Forbidden', 403)
      nextStatus = 'CANCELLED'
      decisionReason = input.reason
      extra.decidedAt = new Date()
    }

    if (!canTransitionStaffingRequest(existing.status, nextStatus))
      throw new AuthzError(`Cannot move a request from ${existing.status} to ${nextStatus}`, 422)

    const { result, signature } = await prisma.$transaction(async (tx) => {
      if (approvalToClose)
        await tx.approval.update({
          where: { id: approvalToClose },
          data: {
            decision: 'APPROVED',
            comment: 'comment' in input ? input.comment?.trim() || null : null,
            decidedAt: new Date(),
          },
        })

      const updated = await tx.staffingRequest.update({
        where: { id: existing.id },
        data: { status: nextStatus, decisionReason, lockVersion: { increment: 1 }, ...extra },
        select: { id: true, status: true, lockVersion: true },
      })

      const written = pendingSignature ? await recordSignatureIn(tx, pendingSignature) : null
      return { result: updated, signature: written }
    })

    if (pendingSignature && signature) await logSignatureCaptured(pendingSignature, signature)

    await logAudit({
      actorUserId: user.userId,
      action: `STAFFING_REQUEST_${input.action}`,
      resourceType: 'StaffingRequest',
      resourceId: existing.id,
      previousValue: { status: existing.status },
      newValue: result,
      reason: decisionReason || undefined,
    })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    return authzResponse(error)
  }
}
