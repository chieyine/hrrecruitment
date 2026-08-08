import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { AuthzError } from '@/lib/authz'
import { findIndependentApprover } from '@/lib/approvals'
import { canApproveRecruitmentResource } from '@/lib/recruitment-role-policy'

// GET → pending approvals, enriched with the underlying selection/candidate.
export async function GET() {
  try {
    const user = await requireUser()
    if (user.roles.includes('SYSTEM_ADMIN')) {
      throw new AuthzError('Recruitment approvals require a separate operational account', 403)
    }
    const approvals = await prisma.approval.findMany({
      where: {
        OR: [
          { decision: 'PENDING', approverUserId: user.userId },
          { decision: 'CONDITIONS_PENDING', requestedBy: user.userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { conditions: { orderBy: { createdAt: 'asc' } } },
    })

    const enriched = await Promise.all(
      approvals.map(async (a) => {
        let detail: any = null
        if (a.resourceType === 'SELECTION') {
          const sel = await prisma.selectionDecision.findUnique({
            where: { id: a.resourceId },
            include: {
              application: {
                include: {
                  candidate: true,
                  vacancy: { select: { title: true, referenceNumber: true } },
                },
              },
            },
          })
          if (sel) {
            detail = {
              candidate: `${sel.application.candidate.legalFirstName} ${sel.application.candidate.lastName}`,
              vacancy: sel.application.vacancy.title,
              overrideFlag: sel.overrideFlag,
              justification: sel.justification,
              href: `/recruitment/applications/${sel.applicationId}`,
              hrefLabel: 'Review application',
              fields: [
                { label: 'Outcome', value: sel.outcome.replaceAll('_', ' ').toLowerCase() },
                { label: 'Rank', value: sel.rank ? String(sel.rank) : 'Not ranked' },
                {
                  label: 'Final score',
                  value:
                    sel.application.finalScore === null || sel.application.finalScore === undefined
                      ? 'Not calculated'
                      : `${sel.application.finalScore}%`,
                },
                {
                  label: 'Interview score',
                  value:
                    sel.application.interviewScore === null || sel.application.interviewScore === undefined
                      ? 'Not recorded'
                      : `${sel.application.interviewScore}%`,
                },
                {
                  label: 'References',
                  value: sel.application.referenceStatus.replaceAll('_', ' ').toLowerCase(),
                },
              ],
            }
          }
        } else if (a.resourceType === 'OFFER') {
          const offer = await prisma.offer.findUnique({
            where: { id: a.resourceId },
            include: {
              application: {
                include: {
                  candidate: true,
                  vacancy: { select: { title: true, referenceNumber: true } },
                },
              },
            },
          })
          if (offer) {
            detail = {
              candidate: `${offer.application.candidate.legalFirstName} ${offer.application.candidate.lastName}`,
              vacancy: offer.application.vacancy.title,
              justification: offer.conditions || null,
              href: `/recruitment/applications/${offer.applicationId}`,
              hrefLabel: 'Review application',
              documentHref: `/api/recruitment/offers/${offer.id}/preview`,
              fields: [
                { label: 'Position', value: offer.position },
                { label: 'Duty station', value: offer.dutyStation },
                {
                  label: 'Contract',
                  value: [offer.contractType, offer.contractDuration].filter(Boolean).join(' · '),
                },
                { label: 'Compensation', value: offer.salary },
                { label: 'Start date', value: offer.startDate.toLocaleDateString('en-GB') },
                { label: 'Response due', value: offer.acceptanceDeadline.toLocaleDateString('en-GB') },
              ],
            }
          }
        } else if (a.resourceType === 'VACANCY') {
          const vacancy = await prisma.vacancy.findUnique({
            where: { id: a.resourceId },
            include: {
              department: { select: { name: true } },
              dutyStation: { select: { name: true } },
            },
          })
          if (vacancy) {
            detail = {
              candidate: vacancy.referenceNumber,
              vacancy: vacancy.title,
              justification: vacancy.summary,
              href: `/recruitment/vacancies/${vacancy.id}`,
              hrefLabel: 'Review vacancy',
              fields: [
                { label: 'Department', value: vacancy.department.name },
                { label: 'Duty station', value: vacancy.dutyStation.name },
                { label: 'Contract', value: vacancy.contractType.replaceAll('_', ' ').toLowerCase() },
                { label: 'Positions', value: String(vacancy.numberOfPositions) },
                { label: 'Opens', value: vacancy.openingAt.toLocaleDateString('en-GB') },
                { label: 'Closes', value: vacancy.closingAt.toLocaleDateString('en-GB') },
              ],
            }
          }
        }
        return { ...a, detail }
      })
    )

    return NextResponse.json({ approvals: enriched })
  } catch (err) {
    return authzResponse(err)
  }
}

// POST → approve, conditionally approve, return, or reject a pending request.
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if (user.roles.includes('SYSTEM_ADMIN')) {
      throw new AuthzError('Recruitment approvals require a separate operational account', 403)
    }
    const { approvalId, decision, comment, lockVersion, conditionDueAt, conditionOwnerUserId, evidenceFileId } =
      await parseBody(
        request,
        z.object({
          approvalId: z.string().min(1),
          decision: z.enum(['APPROVED', 'APPROVED_WITH_CONDITIONS', 'SATISFY_CONDITIONS', 'RETURNED', 'REJECTED']),
          comment: z.string().trim().max(2000).optional(),
          lockVersion: z.number().int().positive(),
          conditionDueAt: z.coerce.date().optional(),
          conditionOwnerUserId: z.string().optional(),
          evidenceFileId: z.string().optional(),
        })
      )
    if (decision !== 'APPROVED' && !comment) {
      throw new AuthzError('A comment is required for this decision', 400)
    }
    const approved = decision === 'APPROVED'

    const approval = await prisma.approval.findUnique({ where: { id: approvalId }, include: { conditions: true } })
    if (!approval) return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    if (decision === 'SATISFY_CONDITIONS') {
      if (approval.decision !== 'CONDITIONS_PENDING' || approval.requestedBy !== user.userId)
        throw new AuthzError('Only the requester can submit evidence for these conditions', 403)
      if (!comment || comment.length < 10) throw new AuthzError('Describe how the conditions were satisfied', 400)
      if (
        evidenceFileId &&
        !(await prisma.fileAsset.findFirst({
          where: { id: evidenceFileId, ownerUserId: user.userId, virusScanStatus: 'CLEAN' },
        }))
      )
        throw new AuthzError('Condition evidence is unavailable or unsafe', 400)
      await prisma.$transaction([
        prisma.approvalCondition.updateMany({
          where: { approvalId: approval.id, status: 'OPEN' },
          data: { status: 'EVIDENCE_SUBMITTED', evidenceNote: comment, evidenceFileId: evidenceFileId || null },
        }),
        prisma.approval.update({
          where: { id: approval.id },
          data: { decision: 'PENDING', decidedAt: null, lockVersion: { increment: 1 } },
        }),
      ])
      await logAudit({
        actorUserId: user.userId,
        action: 'APPROVAL_CONDITION_EVIDENCE_SUBMITTED',
        resourceType: approval.resourceType,
        resourceId: approval.resourceId,
        reason: comment,
      })
      return NextResponse.json({ success: true, status: 'RETURNED_TO_APPROVER' })
    }
    if (!canApproveRecruitmentResource(user.roles, approval.resourceType))
      throw new AuthzError('Approver permission is required', 403)
    if (approval.decision !== 'PENDING') {
      return NextResponse.json({ error: 'This item has already been decided' }, { status: 409 })
    }
    if (approval.approverUserId !== user.userId) {
      throw new AuthzError('This approval is assigned to another approver', 403)
    }
    if (approval.requestedBy === user.userId) {
      throw new AuthzError('The requester cannot approve their own decision', 409)
    }
    if (approval.resourceType === 'SELECTION') {
      const selection = await prisma.selectionDecision.findUnique({ where: { id: approval.resourceId } })
      if (selection?.createdBy === user.userId) {
        return NextResponse.json({ error: 'The selection creator cannot approve their own decision' }, { status: 409 })
      }
    }

    const nextSelectionApprover =
      decision === 'APPROVED' && approval.resourceType === 'SELECTION' && approval.stage === 1
        ? await findIndependentApprover(
            user.userId,
            ['APPROVER', 'HR_MANAGER'],
            approval.requestedBy ? [approval.requestedBy] : []
          )
        : null
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.approval.updateMany({
        where: { id: approvalId, decision: 'PENDING', lockVersion },
        data: {
          decision: decision === 'APPROVED_WITH_CONDITIONS' ? 'CONDITIONS_PENDING' : decision,
          comment: comment || null,
          decidedAt: new Date(),
          lockVersion: { increment: 1 },
        },
      })
      if (claimed.count !== 1) throw new AuthzError('This approval changed; refresh and try again', 409)
      if (decision === 'APPROVED_WITH_CONDITIONS') {
        await tx.approvalCondition.create({
          data: {
            approvalId,
            description: comment!,
            ownerUserId: conditionOwnerUserId || approval.requestedBy,
            dueAt: conditionDueAt || new Date(Date.now() + 7 * 86400000),
          },
        })
        return
      }
      if (decision === 'APPROVED' && approval.conditions.length) {
        await tx.approvalCondition.updateMany({
          where: { approvalId, status: { in: ['OPEN', 'EVIDENCE_SUBMITTED'] } },
          data: { status: 'SATISFIED', decidedBy: user.userId, decidedAt: new Date() },
        })
      }
      if (nextSelectionApprover) {
        await tx.approval.create({
          data: {
            resourceType: 'SELECTION',
            resourceId: approval.resourceId,
            stage: 2,
            approverUserId: nextSelectionApprover,
            requestedBy: approval.requestedBy,
            decision: 'PENDING',
          },
        })
        return
      }
      if (approval.resourceType === 'SELECTION') {
        const selection = await tx.selectionDecision.findUnique({ where: { id: approval.resourceId } })
        if (!selection) throw new AuthzError('Selection decision not found', 404)
        if (approved) {
          const application = await tx.application.findUnique({
            where: { id: selection.applicationId },
            select: { internalStatus: true },
          })
          if (!application || !['INTERVIEW_COMPLETED', 'REFERENCE_CHECK'].includes(application.internalStatus)) {
            throw new AuthzError('The application is no longer at an approvable stage', 409)
          }
          await tx.selectionDecision.update({
            where: { id: selection.id },
            data: { approvedBy: user.userId, approvedAt: new Date() },
          })
          await tx.application.update({
            where: { id: selection.applicationId },
            data: {
              internalStatus:
                selection.outcome === 'SELECTED'
                  ? 'RECOMMENDED'
                  : selection.outcome.includes('RESERVE')
                    ? 'RESERVE'
                    : 'NOT_SELECTED',
              candidateVisibleStatus:
                selection.outcome === 'SELECTED'
                  ? 'DECISION_IN_PROGRESS'
                  : selection.outcome.includes('RESERVE')
                    ? 'UNDER_CONSIDERATION'
                    : 'NOT_SELECTED',
            },
          })
        }
      } else if (approval.resourceType === 'VACANCY') {
        const vacancy = await tx.vacancy.findUnique({ where: { id: approval.resourceId } })
        if (!vacancy) throw new AuthzError('Vacancy not found', 404)
        if (vacancy.status !== 'PENDING_APPROVAL') {
          throw new AuthzError('The vacancy is no longer awaiting approval', 409)
        }
        if (vacancy.ownerUserId === user.userId) {
          throw new AuthzError('The vacancy owner cannot approve their own vacancy', 409)
        }
        if (approved) {
          await tx.vacancy.update({
            where: { id: vacancy.id },
            data: { status: 'APPROVED', lockVersion: { increment: 1 } },
          })
        } else {
          await tx.vacancy.update({
            where: { id: vacancy.id },
            data: { status: 'DRAFT', lockVersion: { increment: 1 } },
          })
        }
      } else if (approval.resourceType === 'OFFER') {
        const offer = await tx.offer.findUnique({ where: { id: approval.resourceId } })
        if (!offer) throw new AuthzError('Offer not found', 404)
        if (offer.status !== 'PENDING_APPROVAL') {
          throw new AuthzError('The offer is no longer awaiting approval', 409)
        }
        if (approved) {
          await tx.offer.update({
            where: { id: offer.id },
            data: { status: 'APPROVED', version: { increment: 1 } },
          })
        } else {
          await tx.offer.update({
            where: { id: offer.id },
            data: { status: decision === 'RETURNED' ? 'DRAFT' : 'WITHDRAWN' },
          })
          await tx.application.update({
            where: { id: offer.applicationId },
            data: {
              internalStatus: 'RECOMMENDED',
              candidateVisibleStatus: 'DECISION_IN_PROGRESS',
              offerStatus: decision === 'RETURNED' ? 'DRAFT' : 'REJECTED',
              lockVersion: { increment: 1 },
            },
          })
        }
      } else {
        throw new AuthzError(`Unsupported approval type: ${approval.resourceType}`, 422)
      }
    })

    await logAudit({
      actorUserId: user.userId,
      action:
        decision === 'APPROVED'
          ? 'APPROVAL_GRANTED'
          : decision === 'APPROVED_WITH_CONDITIONS'
            ? 'APPROVAL_GRANTED_WITH_CONDITIONS'
            : decision === 'RETURNED'
              ? 'APPROVAL_RETURNED'
              : 'APPROVAL_REJECTED',
      resourceType: approval.resourceType,
      resourceId: approval.resourceId,
      reason: comment,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return authzResponse(err)
  }
}
