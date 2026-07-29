import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, requireRole, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { canTransitionVacancy } from '@/lib/state-machine'
import { logAudit } from '@/lib/audit'
import { findIndependentApprover } from '@/lib/approvals'
import { canMakeHrManagerDecision } from '@/lib/recruitment-role-policy'

const schema = z.object({
  action: z.enum(['SUBMIT_APPROVAL', 'PUBLISH', 'PAUSE', 'RESUME', 'EXTEND', 'CLOSE', 'CANCEL', 'DUPLICATE']),
  reason: z.string().max(2000).optional(),
  closingAt: z.coerce.date().optional(),
  referenceNumber: z.string().trim().max(80).optional(),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('vacancy.update.all')
    const input = await parseBody(request, schema)
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: params.id },
      include: { questions: true, requiredDocuments: true },
    })
    if (!vacancy) return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 })

    let result: unknown
    if (input.action === 'SUBMIT_APPROVAL') {
      if (vacancy.ownerUserId !== user.userId && !canMakeHrManagerDecision(user.roles))
        return NextResponse.json(
          { error: 'Only the vacancy owner or an HR manager can submit this draft' },
          { status: 403 }
        )
      const approverUserId = await findIndependentApprover(user.userId, ['HR_MANAGER'])
      if (!canTransitionVacancy(vacancy.status, 'PENDING_APPROVAL'))
        return NextResponse.json({ error: `Cannot submit from ${vacancy.status}` }, { status: 422 })
      if (!vacancy.preboardingPackageId)
        return NextResponse.json(
          { error: 'Choose the preboarding package candidates will receive after accepting an offer' },
          { status: 422 }
        )
      result = await prisma.$transaction([
        prisma.vacancy.update({ where: { id: vacancy.id }, data: { status: 'PENDING_APPROVAL' } }),
        prisma.approval.create({
          data: {
            resourceType: 'VACANCY',
            resourceId: vacancy.id,
            stage: 1,
            approverUserId,
            requestedBy: user.userId,
            decision: 'PENDING',
          },
        }),
      ])
    } else if (input.action === 'PUBLISH') {
      const approval = await prisma.approval.findFirst({
        where: {
          resourceType: 'VACANCY',
          resourceId: vacancy.id,
          decision: { in: ['APPROVED', 'APPROVED_WITH_CONDITIONS'] },
        },
      })
      if (!approval)
        return NextResponse.json({ error: 'Vacancy approval is required before publication' }, { status: 409 })
      if (
        !vacancy.referenceNumber.trim() ||
        !vacancy.title.trim() ||
        !vacancy.summary.trim() ||
        !vacancy.responsibilities.trim() ||
        !vacancy.essentialQualifications.trim() ||
        vacancy.numberOfPositions < 1 ||
        vacancy.closingAt <= vacancy.openingAt
      )
        return NextResponse.json(
          { error: 'Complete all mandatory vacancy details before publication' },
          { status: 422 }
        )
      if (vacancy.screeningScorecardTemplateId) {
        const scorecard = await prisma.scorecardTemplate.findUnique({
          where: { id: vacancy.screeningScorecardTemplateId },
          include: { criteria: true },
        })
        const maximum = scorecard?.criteria.reduce((sum, criterion) => sum + criterion.maximumScore, 0) || 0
        if (Math.abs(maximum - 100) > 0.001)
          return NextResponse.json(
            { error: `Screening scorecard maximum scores must total 100; current total is ${maximum}` },
            { status: 422 }
          )
      }
      const status = vacancy.openingAt > new Date() ? 'SCHEDULED' : 'OPEN'
      if (!canTransitionVacancy(vacancy.status, status))
        return NextResponse.json({ error: `Cannot publish from ${vacancy.status}` }, { status: 422 })
      result = await prisma.vacancy.update({ where: { id: vacancy.id }, data: { status } })
    } else if (input.action === 'EXTEND') {
      if (!input.closingAt || input.closingAt <= vacancy.closingAt)
        return NextResponse.json({ error: 'A later closing date is required' }, { status: 400 })
      if (!input.reason?.trim())
        return NextResponse.json({ error: 'A deadline extension reason is required' }, { status: 400 })
      result = await prisma.vacancy.update({ where: { id: vacancy.id }, data: { closingAt: input.closingAt } })
    } else if (input.action === 'DUPLICATE') {
      const referenceNumber =
        input.referenceNumber || `${vacancy.referenceNumber}-COPY-${Date.now().toString().slice(-6)}`
      result = await prisma.vacancy.create({
        data: {
          referenceNumber,
          title: `${vacancy.title} (Copy)`,
          departmentId: vacancy.departmentId,
          projectId: vacancy.projectId,
          dutyStationId: vacancy.dutyStationId,
          numberOfPositions: vacancy.numberOfPositions,
          contractType: vacancy.contractType,
          contractDuration: vacancy.contractDuration,
          reportingLine: vacancy.reportingLine,
          summary: vacancy.summary,
          responsibilities: vacancy.responsibilities,
          essentialQualifications: vacancy.essentialQualifications,
          desirableQualifications: vacancy.desirableQualifications,
          minimumExperienceYears: vacancy.minimumExperienceYears,
          desiredExperience: vacancy.desiredExperience,
          languageRequirements: vacancy.languageRequirements,
          technicalSkills: vacancy.technicalSkills,
          behaviouralCompetencies: vacancy.behaviouralCompetencies,
          safeguardingResponsibilities: vacancy.safeguardingResponsibilities,
          travelRequirement: vacancy.travelRequirement,
          openingAt: new Date(),
          closingAt: new Date(Date.now() + 30 * 86_400_000),
          status: 'DRAFT',
          ownerUserId: user.userId,
          screeningScorecardTemplateId: vacancy.screeningScorecardTemplateId,
          interviewScorecardTemplateId: vacancy.interviewScorecardTemplateId,
          preboardingPackageId: vacancy.preboardingPackageId,
          questions: {
            create: vacancy.questions.map((q) => ({
              fieldType: q.fieldType,
              label: q.label,
              helpText: q.helpText,
              required: q.required,
              configurationJson: q.configurationJson,
              conditionJson: q.conditionJson,
              displayOrder: q.displayOrder,
            })),
          },
          requiredDocuments: {
            create: vacancy.requiredDocuments.map((d) => ({
              documentType: d.documentType,
              required: d.required,
              allowedFileTypes: d.allowedFileTypes,
              maximumFileSize: d.maximumFileSize,
              expiryRequired: d.expiryRequired,
            })),
          },
        },
      })
    } else {
      const target: Record<string, string> = { PAUSE: 'PAUSED', RESUME: 'OPEN', CLOSE: 'CLOSED', CANCEL: 'CANCELLED' }
      const status = target[input.action]
      if (input.action === 'CANCEL') await requireRole('HR_MANAGER')
      if (!canTransitionVacancy(vacancy.status, status))
        return NextResponse.json({ error: `Cannot transition ${vacancy.status} to ${status}` }, { status: 422 })
      if (input.action === 'CANCEL' && !input.reason?.trim())
        return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 })
      if (input.action === 'PAUSE' && !input.reason?.trim())
        return NextResponse.json({ error: 'A reason is required to pause applications' }, { status: 400 })
      result = await prisma.vacancy.update({ where: { id: vacancy.id }, data: { status } })
    }

    await logAudit({
      actorUserId: user.userId,
      action: `VACANCY_${input.action}`,
      resourceType: 'Vacancy',
      resourceId: vacancy.id,
      previousValue: { status: vacancy.status, closingAt: vacancy.closingAt },
      newValue: result,
      reason: input.reason,
    })
    return NextResponse.json({ success: true, result })
  } catch (err) {
    return authzResponse(err)
  }
}
