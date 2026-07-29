import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { recalculateApplicationReferenceStatus } from '@/lib/references'

const schema = z
  .object({
    name: z.string().trim().min(1),
    organization: z.string().trim().min(1),
    position: z.string().trim().min(1),
    relationship: z.string().trim().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    preferredContactMethod: z.enum(['EMAIL', 'PHONE']).default('EMAIL'),
    contactStatus: z.enum(['READY', 'UNABLE_TO_CONTACT', 'WAIVED']).default('READY'),
    waiverReason: z.string().trim().max(2000).optional(),
    periodKnown: z.string().optional(),
    permissionToContact: z.literal(true),
    manualOutcome: z.enum(['SATISFACTORY', 'SATISFACTORY_WITH_CONCERNS', 'UNSATISFACTORY']).optional(),
    manualComment: z.string().trim().max(3000).optional(),
  })
  .superRefine((input, context) => {
    if (input.manualOutcome && (!input.manualComment || input.manualComment.length < 10)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['manualComment'],
        message: 'A comment of at least 10 characters is required for a manually recorded reference',
      })
    }
    if (input.preferredContactMethod === 'PHONE' && !input.phone)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'A phone number is required when phone is the preferred contact method',
      })
    if (input.contactStatus === 'WAIVED' && (!input.waiverReason || input.waiverReason.length < 10))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['waiverReason'],
        message: 'Record the approved waiver reason (at least 10 characters)',
      })
  })
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requirePermission('reference.manage')
    const input = await parseBody(request, schema)
    if (input.contactStatus === 'WAIVED' && !user.roles.includes('HR_MANAGER'))
      return NextResponse.json({ error: 'Only an HR manager may approve a reference waiver' }, { status: 403 })
    const application = await prisma.application.findUnique({ where: { id: params.id } })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    const referee = await prisma.$transaction(async (tx) => {
      const created = await tx.referee.create({
        data: {
          applicationId: application.id,
          name: input.name,
          organization: input.organization,
          position: input.position,
          relationship: input.relationship,
          email: input.email,
          phone: input.phone || null,
          preferredContactMethod: input.preferredContactMethod,
          contactStatus: input.contactStatus,
          waiverReason: input.contactStatus === 'WAIVED' ? input.waiverReason : null,
          periodKnown: input.periodKnown || null,
          permissionToContact: input.permissionToContact,
        },
      })
      if (input.manualOutcome) {
        const requestRecord = await tx.referenceRequest.create({
          data: {
            refereeId: created.id,
            secureTokenHash: `manual:${crypto.randomUUID()}`,
            expiresAt: new Date(),
            status: 'COMPLETED',
            responseReceivedAt: new Date(),
          },
        })
        await tx.referenceResponse.create({
          data: {
            referenceRequestId: requestRecord.id,
            answersJson: '{}',
            outcome: input.manualOutcome,
            confidentialComment: input.manualComment || null,
            verifiedBy: user.userId,
            verifiedAt: new Date(),
          },
        })
      }
      await recalculateApplicationReferenceStatus(tx, application.id)
      if (
        !input.manualOutcome &&
        input.contactStatus !== 'WAIVED' &&
        application.internalStatus === 'INTERVIEW_COMPLETED'
      ) {
        await tx.application.update({
          where: { id: application.id },
          data: { internalStatus: 'REFERENCE_CHECK', candidateVisibleStatus: 'REFERENCE_CHECK' },
        })
        await tx.applicationStageHistory.create({
          data: {
            applicationId: application.id,
            fromStatus: application.internalStatus,
            toStatus: 'REFERENCE_CHECK',
            changedBy: user.userId,
            reason: 'Reference checking started',
          },
        })
      }
      return created
    })
    await logAudit({
      actorUserId: user.userId,
      action: input.manualOutcome
        ? 'REFERENCE_RECORDED_MANUALLY'
        : input.contactStatus === 'WAIVED'
          ? 'REFERENCE_WAIVED'
          : input.contactStatus === 'UNABLE_TO_CONTACT'
            ? 'REFERENCE_CONTACT_FAILED'
            : 'REFEREE_ADDED',
      resourceType: 'Referee',
      resourceId: referee.id,
      reason: input.waiverReason,
      newValue: { preferredContactMethod: input.preferredContactMethod, contactStatus: input.contactStatus },
    })
    return NextResponse.json({ success: true, referee })
  } catch (err) {
    return authzResponse(err)
  }
}
