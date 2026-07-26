import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requirePermission('assessment.manage')
    const { applicationIds } = await parseBody(request, z.object({ applicationIds: z.array(z.string().min(1)).min(1) }))
    const assessment = await prisma.assessment.findUnique({ where: { id: params.id } }); if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    const applications = await prisma.application.findMany({ where: { id: { in: applicationIds }, vacancyId: assessment.vacancyId, internalStatus: { in: ['SHORTLISTED', 'ASSESSMENT_INVITED'] } }, include: { candidate: true } })
    if (applications.length !== applicationIds.length) return NextResponse.json({ error: 'One or more applications are not eligible for this assessment' }, { status: 422 })
    for (const application of applications) {
      const existing = await prisma.candidateAssessment.findFirst({ where: { applicationId: application.id, assessmentId: assessment.id } })
      if (!existing) await prisma.candidateAssessment.create({ data: { applicationId: application.id, assessmentId: assessment.id, status: 'INVITED' } })
      await prisma.application.update({ where: { id: application.id }, data: { internalStatus: 'ASSESSMENT_INVITED', candidateVisibleStatus: 'ASSESSMENT_INVITED' } })
      if (application.candidate.userId) await createNotification({ userId: application.candidate.userId, type: 'ASSESSMENT_INVITED', title: 'Assessment invitation', body: `You have been invited to complete ${assessment.title}.` })
    }
    await logAudit({ actorUserId: user.userId, action: 'ASSESSMENT_INVITATIONS_SENT', resourceType: 'Assessment', resourceId: assessment.id, newValue: { applicationIds } })
    return NextResponse.json({ success: true, invited: applications.length })
  } catch (err) { return authzResponse(err) }
}
