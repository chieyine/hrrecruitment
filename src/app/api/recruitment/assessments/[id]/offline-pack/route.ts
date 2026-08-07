import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { textPdf } from '@/lib/simple-pdf'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const user = await requirePermission('assessment.manage')
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        vacancy: { select: { title: true, referenceNumber: true } },
        questions: { orderBy: { displayOrder: 'asc' } },
        candidateAssessments: {
          include: { application: { include: { candidate: { include: { user: true } } } } },
          orderBy: { invitedAt: 'asc' },
        },
      },
    })
    if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

    const roster = assessment.candidateAssessments.map((record, index) => {
      const candidate = record.application.candidate
      const name = `${candidate.legalFirstName || ''} ${candidate.lastName || ''}`.trim() || candidate.user?.email || 'Candidate'
      return `${index + 1}. ${name} | record ${record.id} | attendance: __________ | script: __________ | score: _____ / 100 | signature: __________`
    })
    const criteria = assessment.questions.map(
      (question, index) => `${index + 1}. ${question.prompt} (maximum ${question.maximumScore})\nNotes: ______________________________________________________________________`
    )
    const pdf = textPdf(`${assessment.title} - controlled offline pack`, [
      `Vacancy: ${assessment.vacancy.title} (${assessment.vacancy.referenceNumber})`,
      `Assessment ID: ${assessment.id}. Type: ${assessment.type}. Duration: ${assessment.durationMinutes} minutes. Pass mark: ${assessment.passMark}%.`,
      assessment.description || 'No additional instructions.',
      'CONTROL NOTICE: Keep this pack confidential. Confirm candidate identity, record attendance, retain signed evidence, and upload results through the controlled batch-import preview.',
      'Candidate attendance and score register',
      ...(roster.length ? roster : ['No candidates have been invited.']),
      'Questions / marking criteria',
      ...(criteria.length ? criteria : ['No questions or criteria have been configured.']),
      'Invigilator / assessor: ____________________  Venue: ____________________  Date/time: ____________________',
    ])
    await logAudit({
      actorUserId: user.userId,
      action: 'OFFLINE_ASSESSMENT_PACK_DOWNLOADED',
      resourceType: 'Assessment',
      resourceId: assessment.id,
      newValue: { candidateCount: roster.length },
    })
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="assessment-${assessment.id}-offline-pack.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return authzResponse(error)
  }
}
