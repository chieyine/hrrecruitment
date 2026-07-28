import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { refreshApplicationFinalScore } from '@/lib/recruitment-scoring.server'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('assessment.manage')
    const input = await parseBody(
      request,
      z.object({
        score: z.coerce.number().min(0).max(100),
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
      include: { assessment: true },
    })
    if (!record) return NextResponse.json({ error: 'Candidate assessment not found' }, { status: 404 })
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
    if (
      input.offlineRecord?.scoreSheetFileId &&
      !(await prisma.fileAsset.findFirst({
        where: { id: input.offlineRecord.scoreSheetFileId, ownerUserId: user.userId, virusScanStatus: 'CLEAN' },
      }))
    )
      return NextResponse.json({ error: 'The score sheet is unavailable or unsafe' }, { status: 400 })
    const passed = input.score >= record.assessment.passMark
    await prisma.$transaction(async (tx) => {
      const marked = await tx.candidateAssessment.updateMany({
        where: { id: record.id, status: record.status },
        data: {
          score: input.score,
          passed,
          status: passed ? 'PASSED' : 'FAILED',
          markerUserId: user.userId,
          markerComment: input.comment || null,
          offlineRecordJson: input.offlineRecord ? JSON.stringify(input.offlineRecord) : null,
        },
      })
      if (marked.count !== 1) throw new Error('ASSESSMENT_CHANGED')
      await tx.application.update({
        where: { id: record.applicationId },
        data: {
          assessmentScore: input.score,
          internalStatus: 'ASSESSMENT_COMPLETED',
          candidateVisibleStatus: 'ASSESSMENT_COMPLETED',
        },
      })
    })
    await refreshApplicationFinalScore(record.applicationId)
    await logAudit({
      actorUserId: user.userId,
      action: 'ASSESSMENT_MARKED',
      resourceType: 'CandidateAssessment',
      resourceId: record.id,
      newValue: { score: input.score, passed },
    })
    return NextResponse.json({ success: true, score: input.score, passed })
  } catch (err) {
    if (err instanceof Error && err.message === 'ASSESSMENT_CHANGED')
      return NextResponse.json({ error: 'Assessment was already marked; refresh and try again' }, { status: 409 })
    return authzResponse(err)
  }
}
