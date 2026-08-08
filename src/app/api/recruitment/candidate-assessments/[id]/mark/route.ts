import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { requireOpenRecruitmentFile } from '@/lib/recruitment-file'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('assessment.manage')
    const input = await parseBody(
      request,
      z.object({
        score: z.coerce.number().min(0).max(100).optional(),
        comment: z.string().max(2000).optional(),
        offlineRecord: z
          .object({
            venue: z.string().trim().min(1).max(300),
            assessedAt: z.coerce.date(),
            attendance: z.enum(['ATTENDED', 'LATE', 'ABSENT']),
            invigilator: z.string().trim().min(1).max(200),
            scriptReference: z.string().trim().max(200).optional(),
            scoreSheetFileId: z.string().optional(),
          })
          .optional(),
      })
    )
    const record = await prisma.candidateAssessment.findUnique({
      where: { id: params.id },
      include: { assessment: { include: { questions: true } }, answers: true, application: true },
    })
    if (!record) return NextResponse.json({ error: 'Candidate assessment not found' }, { status: 404 })
    if (record.assignedReviewerUserId && record.assignedReviewerUserId !== user.userId)
      throw new AuthzError('This assessment is assigned to another reviewer', 403)
    requireOpenRecruitmentFile(record.application.internalStatus)
    const offlineTypes = new Set(['OFFLINE_WRITTEN', 'PRACTICAL', 'PRESENTATION', 'DRIVING_TEST', 'SIMULATION'])
    const isOffline = offlineTypes.has(record.assessment.type)
    const canRecordOffline =
      isOffline && ['INVITED', 'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(record.status)
    if (!canRecordOffline && !['SUBMITTED', 'AUTO_SUBMITTED'].includes(record.status))
      return NextResponse.json({ error: 'Assessment is not awaiting marking' }, { status: 409 })
    if (isOffline && (!input.comment || input.comment.trim().length < 10)) {
      return NextResponse.json(
        { error: 'Marker evidence of at least 10 characters is required for an offline assessment' },
        { status: 400 }
      )
    }
    if (isOffline && !input.offlineRecord)
      return NextResponse.json({ error: 'Complete the offline assessment record' }, { status: 400 })
    if (isOffline && input.score === undefined)
      return NextResponse.json({ error: 'Enter the assessment score' }, { status: 400 })
    if (
      input.offlineRecord?.scoreSheetFileId &&
      !(await prisma.fileAsset.findFirst({
        where: { id: input.offlineRecord.scoreSheetFileId, ownerUserId: user.userId, virusScanStatus: 'CLEAN' },
      }))
    )
      return NextResponse.json({ error: 'The score sheet is unavailable or unsafe' }, { status: 400 })
    let finalScore = input.score
    if (!isOffline) {
      const scoreByQuestion = new Map(record.answers.map((answer) => [answer.assessmentQuestionId, answer.score]))
      const unmarked = record.assessment.questions.find((question) => scoreByQuestion.get(question.id) == null)
      if (unmarked)
        return NextResponse.json(
          { error: 'Finish marking every question before recording the outcome' },
          { status: 409 }
        )
      const maximum = record.assessment.questions.reduce((sum, question) => sum + question.maximumScore, 0)
      if (maximum <= 0) return NextResponse.json({ error: 'The assessment has no available marks' }, { status: 409 })
      const awarded = record.assessment.questions.reduce(
        (sum, question) => sum + (scoreByQuestion.get(question.id) || 0),
        0
      )
      finalScore = Math.round((awarded / maximum) * 10_000) / 100
    }
    if (finalScore === undefined)
      return NextResponse.json({ error: 'The assessment score is required' }, { status: 400 })
    const passed = finalScore >= record.assessment.passMark
    await prisma.$transaction(async (tx) => {
      const marked = await tx.candidateAssessment.updateMany({
        where: { id: record.id, status: record.status },
        data: {
          score: finalScore,
          passed,
          status: 'AWAITING_APPROVAL',
          markerUserId: user.userId,
          markerComment: input.comment || null,
          offlineRecordJson: input.offlineRecord ? JSON.stringify(input.offlineRecord) : null,
        },
      })
      if (marked.count !== 1) throw new Error('ASSESSMENT_CHANGED')
      await tx.application.update({ where: { id: record.applicationId }, data: { candidateVisibleStatus: 'ASSESSMENT_COMPLETED' } })
    })
    await logAudit({
      actorUserId: user.userId,
      action: 'ASSESSMENT_MARKED_PENDING_APPROVAL',
      resourceType: 'CandidateAssessment',
      resourceId: record.id,
      newValue: { score: finalScore, passed },
    })
    return NextResponse.json({ success: true, score: finalScore, passed, awaitingApproval: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'ASSESSMENT_CHANGED')
      return NextResponse.json({ error: 'Assessment was already marked; refresh and try again' }, { status: 409 })
    return authzResponse(err)
  }
}
