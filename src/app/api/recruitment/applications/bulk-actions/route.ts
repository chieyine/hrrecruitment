import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { createNotification } from '@/lib/notifications'
import { enqueueEmail, protectOutboxPayload } from '@/lib/outbox'
import { logAudit } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'
import { assignedApplicationWhere } from '@/lib/recruitment-access'
import { hasStaffRole } from '@/lib/roles'
import { generateToken, hashToken } from '@/lib/tokens'

export const dynamic = 'force-dynamic'

const actionSchema = z.enum([
  'ASSESSMENT_INVITE',
  'INTERVIEW_INVITE',
  'INTERVIEW_SCHEDULE',
  'MESSAGE',
  'ASSIGN_REVIEWER',
  'REFERENCE_REMINDER',
  'REFERENCE_REQUEST',
  'DOCUMENT_REQUEST',
  'ERP_TRANSFER',
  'TALENT_POOL',
  'EXPORT',
])
const schema = z.object({
  action: actionSchema,
  applicationIds: z.array(z.string().min(1)).min(1).max(100),
  previewOnly: z.boolean().default(true),
  assessmentId: z.string().optional(),
  reviewerUserId: z.string().optional(),
  talentPoolId: z.string().optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().max(5000).optional(),
  personnelNumbers: z.record(z.string(), z.string().trim().min(1).max(100)).optional(),
  interview: z
    .object({
      title: z.string().trim().min(1).max(200),
      firstStart: z.coerce.date(),
      durationMinutes: z.coerce.number().int().min(10).max(480),
      gapMinutes: z.coerce.number().int().min(0).max(240).default(0),
      timezone: z.string().trim().min(1).max(100).default('Africa/Lagos'),
      format: z.enum(['PHYSICAL', 'VIRTUAL', 'HYBRID']),
      venue: z.string().trim().max(500).optional(),
      meetingLink: z.string().url().optional().or(z.literal('')),
      instructions: z.string().max(5000).optional(),
      panelUserIds: z.array(z.string().min(1)).min(1).max(25),
      question: z.string().trim().min(1).max(1000),
      safeguardingQuestion: z.string().trim().min(1).max(1000),
    })
    .optional(),
  reason: z.string().trim().min(3).max(1000),
})

export async function GET() {
  try {
    await requirePermission('application.stage.change')
    const [assessments, reviewers, talentPools] = await Promise.all([
      prisma.assessment.findMany({ select: { id: true, title: true, vacancyId: true }, orderBy: { title: 'asc' } }),
      prisma.user.findMany({
        where: {
          accountStatus: 'ACTIVE',
          userRoles: { some: { role: { name: { in: ['RECRUITMENT_OFFICER', 'HR_MANAGER', 'HIRING_MANAGER'] } } } },
        },
        select: { id: true, email: true },
        orderBy: { email: 'asc' },
      }),
      prisma.talentPool.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ])
    return Response.json({ assessments, reviewers, talentPools })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('application.stage.change')
    const input = await parseBody(request, schema)
    const readAll = await hasPermission(user.userId, 'application.read.all')
    if (input.action === 'ERP_TRANSFER' && !(await hasPermission(user.userId, 'erp.transfer')))
      throw new AuthzError('ERP transfer permission is required', 403)
    if (input.action === 'ASSESSMENT_INVITE' && (!input.assessmentId || !input.reviewerUserId)) throw new AuthzError('Choose an assessment and assigned reviewer', 400)
    if (input.action === 'ASSIGN_REVIEWER' && !input.reviewerUserId) throw new AuthzError('Choose a reviewer', 400)
    if (input.action === 'TALENT_POOL' && !input.talentPoolId) throw new AuthzError('Choose a talent pool', 400)
    if (['MESSAGE', 'DOCUMENT_REQUEST'].includes(input.action) && (!input.subject || !input.message))
      throw new AuthzError('Subject and message are required', 400)
    if (input.action === 'ERP_TRANSFER' && !input.personnelNumbers)
      throw new AuthzError('Provide an ERP personnel number for each selected application', 400)
    if (input.action === 'INTERVIEW_SCHEDULE') {
      if (!input.interview) throw new AuthzError('Complete the interview schedule', 400)
      if (input.interview.firstStart <= new Date()) throw new AuthzError('Choose a future first interview time', 422)
      if (input.interview.format !== 'VIRTUAL' && !input.interview.venue)
        throw new AuthzError('A venue is required', 422)
      if (input.interview.format !== 'PHYSICAL' && !input.interview.meetingLink)
        throw new AuthzError('A meeting link is required', 422)
      const panelUsers = await prisma.user.findMany({
        where: { id: { in: input.interview.panelUserIds }, accountStatus: 'ACTIVE' },
        include: { userRoles: { include: { role: true } } },
      })
      if (
        panelUsers.length !== new Set(input.interview.panelUserIds).size ||
        panelUsers.some((member) => !hasStaffRole(member.userRoles.map((assignment) => assignment.role.name)))
      )
        throw new AuthzError('Every panel member must be an active staff account', 422)
    }

    const [applications, assessment, reviewer, pool] = await Promise.all([
      prisma.application.findMany({
        where: {
          id: { in: input.applicationIds },
          ...(readAll ? {} : assignedApplicationWhere(user.userId)),
        },
        include: {
          candidate: { include: { user: { select: { email: true } }, consentRecords: true } },
          vacancy: { select: { referenceNumber: true, title: true } },
          candidateAssessments: true,
          interviews: { where: { status: { not: 'CANCELLED' } }, orderBy: { scheduledStart: 'desc' }, take: 1 },
          referees: {
            include: {
              requests: { where: { status: { in: ['PENDING', 'SENT'] } }, orderBy: { expiresAt: 'desc' }, take: 1 },
            },
          },
          resumptionRecord: true,
          erpTransferRecord: true,
        },
      }),
      input.assessmentId ? prisma.assessment.findUnique({ where: { id: input.assessmentId } }) : null,
      input.reviewerUserId
        ? prisma.user.findUnique({
            where: { id: input.reviewerUserId },
            select: { id: true, email: true, accountStatus: true },
          })
        : null,
      input.talentPoolId ? prisma.talentPool.findUnique({ where: { id: input.talentPoolId } }) : null,
    ])
    const found = new Set(applications.map((item) => item.id))
    const invalid: Array<{ id: string; candidate: string; vacancy: string; reason: string }> = input.applicationIds
      .filter((id) => !found.has(id))
      .map((id) => ({
        id,
        candidate: 'Unknown record',
        vacancy: '',
        reason: 'Application not found or outside your access.',
      }))
    const eligible: typeof applications = []
    const now = new Date()
    for (const application of applications) {
      let reason = ''
      if (['TRANSFERRED_TO_ERP', 'ARCHIVED'].includes(application.internalStatus)) {
        reason = 'Recruitment file is read-only after ERP transfer.'
      } else if (input.action === 'ASSESSMENT_INVITE') {
        if (!assessment) reason = 'Assessment not found.'
        else if (assessment.vacancyId !== application.vacancyId) reason = 'Assessment belongs to another vacancy.'
        else if (!['SHORTLISTED', 'ASSESSMENT_INVITED'].includes(application.internalStatus))
          reason = `Stage ${application.internalStatus.replaceAll('_', ' ')} is not eligible for assessment.`
      } else if (input.action === 'INTERVIEW_INVITE') {
        if (!['SHORTLISTED', 'ASSESSMENT_COMPLETED', 'INTERVIEW_INVITED'].includes(application.internalStatus))
          reason = `Stage ${application.internalStatus.replaceAll('_', ' ')} is not eligible for interview.`
        else if (!application.interviews[0]) reason = 'No interview has been scheduled for this candidate.'
      } else if (input.action === 'INTERVIEW_SCHEDULE') {
        if (!['SHORTLISTED', 'ASSESSMENT_COMPLETED', 'INTERVIEW_INVITED'].includes(application.internalStatus))
          reason = `Stage ${application.internalStatus.replaceAll('_', ' ')} is not eligible for interview.`
        else if (application.interviews[0]) reason = 'An active interview is already scheduled.'
      } else if (input.action === 'ASSIGN_REVIEWER') {
        if (!reviewer || reviewer.accountStatus !== 'ACTIVE') reason = 'Reviewer is not an active account.'
        else if (application.assignedReviewerId === reviewer.id) reason = 'This reviewer is already assigned.'
      } else if (input.action === 'REFERENCE_REMINDER') {
        const request = application.referees.flatMap((item) => item.requests).find((item) => item.expiresAt > now)
        if (!request) reason = 'No live outstanding reference request.'
      } else if (input.action === 'REFERENCE_REQUEST') {
        const ready = application.referees.filter(
          (referee) =>
            referee.permissionToContact &&
            referee.contactStatus === 'READY' &&
            referee.preferredContactMethod !== 'PHONE'
        )
        if (!ready.length) reason = 'No authorised email referee is ready for contact.'
      } else if (input.action === 'TALENT_POOL') {
        if (!pool?.active) reason = 'Talent pool is not active.'
        else if (
          !application.candidate.consentRecords.some(
            (item) => item.consentType === 'TALENT_POOL' && item.decision && !item.withdrawnAt
          )
        )
          reason = 'Candidate has not consented to talent-pool contact.'
      } else if (input.action === 'ERP_TRANSFER') {
        if (!['RESUMED', 'READY_FOR_ERP_TRANSFER'].includes(application.internalStatus))
          reason = 'Candidate has not reached the ERP transfer stage.'
        else if (!application.resumptionRecord?.actualStartDate || application.resumptionRecord.outcome !== 'RESUMED')
          reason = 'Confirmed resumption is required.'
        else if (!application.erpTransferRecord?.approvedAt) reason = 'HR Manager transfer approval is required.'
        else if (application.erpTransferRecord.erpPersonnelNumber) reason = 'ERP personnel number is already recorded.'
        else if (!input.personnelNumbers?.[application.id]?.trim()) reason = 'ERP personnel number is missing.'
      }
      if (reason)
        invalid.push({
          id: application.id,
          candidate: `${application.candidate.legalFirstName} ${application.candidate.lastName}`,
          vacancy: application.vacancy.referenceNumber,
          reason,
        })
      else eligible.push(application)
    }

    const previewResult = {
      action: input.action,
      requested: input.applicationIds.length,
      eligible: eligible.map((item, index) => ({
        id: item.id,
        candidate: `${item.candidate.legalFirstName} ${item.candidate.lastName}`,
        vacancy: item.vacancy.referenceNumber,
        status: item.internalStatus,
        detail:
          input.action === 'INTERVIEW_SCHEDULE' && input.interview
            ? `Interview ${new Date(input.interview.firstStart.getTime() + index * (input.interview.durationMinutes + (input.interview.gapMinutes || 0)) * 60_000).toLocaleString('en-NG', { timeZone: input.interview.timezone })}`
            : input.action === 'ERP_TRANSFER'
              ? `Record ERP number ${input.personnelNumbers?.[item.id]}`
              : input.action === 'DOCUMENT_REQUEST' || input.action === 'MESSAGE'
                ? input.subject
                : input.action.replaceAll('_', ' ').toLowerCase(),
      })),
      invalid,
    }
    if (input.previewOnly) {
      const run = await prisma.bulkActionRun.create({
        data: {
          actionType: input.action,
          requestedBy: user.userId,
          requestedCount: input.applicationIds.length,
          eligibleCount: eligible.length,
          failedCount: invalid.length,
          status: 'PREVIEWED',
          requestJson: JSON.stringify(input),
          resultJson: JSON.stringify(previewResult),
        },
      })
      return Response.json({ ...previewResult, runId: run.id })
    }

    const failures = [...invalid]
    const undoRecords: Array<Record<string, unknown>> = []
    let completed = 0
    for (const [eligibleIndex, application] of eligible.entries()) {
      try {
        if (input.action === 'ASSESSMENT_INVITE' && assessment) {
          await prisma.$transaction(async (tx) => {
            const existing = await tx.candidateAssessment.findFirst({
              where: { applicationId: application.id, assessmentId: assessment.id },
            })
            if (!existing)
              await tx.candidateAssessment.create({
                data: { applicationId: application.id, assessmentId: assessment.id, status: 'INVITED', assignedReviewerUserId: reviewer!.id },
              })
            await tx.application.update({
              where: { id: application.id },
              data: {
                internalStatus: 'ASSESSMENT_INVITED',
                candidateVisibleStatus: 'ASSESSMENT_INVITED',
                lockVersion: { increment: 1 },
              },
            })
          })
          await createNotification({
            userId: application.candidate.userId,
            type: 'ASSESSMENT_INVITED',
            title: 'Assessment invitation',
            body: `You have been invited to complete ${assessment.title}.`,
          })
        } else if (input.action === 'INTERVIEW_INVITE') {
          const interview = application.interviews[0]
          await prisma.application.update({
            where: { id: application.id },
            data: {
              internalStatus: 'INTERVIEW_INVITED',
              candidateVisibleStatus: 'INTERVIEW_INVITED',
              lockVersion: { increment: 1 },
            },
          })
          await createNotification({
            userId: application.candidate.userId,
            type: 'INTERVIEW_INVITED',
            title: 'Interview invitation',
            body:
              input.message ||
              `You have been invited to ${interview.title} on ${interview.scheduledStart.toLocaleString('en-NG', { timeZone: interview.timezone })}.`,
          })
        } else if (input.action === 'INTERVIEW_SCHEDULE' && input.interview) {
          const start = new Date(
            input.interview.firstStart.getTime() +
              eligibleIndex * (input.interview.durationMinutes + (input.interview.gapMinutes || 0)) * 60_000
          )
          const end = new Date(start.getTime() + input.interview.durationMinutes * 60_000)
          const interview = await prisma.interview.create({
            data: {
              applicationId: application.id,
              title: input.interview.title,
              scheduledStart: start,
              scheduledEnd: end,
              timezone: input.interview.timezone,
              format: input.interview.format,
              venue: input.interview.venue || null,
              meetingLink: input.interview.meetingLink || null,
              instructions: input.interview.instructions || null,
              createdBy: user.userId,
              ...(user.roles.includes('HR_MANAGER')
                ? { panelApprovedAt: new Date(), panelApprovedBy: user.userId, panelApprovalComment: 'Automatically approved under the single HR Manager operating model.' }
                : {}),
              panelMembers: {
                create: input.interview.panelUserIds.map((userId, index) => ({
                  userId,
                  panelRole: index === 0 ? 'CHAIR' : 'MEMBER',
                })),
              },
              questions: {
                create: [
                  { question: input.interview.question, maximumScore: 80, displayOrder: 0 },
                  { question: input.interview.safeguardingQuestion, competency: 'Safeguarding', maximumScore: 20, displayOrder: 1, isSafeguarding: true },
                ],
              },
            },
          })
          await logAudit({
            actorUserId: user.userId,
            action: 'INTERVIEW_SCHEDULED',
            resourceType: 'Interview',
            resourceId: interview.id,
            reason: input.reason,
          })
          if (user.roles.includes('HR_MANAGER'))
            await logAudit({ actorUserId: user.userId, action: 'INTERVIEW_PANEL_AUTO_APPROVED', resourceType: 'Interview', resourceId: interview.id, reason: 'Single HR Manager operating model' })
        } else if (input.action === 'MESSAGE' || input.action === 'DOCUMENT_REQUEST') {
          const thread = await prisma.messageThread.create({
            data: {
              applicationId: application.id,
              subject: input.subject!,
              category: input.action === 'DOCUMENT_REQUEST' ? 'DOCUMENT_REQUEST' : 'GENERAL',
            },
          })
          await prisma.message.create({
            data: { messageThreadId: thread.id, senderUserId: user.userId, body: input.message! },
          })
          await createNotification({
            userId: application.candidate.userId,
            type: 'MESSAGE_RECEIVED',
            title: input.subject!,
            body: input.message!,
          })
        } else if (input.action === 'ASSIGN_REVIEWER' && reviewer) {
          undoRecords.push({ applicationId: application.id, previousReviewerId: application.assignedReviewerId })
          await prisma.application.update({
            where: { id: application.id },
            data: { assignedReviewerId: reviewer.id, lockVersion: { increment: 1 } },
          })
        } else if (input.action === 'REFERENCE_REMINDER') {
          const requestRecord = application.referees
            .flatMap((referee) => referee.requests.map((request) => ({ request, referee })))
            .find((item) => item.request.expiresAt > now)!
          await enqueueEmail({
            recipient: requestRecord.referee.email,
            subject: 'Reminder: FRAD reference request',
            html: '<p>Please complete the confidential reference request using the original secure link before it expires.</p>',
            deduplicationKey: `manual-reference-reminder:${requestRecord.request.id}:${now.toISOString().slice(0, 13)}`,
          })
          await prisma.referenceRequest.update({
            where: { id: requestRecord.request.id },
            data: { reminderSentAt: now },
          })
        } else if (input.action === 'REFERENCE_REQUEST') {
          const appUrl = process.env.APP_URL
          if (!appUrl) throw new Error('APP_URL is required to send reference-request links')
          const ready = application.referees.filter(
            (referee) =>
              referee.permissionToContact &&
              referee.contactStatus === 'READY' &&
              referee.preferredContactMethod !== 'PHONE'
          )
          for (const referee of ready) {
            const rawToken = generateToken()
            const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            const link = new URL(`/public/reference/${encodeURIComponent(rawToken)}`, appUrl).toString()
            await prisma.$transaction(async (tx) => {
              const created = await tx.referenceRequest.create({
                data: {
                  refereeId: referee.id,
                  secureTokenHash: hashToken(rawToken),
                  expiresAt,
                  sentAt: now,
                  status: 'SENT',
                },
              })
              await tx.outboxMessage.create({
                data: {
                  channel: 'EMAIL',
                  recipient: referee.email,
                  subject: 'Reference request for a FRAD candidate',
                  applicationId: application.id,
                  payloadJson: protectOutboxPayload({
                    html: `<p>Dear ${referee.name.replace(/[<>&"']/g, '')},</p><p>Please complete the confidential reference form:</p><p><a href="${link}">Complete reference</a> (link expires on ${expiresAt.toDateString()}).</p>`,
                  }),
                  deduplicationKey: `reference-request:${created.id}`,
                },
              })
            })
          }
        } else if (input.action === 'TALENT_POOL' && pool) {
          const existingMember = await prisma.talentPoolMember.findUnique({
            where: { talentPoolId_candidateId: { talentPoolId: pool.id, candidateId: application.candidateId } },
          })
          undoRecords.push({ talentPoolId: pool.id, candidateId: application.candidateId, existingMember })
          await prisma.talentPoolMember.upsert({
            where: { talentPoolId_candidateId: { talentPoolId: pool.id, candidateId: application.candidateId } },
            update: { status: 'ACTIVE', sourceApplicationId: application.id, addedBy: user.userId },
            create: {
              talentPoolId: pool.id,
              candidateId: application.candidateId,
              sourceApplicationId: application.id,
              addedBy: user.userId,
            },
          })
        } else if (input.action === 'ERP_TRANSFER' && application.erpTransferRecord) {
          const personnelNumber = input.personnelNumbers![application.id].trim()
          await prisma.$transaction(async (tx) => {
            const transitioned = await tx.application.updateMany({
              where: {
                id: application.id,
                internalStatus: { in: ['RESUMED', 'READY_FOR_ERP_TRANSFER'] },
                lockVersion: application.lockVersion,
              },
              data: {
                internalStatus: 'TRANSFERRED_TO_ERP',
                candidateVisibleStatus: 'RECRUITMENT_COMPLETED',
                preboardingStatus: 'COMPLETED',
                lockVersion: { increment: 1 },
              },
            })
            if (transitioned.count !== 1) throw new Error('Application changed after preview.')
            await tx.eRPTransferRecord.update({
              where: { id: application.erpTransferRecord!.id },
              data: {
                erpPersonnelNumber: personnelNumber,
                transferStatus: 'RECORDED',
                createdInErpAt: now,
                recordedBy: user.userId,
                comment: input.reason,
                status: 'CREATED_IN_ERP',
              },
            })
            await tx.applicationStageHistory.create({
              data: {
                applicationId: application.id,
                fromStatus: application.internalStatus,
                toStatus: 'TRANSFERRED_TO_ERP',
                changedBy: user.userId,
                reason: input.reason,
              },
            })
          })
        }
        completed++
      } catch (error) {
        failures.push({
          id: application.id,
          candidate: `${application.candidate.legalFirstName} ${application.candidate.lastName}`,
          vacancy: application.vacancy.referenceNumber,
          reason: error instanceof Error ? error.message : 'Action failed.',
        })
      }
    }
    const result = { success: failures.length === 0, completed, failures, undoRecords }
    const run = await prisma.bulkActionRun.create({
      data: {
        actionType: input.action,
        requestedBy: user.userId,
        requestedCount: input.applicationIds.length,
        eligibleCount: eligible.length,
        failedCount: failures.length,
        status: failures.length ? (completed ? 'PARTIAL' : 'FAILED') : 'COMPLETED',
        requestJson: JSON.stringify(input),
        resultJson: JSON.stringify(result),
        reversibleUntil: ['ASSIGN_REVIEWER', 'TALENT_POOL'].includes(input.action)
          ? new Date(Date.now() + 15 * 60_000)
          : null,
      },
    })
    await logAudit({
      actorUserId: user.userId,
      action: `BULK_${input.action}`,
      resourceType: 'BulkActionRun',
      resourceId: run.id,
      reason: input.reason,
      newValue: result,
    })
    return Response.json({ ...result, runId: run.id })
  } catch (error) {
    return authzResponse(error)
  }
}
