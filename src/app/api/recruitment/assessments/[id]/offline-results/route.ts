import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { refreshApplicationFinalScore } from '@/lib/recruitment-scoring.server'
import { requireOpenRecruitmentFile } from '@/lib/recruitment-file'

const rowSchema = z.object({
  candidateAssessmentId: z.string().min(1),
  score: z.coerce.number().min(0).max(100),
  attendance: z.enum(['ATTENDED', 'LATE', 'ABSENT']),
  comment: z.string().trim().min(10).max(2000),
  venue: z.string().trim().min(1).max(300),
  assessedAt: z.coerce.date(),
  invigilator: z.string().trim().min(1).max(200),
  scriptReference: z.string().trim().max(200).optional(),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const user = await requirePermission('assessment.manage')
    const input = await parseBody(
      request,
      z.object({ previewOnly: z.boolean().default(true), rows: z.array(rowSchema).min(1).max(500) })
    )
    const duplicateIds = input.rows.filter(
      (row, index) => input.rows.findIndex((candidate) => candidate.candidateAssessmentId === row.candidateAssessmentId) !== index
    )
    if (duplicateIds.length)
      return NextResponse.json({ error: 'The import contains duplicate candidate assessment IDs' }, { status: 422 })

    const records = await prisma.candidateAssessment.findMany({
      where: { id: { in: input.rows.map((row) => row.candidateAssessmentId) }, assessmentId: id },
      include: { assessment: true, application: true },
    })
    const byId = new Map(records.map((record) => [record.id, record]))
    const allowedTypes = new Set(['OFFLINE_WRITTEN', 'PRACTICAL', 'PRESENTATION', 'DRIVING_TEST', 'SIMULATION'])
    const results = input.rows.map((row) => {
      const record = byId.get(row.candidateAssessmentId)
      let error: string | null = null
      if (!record) error = 'Candidate is not assigned to this assessment'
      else if (!allowedTypes.has(record.assessment.type)) error = 'Assessment is not an offline assessment'
      else if (['TRANSFERRED_TO_ERP', 'ARCHIVED'].includes(record.application.internalStatus)) error = 'Recruitment file is read-only'
      else if (!['INVITED', 'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(record.status)) error = 'Outcome has already been recorded'
      return { candidateAssessmentId: row.candidateAssessmentId, valid: !error, error }
    })
    const invalid = results.filter((result) => !result.valid)
    if (input.previewOnly || invalid.length) {
      await logAudit({
        actorUserId: user.userId,
        action: 'OFFLINE_ASSESSMENT_RESULTS_PREVIEWED',
        resourceType: 'Assessment',
        resourceId: id,
        newValue: { requested: input.rows.length, valid: results.length - invalid.length, invalid: invalid.length },
      })
      return NextResponse.json({ preview: true, canApply: invalid.length === 0, results })
    }

    await prisma.$transaction(async (tx) => {
      for (const row of input.rows) {
        const record = byId.get(row.candidateAssessmentId)!
        requireOpenRecruitmentFile(record.application.internalStatus)
        const passed = row.score >= record.assessment.passMark
        const changed = await tx.candidateAssessment.updateMany({
          where: { id: record.id, status: record.status },
          data: {
            score: row.score,
            passed,
            status: passed ? 'PASSED' : 'FAILED',
            markerUserId: user.userId,
            markerComment: row.comment,
            offlineRecordJson: JSON.stringify({
              venue: row.venue,
              assessedAt: row.assessedAt,
              attendance: row.attendance,
              invigilator: row.invigilator,
              scriptReference: row.scriptReference,
            }),
          },
        })
        if (changed.count !== 1) throw new AuthzError('An assessment changed; preview the import again', 409)
        await tx.application.update({
          where: { id: record.applicationId },
          data: {
            assessmentScore: row.score,
            internalStatus: 'ASSESSMENT_COMPLETED',
            candidateVisibleStatus: 'ASSESSMENT_COMPLETED',
            lockVersion: { increment: 1 },
          },
        })
      }
    })
    for (const record of records) await refreshApplicationFinalScore(record.applicationId)
    await logAudit({
      actorUserId: user.userId,
      action: 'OFFLINE_ASSESSMENT_RESULTS_IMPORTED',
      resourceType: 'Assessment',
      resourceId: id,
      newValue: { imported: input.rows.length, candidateAssessmentIds: input.rows.map((row) => row.candidateAssessmentId) },
    })
    return NextResponse.json({ success: true, imported: input.rows.length })
  } catch (error) {
    return authzResponse(error)
  }
}
