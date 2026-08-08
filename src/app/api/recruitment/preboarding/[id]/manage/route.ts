import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { instantiatePreboardingPackage, refreshPreboardingProgress } from '@/lib/preboarding'
import { logAudit } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'
import { expectedVersion, staleRecord } from '@/lib/concurrency'
import { canMakeHrManagerDecision } from '@/lib/recruitment-role-policy'
import { requireOpenRecruitmentFile } from '@/lib/recruitment-file'

const schema = z.object({
  action: z.enum([
    'ASSIGN_PACKAGE',
    'ADD_DOCUMENT',
    'REVIEW_FORM',
    'REVIEW_DOCUMENT',
    'REVIEW_POLICY',
    'REVIEW_TASK',
    'REVIEW_COURSE',
    'ADD_INFORMATION',
    'ADD_MEETING',
    'UPDATE_MEETING',
  ]),
  resourceId: z.string().optional(),
  status: z.string().optional(),
  comment: z.string().trim().max(2000).optional(),
  data: z.record(z.string(), z.unknown()).optional().default({}),
  lockVersion: z.coerce.number().int().positive().optional(),
})

function requiredResource(value: string | undefined, message: string) {
  if (!value) throw new AuthzError(message, 400)
  return value
}

function requireUpdated(count: number, message: string) {
  if (count !== 1) throw new AuthzError(message, 409)
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('preboarding.manage')
    const input = await parseBody(request, schema)
    const managerWaiver =
      (input.action === 'REVIEW_COURSE' || input.action === 'UPDATE_MEETING') && input.status === 'WAIVED'
    if (managerWaiver && !canMakeHrManagerDecision(user.roles)) {
      throw new AuthzError('An HR manager must approve preboarding waivers', 403)
    }
    const data = input.data ?? {}
    const preboarding = await prisma.candidatePreboarding.findUnique({
      where: { id: params.id },
      include: { application: { select: { internalStatus: true } } },
    })
    if (!preboarding) throw new AuthzError('Preboarding record not found', 404)
    requireOpenRecruitmentFile(preboarding.application.internalStatus)
    if (['READY_TO_RESUME', 'COMPLETED'].includes(preboarding.status)) {
      throw new AuthzError('This preboarding record is closed', 409)
    }

    if (input.action === 'REVIEW_FORM' && input.resourceId) {
      const form = await prisma.candidatePreboardingForm.findFirst({
        where: { id: input.resourceId, candidatePreboardingId: preboarding.id },
        include: { formTemplate: { select: { sensitivityClass: true } } },
      })
      if (!form) throw new AuthzError('Form not found', 404)
      if (
        form.formTemplate.sensitivityClass === 'RESTRICTED' &&
        !(await hasPermission(user.userId, 'preboarding.restricted.read'))
      ) {
        throw new AuthzError('Restricted form permission is required', 403)
      }
    }

    const version = expectedVersion(request, input) ?? preboarding.lockVersion
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.candidatePreboarding.updateMany({
        where: { id: preboarding.id, lockVersion: version },
        data: { lockVersion: { increment: 1 } },
      })
      if (!claimed.count) staleRecord()

      if (input.action === 'ASSIGN_PACKAGE') {
        const packageId = requiredResource(input.resourceId, 'Package is required')
        const assigned = await instantiatePreboardingPackage(
          preboarding.id,
          preboarding.applicationId,
          user.userId,
          packageId,
          tx
        )
        if (!assigned) throw new AuthzError('Preboarding package not found', 404)
      } else if (input.action === 'ADD_DOCUMENT') {
        const requirementId = requiredResource(input.resourceId, 'Document requirement is required')
        const requirement = await tx.documentRequirement.findUnique({
          where: { id: requirementId },
          select: { id: true },
        })
        if (!requirement) throw new AuthzError('Document requirement not found', 404)
        await tx.candidateRequiredDocument.upsert({
          where: {
            candidatePreboardingId_documentRequirementId: {
              candidatePreboardingId: preboarding.id,
              documentRequirementId: requirementId,
            },
          },
          update: {},
          create: {
            candidatePreboardingId: preboarding.id,
            documentRequirementId: requirementId,
          },
        })
      } else if (input.action === 'REVIEW_FORM') {
        const resourceId = requiredResource(input.resourceId, 'Form is required')
        if (!['APPROVED', 'RETURNED'].includes(input.status || ''))
          throw new AuthzError('Valid form review is required', 400)
        const result = await tx.candidatePreboardingForm.updateMany({
          where: {
            id: resourceId,
            candidatePreboardingId: preboarding.id,
            status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'RETURNED'] },
          },
          data: {
            status: input.status,
            reviewedBy: user.userId,
            reviewedAt: new Date(),
            returnReason: input.status === 'RETURNED' ? input.comment || 'Please correct and resubmit.' : null,
          },
        })
        requireUpdated(result.count, 'The form is not awaiting review')
      } else if (input.action === 'REVIEW_DOCUMENT') {
        const resourceId = requiredResource(input.resourceId, 'Document is required')
        if (!['APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED'].includes(input.status || ''))
          throw new AuthzError('Valid document review is required', 400)
        const result = await tx.candidateRequiredDocument.updateMany({
          where: {
            id: resourceId,
            candidatePreboardingId: preboarding.id,
            status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'RESUBMISSION_REQUIRED'] },
          },
          data: {
            status: input.status,
            reviewedBy: user.userId,
            reviewedAt: new Date(),
            rejectionReason: ['REJECTED', 'RESUBMISSION_REQUIRED'].includes(input.status || '')
              ? input.comment || 'Please correct and resubmit.'
              : null,
          },
        })
        requireUpdated(result.count, 'The document is not awaiting review')
      } else if (input.action === 'REVIEW_POLICY') {
        const resourceId = requiredResource(input.resourceId, 'Policy acknowledgement is required')
        if (!['APPROVED', 'REJECTED'].includes(input.status || ''))
          throw new AuthzError('Valid policy review is required', 400)
        const result = await tx.candidatePolicyAcknowledgement.updateMany({
          where: {
            id: resourceId,
            candidatePreboardingId: preboarding.id,
            status: { in: ['SIGNED', 'REJECTED'] },
          },
          data: { status: input.status, reviewedBy: user.userId, reviewedAt: new Date() },
        })
        requireUpdated(result.count, 'The policy is not awaiting review')
      } else if (input.action === 'REVIEW_TASK') {
        const resourceId = requiredResource(input.resourceId, 'Task is required')
        if (!['APPROVED', 'RETURNED'].includes(input.status || ''))
          throw new AuthzError('Valid task review is required', 400)
        const result = await tx.candidatePreboardingTask.updateMany({
          where: {
            id: resourceId,
            candidatePreboardingId: preboarding.id,
            status: { in: ['SUBMITTED', 'RETURNED'] },
          },
          data: {
            status: input.status,
            reviewedBy: user.userId,
            reviewerComment: input.comment || null,
            completedAt: input.status === 'APPROVED' ? new Date() : null,
          },
        })
        requireUpdated(result.count, 'The task is not awaiting review')
      } else if (input.action === 'REVIEW_COURSE') {
        const resourceId = requiredResource(input.resourceId, 'Course is required')
        if (['APPROVED', 'REJECTED'].includes(input.status || '')) {
          const result = await tx.candidateCourse.updateMany({
            where: {
              id: resourceId,
              candidatePreboardingId: preboarding.id,
              status: 'CERTIFICATE_SUBMITTED',
              certificateFileId: { not: null },
            },
            data: {
              status: input.status === 'APPROVED' ? 'COMPLETED' : 'CERTIFICATE_REJECTED',
              completedAt: input.status === 'APPROVED' ? new Date() : null,
              certificateReviewedAt: new Date(),
              certificateReviewedBy: user.userId,
              certificateReviewComment: input.comment || null,
            },
          })
          requireUpdated(result.count, 'The course certificate is not awaiting review')
        } else if (input.status === 'RESET_ATTEMPTS') {
          if (!input.comment || input.comment.length < 5)
            throw new AuthzError('Record a reason for resetting attempts', 400)
          const result = await tx.candidateCourse.updateMany({
            where: {
              id: resourceId,
              candidatePreboardingId: preboarding.id,
              status: { notIn: ['COMPLETED', 'WAIVED'] },
            },
            data: { attempts: 0, status: 'NOT_STARTED' },
          })
          requireUpdated(result.count, 'Course not found or already closed')
        } else if (input.status === 'WAIVED') {
          if (!input.comment || input.comment.length < 5)
            throw new AuthzError('Record a reason for waiving this course', 400)
          const result = await tx.candidateCourse.updateMany({
            where: {
              id: resourceId,
              candidatePreboardingId: preboarding.id,
              status: { notIn: ['COMPLETED', 'WAIVED'] },
            },
            data: { status: 'WAIVED', completedAt: new Date() },
          })
          requireUpdated(result.count, 'Course not found or already closed')
        } else {
          throw new AuthzError('Valid course action is required', 400)
        }
      } else if (input.action === 'ADD_INFORMATION') {
        const title = String(data.title || '').trim()
        const content = String(data.content || '').trim()
        if (!title || !content) throw new AuthzError('Title and content are required', 400)
        if (title.length > 200 || content.length > 20_000) throw new AuthzError('Information item is too long', 400)
        await tx.candidateInformationItem.create({
          data: {
            candidatePreboardingId: preboarding.id,
            category: String(data.category || 'GENERAL').slice(0, 80),
            title,
            content,
            acknowledgementRequired: data.acknowledgementRequired !== false,
          },
        })
      } else if (input.action === 'ADD_MEETING') {
        const title = String(data.title || '').trim()
        const start = new Date(String(data.scheduledStart || ''))
        const end = new Date(String(data.scheduledEnd || ''))
        if (!title || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          throw new AuthzError('Meeting title and valid times are required', 400)
        }
        if (end <= start) throw new AuthzError('Meeting end must follow its start', 400)
        if (start <= new Date()) throw new AuthzError('Meeting start must be in the future', 400)
        if (title.length > 200) throw new AuthzError('Meeting title is too long', 400)
        const meetingLink = data.meetingLink ? String(data.meetingLink) : null
        if (meetingLink) {
          try {
            new URL(meetingLink)
          } catch {
            throw new AuthzError('Meeting link must be a valid URL', 400)
          }
        }
        await tx.preboardingMeeting.create({
          data: {
            candidatePreboardingId: preboarding.id,
            title,
            description: data.description ? String(data.description).slice(0, 5000) : null,
            facilitatorUserId: user.userId,
            scheduledStart: start,
            scheduledEnd: end,
            timezone: String(data.timezone || 'Africa/Lagos').slice(0, 100),
            venue: data.venue ? String(data.venue).slice(0, 500) : null,
            meetingLink,
            required: data.required !== false,
          },
        })
      } else {
        const meetingId = requiredResource(input.resourceId, 'Meeting is required')
        const status = z
          .enum(['SCHEDULED', 'CONFIRMED', 'ATTENDED', 'MISSED', 'CANCELLED', 'WAIVED'])
          .parse(input.status)
        const attendanceComment = String(input.comment || '').trim()
        if (['MISSED', 'CANCELLED', 'WAIVED'].includes(status) && attendanceComment.length < 5)
          throw new AuthzError('Record a reason for this meeting outcome', 400)
        const changed = await tx.preboardingMeeting.updateMany({
          where: { id: meetingId, candidatePreboardingId: preboarding.id },
          data: { status, attendanceComment: attendanceComment || null },
        })
        requireUpdated(changed.count, 'Meeting not found')
      }
    })

    await refreshPreboardingProgress(preboarding.id)
    await logAudit({
      actorUserId: user.userId,
      action: `PREBOARDING_${input.action}`,
      resourceType: 'CandidatePreboarding',
      resourceId: preboarding.id,
      newValue: { resourceId: input.resourceId, status: input.status },
    })
    return NextResponse.json({ success: true, lockVersion: version + 1 })
  } catch (error) {
    return authzResponse(error)
  }
}
