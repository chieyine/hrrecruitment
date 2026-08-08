import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, requireRole, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { canTransitionVacancy } from '@/lib/state-machine'
import { logAudit } from '@/lib/audit'
import { findIndependentApprover } from '@/lib/approvals'
import { canMakeHrManagerDecision } from '@/lib/recruitment-role-policy'
import { validateEmergencyAdvertPeriod } from '@/lib/emergency-recruitment'

const schema = z.object({
  action: z.enum([
    'SUBMIT_APPROVAL',
    'PUBLISH',
    'PAUSE',
    'RESUME',
    'EXTEND',
    'CLOSE',
    'CANCEL',
    'DUPLICATE',
    // §28.7 approving the accelerated route is its own decision, separate from
    // approving the vacancy content.
    'APPROVE_EMERGENCY',
  ]),
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
    let automaticallyApproved = false
    if (input.action === 'SUBMIT_APPROVAL') {
      if (vacancy.ownerUserId !== user.userId && !canMakeHrManagerDecision(user.roles))
        return NextResponse.json(
          { error: 'Only the vacancy owner or an HR manager can submit this draft' },
          { status: 403 }
        )
      if (!canTransitionVacancy(vacancy.status, 'PENDING_APPROVAL'))
        return NextResponse.json({ error: `Cannot submit from ${vacancy.status}` }, { status: 422 })
      if (!vacancy.preboardingPackageId)
        return NextResponse.json(
          { error: 'Choose the preboarding package candidates will receive after accepting an offer' },
          { status: 422 }
        )
      const autoApprove = user.roles.includes('HR_MANAGER') && vacancy.ownerUserId === user.userId
      automaticallyApproved = autoApprove
      const approverUserId = autoApprove ? user.userId : await findIndependentApprover(user.userId, ['HR_MANAGER'])
      result = await prisma.$transaction([
        prisma.vacancy.update({
          where: { id: vacancy.id },
          data: {
            status: autoApprove ? 'APPROVED' : 'PENDING_APPROVAL',
            ...(autoApprove && vacancy.emergencyRecruitment
              ? { emergencyApprovedBy: user.userId, emergencyApprovedAt: new Date() }
              : {}),
          },
        }),
        prisma.approval.create({
          data: {
            resourceType: 'VACANCY',
            resourceId: vacancy.id,
            stage: 1,
            approverUserId,
            requestedBy: user.userId,
            decision: autoApprove ? 'APPROVED' : 'PENDING',
            decidedAt: autoApprove ? new Date() : null,
            comment: autoApprove ? 'Automatically approved under the single HR Manager operating model.' : null,
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

      // §7.1 Pre-publication checks. Each of these is a condition the spec
      // states must be confirmed before a vacancy may go live.
      const blockers: string[] = []

      if (!vacancy.staffingRequestId) {
        blockers.push('Link the approved staffing request this vacancy comes from')
      } else {
        const staffingRequest = await prisma.staffingRequest.findUnique({
          where: { id: vacancy.staffingRequestId },
          select: {
            status: true,
            fundingConfirmations: {
              where: { supersededAt: null },
              orderBy: { decidedAt: 'desc' },
              take: 1,
              select: { decision: true },
            },
          },
        })
        if (staffingRequest?.status !== 'APPROVED_FOR_VACANCY')
          blockers.push('The staffing request must be approved for vacancy preparation')
        if (staffingRequest?.fundingConfirmations[0]?.decision !== 'CONFIRMED')
          blockers.push('The Budget Holder must have confirmed funding')
      }

      // §7.1 longlisting rules and the shortlisting matrix must both exist.
      const mandatoryRules = await prisma.eligibilityRule.count({
        where: { vacancyId: vacancy.id, active: true, classification: 'MANDATORY_KNOCKOUT' },
      })
      if (!mandatoryRules) blockers.push('Define at least one mandatory longlisting rule')
      if (!vacancy.screeningScorecardTemplateId) blockers.push('Choose the shortlisting criteria (screening scorecard)')
      if (!vacancy.interviewScorecardTemplateId) blockers.push('Choose the interview scoring structure')
      if (!vacancy.questions.length) blockers.push('Add at least one application question')
      if (!vacancy.safeguardingClassification) blockers.push('Set the safeguarding classification')
      if (!vacancy.recruitmentContactEmail?.trim()) blockers.push('Provide a recruitment contact email')

      // §28.7 An emergency route is faster, not unapproved. It needs a written
      // justification, an authorised approver, and a real advertising window.
      if (vacancy.emergencyRecruitment) {
        if (!vacancy.emergencyJustification?.trim())
          blockers.push('Record the justification for emergency recruitment')
        if (!vacancy.emergencyApprovedBy)
          blockers.push('Emergency classification must be approved before publication')
        const advertProblem = validateEmergencyAdvertPeriod(vacancy.openingAt, vacancy.closingAt)
        if (advertProblem) blockers.push(advertProblem)
      }

      if (blockers.length)
        return NextResponse.json(
          { error: `Cannot publish yet: ${blockers.join('; ')}`, blockers },
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
      // §11.7 publication locks the longlisting rules. From here a change is a
      // proposal requiring HR Manager approval and, once applications arrive, a
      // fairness review.
      result = await prisma.vacancy.update({
        where: { id: vacancy.id },
        data: { status, longlistingRulesLockedAt: vacancy.longlistingRulesLockedAt ?? new Date() },
      })
    } else if (input.action === 'APPROVE_EMERGENCY') {
      // §28.7 / §3.9 The accelerated route is an exception, so it is approved by
      // an HR manager and never by the person who requested it.
      if (!canMakeHrManagerDecision(user.roles))
        return NextResponse.json(
          { error: 'Only an HR manager may approve emergency recruitment' },
          { status: 403 }
        )
      if (!vacancy.emergencyRecruitment)
        return NextResponse.json({ error: 'This vacancy is not marked as emergency recruitment' }, { status: 422 })
      if (!vacancy.emergencyJustification?.trim())
        return NextResponse.json({ error: 'Record the emergency justification first' }, { status: 422 })
      if (vacancy.ownerUserId === user.userId && !user.roles.includes('HR_MANAGER'))
        return NextResponse.json(
          { error: 'You cannot approve the emergency route for a vacancy you own' },
          { status: 403 }
        )
      result = await prisma.vacancy.update({
        where: { id: vacancy.id },
        data: { emergencyApprovedBy: user.userId, emergencyApprovedAt: new Date() },
      })
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
    if (automaticallyApproved)
      await logAudit({ actorUserId: user.userId, action: 'VACANCY_AUTO_APPROVED', resourceType: 'Vacancy', resourceId: vacancy.id, reason: 'Single HR Manager operating model' })
    return NextResponse.json({ success: true, result, automaticallyApproved })
  } catch (err) {
    return authzResponse(err)
  }
}
