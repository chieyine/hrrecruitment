import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { createNotification } from '@/lib/notifications'
import { enqueueEmail } from '@/lib/outbox'
import { logAudit } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'
import { assignedApplicationWhere } from '@/lib/recruitment-access'

export const dynamic = 'force-dynamic'

const actionSchema = z.enum(['ASSESSMENT_INVITE', 'INTERVIEW_INVITE', 'MESSAGE', 'ASSIGN_REVIEWER', 'REFERENCE_REMINDER', 'TALENT_POOL', 'EXPORT'])
const schema = z.object({
  action: actionSchema,
  applicationIds: z.array(z.string().min(1)).min(1).max(100),
  previewOnly: z.boolean().default(true),
  assessmentId: z.string().optional(),
  reviewerUserId: z.string().optional(),
  talentPoolId: z.string().optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().max(5000).optional(),
  reason: z.string().trim().min(3).max(1000),
})

export async function GET() {
  try {
    await requirePermission('application.stage.change')
    const [assessments, reviewers, talentPools] = await Promise.all([
      prisma.assessment.findMany({ select: { id: true, title: true, vacancyId: true }, orderBy: { title: 'asc' } }),
      prisma.user.findMany({ where: { accountStatus: 'ACTIVE', userRoles: { some: { role: { name: { in: ['RECRUITMENT_OFFICER', 'HR_MANAGER', 'HIRING_MANAGER'] } } } } }, select: { id: true, email: true }, orderBy: { email: 'asc' } }),
      prisma.talentPool.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
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
    if (input.action === 'ASSESSMENT_INVITE' && !input.assessmentId) throw new AuthzError('Choose an assessment', 400)
    if (input.action === 'ASSIGN_REVIEWER' && !input.reviewerUserId) throw new AuthzError('Choose a reviewer', 400)
    if (input.action === 'TALENT_POOL' && !input.talentPoolId) throw new AuthzError('Choose a talent pool', 400)
    if (input.action === 'MESSAGE' && (!input.subject || !input.message)) throw new AuthzError('Subject and message are required', 400)

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
          referees: { include: { requests: { where: { status: { in: ['PENDING', 'SENT'] } }, orderBy: { expiresAt: 'desc' }, take: 1 } } },
        },
      }),
      input.assessmentId ? prisma.assessment.findUnique({ where: { id: input.assessmentId } }) : null,
      input.reviewerUserId ? prisma.user.findUnique({ where: { id: input.reviewerUserId }, select: { id: true, email: true, accountStatus: true } }) : null,
      input.talentPoolId ? prisma.talentPool.findUnique({ where: { id: input.talentPoolId } }) : null,
    ])
    const found = new Set(applications.map((item) => item.id))
    const invalid: Array<{ id: string; candidate: string; vacancy: string; reason: string }> = input.applicationIds.filter((id) => !found.has(id)).map((id) => ({ id, candidate: 'Unknown record', vacancy: '', reason: 'Application not found or outside your access.' }))
    const eligible: typeof applications = []
    const now = new Date()
    for (const application of applications) {
      let reason = ''
      if (input.action === 'ASSESSMENT_INVITE') {
        if (!assessment) reason = 'Assessment not found.'
        else if (assessment.vacancyId !== application.vacancyId) reason = 'Assessment belongs to another vacancy.'
        else if (!['SHORTLISTED', 'ASSESSMENT_INVITED'].includes(application.internalStatus)) reason = `Stage ${application.internalStatus.replaceAll('_', ' ')} is not eligible for assessment.`
      } else if (input.action === 'INTERVIEW_INVITE') {
        if (!['SHORTLISTED', 'ASSESSMENT_COMPLETED', 'INTERVIEW_INVITED'].includes(application.internalStatus)) reason = `Stage ${application.internalStatus.replaceAll('_', ' ')} is not eligible for interview.`
        else if (!application.interviews[0]) reason = 'No interview has been scheduled for this candidate.'
      } else if (input.action === 'ASSIGN_REVIEWER') {
        if (!reviewer || reviewer.accountStatus !== 'ACTIVE') reason = 'Reviewer is not an active account.'
        else if (application.assignedReviewerId === reviewer.id) reason = 'This reviewer is already assigned.'
      } else if (input.action === 'REFERENCE_REMINDER') {
        const request = application.referees.flatMap((item) => item.requests).find((item) => item.expiresAt > now)
        if (!request) reason = 'No live outstanding reference request.'
      } else if (input.action === 'TALENT_POOL') {
        if (!pool?.active) reason = 'Talent pool is not active.'
        else if (!application.candidate.consentRecords.some((item) => item.consentType === 'TALENT_POOL' && item.decision && !item.withdrawnAt)) reason = 'Candidate has not consented to talent-pool contact.'
      }
      if (reason) invalid.push({ id: application.id, candidate: `${application.candidate.legalFirstName} ${application.candidate.lastName}`, vacancy: application.vacancy.referenceNumber, reason })
      else eligible.push(application)
    }

    const previewResult = {
      action: input.action,
      requested: input.applicationIds.length,
      eligible: eligible.map((item) => ({ id: item.id, candidate: `${item.candidate.legalFirstName} ${item.candidate.lastName}`, vacancy: item.vacancy.referenceNumber, status: item.internalStatus })),
      invalid,
    }
    if (input.previewOnly) {
      const run = await prisma.bulkActionRun.create({ data: { actionType: input.action, requestedBy: user.userId, requestedCount: input.applicationIds.length, eligibleCount: eligible.length, failedCount: invalid.length, status: 'PREVIEWED', requestJson: JSON.stringify(input), resultJson: JSON.stringify(previewResult) } })
      return Response.json({ ...previewResult, runId: run.id })
    }

    const failures = [...invalid]
    const undoRecords: Array<Record<string, unknown>> = []
    let completed = 0
    for (const application of eligible) {
      try {
        if (input.action === 'ASSESSMENT_INVITE' && assessment) {
          await prisma.$transaction(async (tx) => {
            const existing = await tx.candidateAssessment.findFirst({ where: { applicationId: application.id, assessmentId: assessment.id } })
            if (!existing) await tx.candidateAssessment.create({ data: { applicationId: application.id, assessmentId: assessment.id, status: 'INVITED' } })
            await tx.application.update({ where: { id: application.id }, data: { internalStatus: 'ASSESSMENT_INVITED', candidateVisibleStatus: 'ASSESSMENT_INVITED', lockVersion: { increment: 1 } } })
          })
          await createNotification({ userId: application.candidate.userId, type: 'ASSESSMENT_INVITED', title: 'Assessment invitation', body: `You have been invited to complete ${assessment.title}.` })
        } else if (input.action === 'INTERVIEW_INVITE') {
          const interview = application.interviews[0]
          await prisma.application.update({ where: { id: application.id }, data: { internalStatus: 'INTERVIEW_INVITED', candidateVisibleStatus: 'INTERVIEW_INVITED', lockVersion: { increment: 1 } } })
          await createNotification({ userId: application.candidate.userId, type: 'INTERVIEW_INVITED', title: 'Interview invitation', body: input.message || `You have been invited to ${interview.title} on ${interview.scheduledStart.toLocaleString('en-NG', { timeZone: interview.timezone })}.` })
        } else if (input.action === 'MESSAGE') {
          const thread = await prisma.messageThread.create({ data: { applicationId: application.id, subject: input.subject!, category: 'GENERAL' } })
          await prisma.message.create({ data: { messageThreadId: thread.id, senderUserId: user.userId, body: input.message! } })
          await createNotification({ userId: application.candidate.userId, type: 'MESSAGE_RECEIVED', title: input.subject!, body: input.message! })
        } else if (input.action === 'ASSIGN_REVIEWER' && reviewer) {
          undoRecords.push({ applicationId: application.id, previousReviewerId: application.assignedReviewerId })
          await prisma.application.update({ where: { id: application.id }, data: { assignedReviewerId: reviewer.id, lockVersion: { increment: 1 } } })
        } else if (input.action === 'REFERENCE_REMINDER') {
          const requestRecord = application.referees.flatMap((referee) => referee.requests.map((request) => ({ request, referee }))).find((item) => item.request.expiresAt > now)!
          await enqueueEmail({ recipient: requestRecord.referee.email, subject: 'Reminder: FRAD reference request', html: '<p>Please complete the confidential reference request using the original secure link before it expires.</p>', deduplicationKey: `manual-reference-reminder:${requestRecord.request.id}:${now.toISOString().slice(0, 13)}` })
          await prisma.referenceRequest.update({ where: { id: requestRecord.request.id }, data: { reminderSentAt: now } })
        } else if (input.action === 'TALENT_POOL' && pool) {
          const existingMember = await prisma.talentPoolMember.findUnique({ where: { talentPoolId_candidateId: { talentPoolId: pool.id, candidateId: application.candidateId } } })
          undoRecords.push({ talentPoolId: pool.id, candidateId: application.candidateId, existingMember })
          await prisma.talentPoolMember.upsert({ where: { talentPoolId_candidateId: { talentPoolId: pool.id, candidateId: application.candidateId } }, update: { status: 'ACTIVE', sourceApplicationId: application.id, addedBy: user.userId }, create: { talentPoolId: pool.id, candidateId: application.candidateId, sourceApplicationId: application.id, addedBy: user.userId } })
        }
        completed++
      } catch (error) {
        failures.push({ id: application.id, candidate: `${application.candidate.legalFirstName} ${application.candidate.lastName}`, vacancy: application.vacancy.referenceNumber, reason: error instanceof Error ? error.message : 'Action failed.' })
      }
    }
    const result = { success: failures.length === 0, completed, failures, undoRecords }
    const run = await prisma.bulkActionRun.create({ data: { actionType: input.action, requestedBy: user.userId, requestedCount: input.applicationIds.length, eligibleCount: eligible.length, failedCount: failures.length, status: failures.length ? (completed ? 'PARTIAL' : 'FAILED') : 'COMPLETED', requestJson: JSON.stringify(input), resultJson: JSON.stringify(result), reversibleUntil: ['ASSIGN_REVIEWER', 'TALENT_POOL'].includes(input.action) ? new Date(Date.now() + 15 * 60_000) : null } })
    await logAudit({ actorUserId: user.userId, action: `BULK_${input.action}`, resourceType: 'BulkActionRun', resourceId: run.id, reason: input.reason, newValue: result })
    return Response.json({ ...result, runId: run.id })
  } catch (error) {
    return authzResponse(error)
  }
}
