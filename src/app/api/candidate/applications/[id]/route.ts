import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { canTransitionApplication } from '@/lib/state-machine'
import { candidateFacingStatus } from '@/lib/candidate-status'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        candidate: { select: { userId: true } },
        candidateVisibleStatus: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
        vacancy: {
          select: {
            id: true,
            referenceNumber: true,
            title: true,
            department: { select: { name: true } },
            dutyStation: { select: { name: true } },
          },
        },
        answers: {
          select: {
            id: true,
            vacancyQuestionId: true,
            answerJson: true,
            vacancyQuestion: { select: { label: true, fieldType: true } },
          },
          orderBy: { vacancyQuestion: { displayOrder: 'asc' } },
        },
        files: {
          select: { id: true, fileAsset: { select: { originalName: true } } },
          orderBy: { id: 'asc' },
        },
        candidateAssessments: {
          select: {
            id: true,
            status: true,
            assessment: { select: { title: true, closesAt: true } },
          },
          orderBy: { invitedAt: 'desc' },
        },
        interviews: {
          select: {
            id: true,
            status: true,
            title: true,
            format: true,
            scheduledStart: true,
            candidateResponse: true,
          },
          orderBy: { scheduledStart: 'desc' },
        },
        offers: {
          where: { status: { in: ['SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'] } },
          select: {
            id: true,
            status: true,
            position: true,
            acceptanceDeadline: true,
            startDate: true,
          },
          orderBy: { sentAt: 'desc' },
        },
        preboardings: {
          select: {
            id: true,
            overallCompletionPercentage: true,
            readinessStatus: true,
            confirmedStartDate: true,
          },
          orderBy: { startedAt: 'desc' },
        },
        internalStatus: true,
      },
    })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (application.candidate.userId !== user.userId) throw new AuthzError('Forbidden', 403)
    const isDraft = application.internalStatus === 'DRAFT'
    // internalStatus is deliberately stripped: candidates only ever see the
    // derived candidate-facing status, never the internal pipeline stage.
    const { internalStatus: _internalStatus, ...candidateApplication } = application
    return NextResponse.json({
      application: {
        ...candidateApplication,
        candidateVisibleStatus: candidateFacingStatus(
          application.internalStatus,
          application.candidateVisibleStatus
        ),
        isDraft,
        canWithdraw: !isDraft && canTransitionApplication(application.internalStatus, 'WITHDRAWN'),
      },
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const { reason } = await parseBody(
      request,
      z.object({ action: z.literal('WITHDRAW'), reason: z.string().trim().min(1).max(2000) })
    )
    const application = await prisma.application.findUnique({ where: { id: params.id }, include: { candidate: true } })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (application.candidate.userId !== user.userId) throw new AuthzError('Forbidden', 403)
    if (!canTransitionApplication(application.internalStatus, 'WITHDRAWN'))
      return NextResponse.json({ error: 'This application can no longer be withdrawn.' }, { status: 409 })
    await prisma.$transaction(async (tx) => {
      const changed = await tx.application.updateMany({
        where: { id: application.id, internalStatus: application.internalStatus, lockVersion: application.lockVersion },
        data: { internalStatus: 'WITHDRAWN', candidateVisibleStatus: 'WITHDRAWN', lockVersion: { increment: 1 } },
      })
      if (changed.count !== 1) throw new AuthzError('Application changed; refresh and try again', 409)
      await tx.applicationStageHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: application.internalStatus,
          toStatus: 'WITHDRAWN',
          changedBy: user.userId,
          reason,
        },
      })
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'APPLICATION_WITHDRAWN',
      resourceType: 'Application',
      resourceId: application.id,
      reason,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const application = await prisma.application.findUnique({ where: { id: params.id }, include: { candidate: true } })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (application.candidate.userId !== user.userId) throw new AuthzError('Forbidden', 403)

    if (application.internalStatus !== 'DRAFT') {
      return NextResponse.json({ error: 'Only drafts can be deleted' }, { status: 409 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.applicationAnswer.deleteMany({ where: { applicationId: application.id } })
      await tx.applicationFile.deleteMany({ where: { applicationId: application.id } })
      await tx.applicationStageHistory.deleteMany({ where: { applicationId: application.id } })
      await tx.application.delete({ where: { id: application.id } })
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'APPLICATION_DRAFT_DELETED',
      resourceType: 'Application',
      resourceId: application.id,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return authzResponse(error)
  }
}
