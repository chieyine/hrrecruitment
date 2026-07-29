import { NextResponse } from 'next/server'
import { requirePermission, authzResponse } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'
import { AuthzError } from '@/lib/authz'
import { createNotification } from '@/lib/notifications'

const schema = z
  .object({
    panelMemberId: z.string().min(1),
    recommendation: z.enum(['RECOMMENDED', 'RESERVE', 'NOT_RECOMMENDED']).optional(),
    conflictType: z.enum(['NONE', 'FAMILY', 'PERSONAL', 'SUPERVISORY', 'COLLEAGUE', 'FINANCIAL', 'OTHER']),
    conflictComment: z.string().trim().max(2000).optional(),
    questionScores: z
      .array(
        z.object({
          interviewQuestionId: z.string().min(1),
          score: z.coerce.number().finite().min(0),
          comment: z.string().trim().max(2000).optional(),
        })
      )
      .max(100),
  })
  .superRefine((value, context) => {
    if (value.conflictType !== 'NONE' && !value.conflictComment)
      context.addIssue({ code: 'custom', path: ['conflictComment'], message: 'Conflict details are required' })
    if (new Set(value.questionScores.map((score) => score.interviewQuestionId)).size !== value.questionScores.length)
      context.addIssue({ code: 'custom', path: ['questionScores'], message: 'Question scores must be unique' })
  })

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('interview.score.assigned')

    const { panelMemberId, recommendation, questionScores, conflictType, conflictComment } = await parseBody(
      request,
      schema
    )

    // The panel member must belong to THIS interview (prevents cross-interview writes).
    const panelMember = await prisma.interviewPanelMember.findUnique({ where: { id: panelMemberId } })
    if (!panelMember || panelMember.interviewId !== params.id) {
      return NextResponse.json({ error: 'Panel member does not belong to this interview' }, { status: 422 })
    }
    if (panelMember.userId !== user.userId) {
      return NextResponse.json({ error: 'You may only submit your own independent panel score' }, { status: 403 })
    }
    const declaredConflict = conflictType
    if (!declaredConflict) return NextResponse.json({ error: 'Conflict declaration is required' }, { status: 400 })
    if (panelMember.conflictStatus !== 'NONE' && panelMember.conflictStatus !== 'RESOLVED_EXCEPTION')
      return NextResponse.json({ error: 'Panel scoring is blocked until HR resolves this conflict' }, { status: 409 })
    if (declaredConflict !== 'NONE' && panelMember.conflictStatus !== 'RESOLVED_EXCEPTION') {
      await prisma.interviewPanelMember.update({
        where: { id: panelMember.id },
        data: { conflictStatus: declaredConflict, conflictComment: conflictComment || null },
      })
      return NextResponse.json({ error: 'Panel scoring is blocked until HR resolves this conflict' }, { status: 409 })
    }
    if (panelMember.conflictStatus === 'NONE')
      await prisma.interviewPanelMember.update({
        where: { id: panelMember.id },
        data: { conflictStatus: 'NONE', conflictComment: null },
      })

    const interview = await prisma.interview.findUnique({
      where: { id: params.id },
      include: { questions: true, application: { select: { internalStatus: true } } },
    })
    if (!interview) throw new AuthzError('Interview not found', 404)
    if (interview.scheduledStart > new Date()) {
      throw new AuthzError('The scorecard opens when the interview starts', 409)
    }
    if (interview.status === 'CANCELLED' || ['WITHDRAWN', 'CANCELLED'].includes(interview.application.internalStatus)) {
      throw new AuthzError('This interview is closed', 409)
    }
    const interviewQuestions = interview.questions
    {
      const byId = new Map(interviewQuestions.map((q) => [q.id, q]))
      const submittedById = new Map(questionScores.map((item) => [item.interviewQuestionId, item]))
      const missing = interviewQuestions.find((question) => !submittedById.has(question.id))
      if (missing)
        return NextResponse.json({ error: `Score the mandatory question: ${missing.question}` }, { status: 422 })
      for (const item of questionScores) {
        const question = byId.get(item.interviewQuestionId)
        if (!question || Number(item.score) < 0 || Number(item.score) > question.maximumScore)
          return NextResponse.json({ error: 'Invalid interview question score' }, { status: 422 })
        if (question.commentRequired && !String(item.comment || '').trim())
          return NextResponse.json({ error: `A comment is required for: ${question.question}` }, { status: 422 })
      }
    }

    const awardedScore = questionScores.reduce((sum: number, item: any) => sum + Number(item.score), 0)
    const possibleScore = interviewQuestions.reduce((sum, question) => sum + question.maximumScore, 0)
    const computedScore = possibleScore > 0 ? Math.round((awardedScore / possibleScore) * 10_000) / 100 : 0
    const submission = await prisma.$transaction(async (tx) => {
      const existingSubmission = await tx.interviewPanelSubmission.findUnique({ where: { panelMemberId } })
      if (existingSubmission && !existingSubmission.reopenedAt) throw new Error('SCORE_LOCKED')
      await tx.interviewScore.deleteMany({ where: { interviewId: params.id, panelMemberId: panelMember.id } })
      if (questionScores.length)
        await tx.interviewScore.createMany({
          data: questionScores.map((item: any) => ({
            interviewId: params.id,
            panelMemberId: panelMember.id,
            interviewQuestionId: item.interviewQuestionId,
            score: Number(item.score),
            comment: item.comment || null,
          })),
        })
      const saved = await tx.interviewPanelSubmission.upsert({
        where: { panelMemberId },
        update: {
          totalScore: computedScore,
          recommendation: recommendation || 'RECOMMENDED',
          submittedAt: new Date(),
          version: { increment: 1 },
          previousVersionsJson: JSON.stringify([
            ...JSON.parse(existingSubmission?.previousVersionsJson || '[]'),
            {
              version: existingSubmission?.version,
              totalScore: existingSubmission?.totalScore,
              recommendation: existingSubmission?.recommendation,
              submittedAt: existingSubmission?.submittedAt,
            },
          ]),
          reopenedAt: null,
          reopenedBy: null,
          reopenReason: null,
        },
        create: {
          interviewId: params.id,
          panelMemberId,
          totalScore: computedScore,
          recommendation: recommendation || 'RECOMMENDED',
        },
      })
      const allSubmissions = await tx.interviewPanelSubmission.findMany({ where: { interviewId: params.id } })
      const memberCount = await tx.interviewPanelMember.count({ where: { interviewId: params.id } })
      if (memberCount > 0 && allSubmissions.length === memberCount) {
        const scores = allSubmissions.map((item) => item.totalScore)
        const varianceFlag = Math.max(...scores) - Math.min(...scores) >= 25
        await tx.interview.update({
          where: { id: params.id },
          data: {
            status: 'PANEL_REVIEW',
            panelReadyAt: new Date(),
            varianceFlag,
            panelConfirmedAt: null,
            panelConfirmedBy: null,
            lockVersion: { increment: 1 },
          },
        })
      }
      return saved
    })
    const ready = await prisma.interview.findUnique({
      where: { id: params.id },
      include: { panelMembers: { where: { panelRole: 'CHAIR' }, select: { userId: true } } },
    })
    if (ready?.panelReadyAt && !ready.panelConfirmedAt) {
      const chair = ready.panelMembers[0]
      await prisma.workItem.upsert({
        where: { deduplicationKey: `interview-panel-confirm:${ready.id}` },
        update: {
          status: 'OPEN',
          assignedUserId: chair?.userId || null,
          assignedRole: chair ? null : 'HR_MANAGER',
          priority: ready.varianceFlag ? 'HIGH' : 'NORMAL',
        },
        create: {
          deduplicationKey: `interview-panel-confirm:${ready.id}`,
          workType: 'INTERVIEW_PANEL_CONFIRMATION',
          title: ready.varianceFlag
            ? 'Review panel score variance and confirm outcome'
            : 'Confirm completed panel scorecards',
          description: ready.varianceFlag
            ? 'Panel scores differ by at least 25 percentage points. Review the evidence before confirming.'
            : 'All independent scorecards are complete. The panel chair must confirm the outcome.',
          assignedUserId: chair?.userId || null,
          assignedRole: chair ? null : 'HR_MANAGER',
          createdBy: user.userId,
          resourceType: 'Interview',
          resourceId: ready.id,
          applicationId: ready.applicationId,
          priority: ready.varianceFlag ? 'HIGH' : 'NORMAL',
        },
      })
      if (chair)
        await createNotification({
          userId: chair.userId,
          type: `INTERVIEW_PANEL_CONFIRMATION:${ready.id}`,
          title: ready.varianceFlag ? 'Interview scores need careful review' : 'Interview outcome ready to confirm',
          body: ready.varianceFlag
            ? 'All scorecards are in, but the scores differ substantially. Review the evidence and confirm the panel outcome.'
            : 'All panel members have submitted. Review and confirm the panel outcome.',
        })
    }

    await logAudit({
      actorUserId: user.userId,
      action: 'INTERVIEW_SCORE_SUBMITTED',
      resourceType: 'InterviewPanelSubmission',
      resourceId: submission.id,
      newValue: { totalScore: computedScore, recommendation },
    })

    return NextResponse.json({ submission })
  } catch (err) {
    if (err instanceof Error && err.message === 'SCORE_LOCKED')
      return NextResponse.json({ error: 'This independent panel score is locked after submission' }, { status: 409 })
    return authzResponse(err)
  }
}
