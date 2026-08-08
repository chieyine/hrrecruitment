import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('assessment.manage')
    const { applicationIds, reviewerUserId } = await parseBody(request, z.object({ applicationIds: z.array(z.string().min(1)).min(1), reviewerUserId: z.string().uuid() }))
    const assessment = await prisma.assessment.findUnique({ where: { id: params.id } })
    if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    if (assessment.closesAt && assessment.closesAt <= new Date())
      return NextResponse.json({ error: 'This assessment has closed' }, { status: 409 })
    const reviewer = await prisma.user.findFirst({ where: { id: reviewerUserId, accountStatus: 'ACTIVE', userRoles: { some: { role: { name: { in: ['RECRUITMENT_OFFICER', 'HR_MANAGER', 'HIRING_MANAGER'] } } } } }, select: { id: true } })
    if (!reviewer) throw new AuthzError('Choose an active assessment reviewer', 422)
    const applications = await prisma.application.findMany({
      where: {
        id: { in: applicationIds },
        vacancyId: assessment.vacancyId,
        internalStatus: 'SHORTLISTED',
        candidateAssessments: { none: {} },
      },
      include: { candidate: true },
    })
    if (applications.length !== applicationIds.length)
      return NextResponse.json(
        { error: 'One or more applications are not eligible for this assessment' },
        { status: 422 }
      )
    await prisma.$transaction(async (tx) => {
      for (const application of applications) {
        await tx.candidateAssessment.create({
          data: { applicationId: application.id, assessmentId: assessment.id, status: 'INVITED', assignedReviewerUserId: reviewer.id },
        })
        const moved = await tx.application.updateMany({
          where: { id: application.id, internalStatus: 'SHORTLISTED' },
          data: {
            internalStatus: 'ASSESSMENT_INVITED',
            candidateVisibleStatus: 'ASSESSMENT_INVITED',
            lockVersion: { increment: 1 },
          },
        })
        if (moved.count !== 1) throw new AuthzError('An application changed; refresh and try again', 409)
      }
    })
    for (const application of applications) {
      if (application.candidate.userId)
        await createNotification({
          userId: application.candidate.userId,
          type: 'ASSESSMENT_INVITED',
          title: 'Assessment invitation',
          body: `You have been invited to complete ${assessment.title}.`,
        })
    }
    await logAudit({
      actorUserId: user.userId,
      action: 'ASSESSMENT_INVITATIONS_SENT',
      resourceType: 'Assessment',
      resourceId: assessment.id,
      newValue: { applicationIds, reviewerUserId },
    })
    return NextResponse.json({ success: true, invited: applications.length })
  } catch (err) {
    return authzResponse(err)
  }
}
