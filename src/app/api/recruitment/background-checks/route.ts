import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { canMakeHrManagerDecision } from '@/lib/recruitment-role-policy'
import {
  CHECK_TYPES,
  CHECK_STATUSES,
  isRestrictedCheck,
  requiresLawfulBasis,
  requiredChecksFor,
  minimalProviderPayload,
} from '@/lib/background-checks'
import { requireOpenRecruitmentFile } from '@/lib/recruitment-file'

/**
 * §16 / §28.11 Background and due-diligence checks.
 *
 * Findings are redacted for anyone without `backgroundcheck.read.restricted`.
 * That redaction happens here, on the server: a client that never receives the
 * text cannot leak it.
 */

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('SEED_REQUIRED'),
    applicationId: z.string().min(1),
  }),
  z.object({
    action: z.literal('REQUEST'),
    applicationId: z.string().min(1),
    checkType: z.enum(CHECK_TYPES),
    providerName: z.string().trim().max(200).optional().nullable(),
    providerReference: z.string().trim().max(200).optional().nullable(),
    lawfulBasis: z.string().trim().max(500).optional().nullable(),
  }),
  z.object({
    action: z.literal('RECORD_RESULT'),
    checkId: z.string().min(1),
    status: z.enum(CHECK_STATUSES),
    outcome: z.enum(['CLEAR', 'ADVERSE', 'INCONCLUSIVE']).optional().nullable(),
    findingSummary: z.string().trim().max(4000).optional().nullable(),
    restrictedNote: z.string().trim().max(4000).optional().nullable(),
    evidenceFileId: z.string().uuid().optional().nullable(),
    expiresAt: z.coerce.date().optional().nullable(),
  }),
  z.object({
    action: z.literal('WAIVE'),
    checkId: z.string().min(1),
    reason: z.string().trim().min(15, 'Explain why this check is being waived').max(2000),
  }),
])

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    if (!(await hasPermission(user.userId, 'backgroundcheck.manage'))) throw new AuthzError('Forbidden', 403)
    const canReadRestricted = await hasPermission(user.userId, 'backgroundcheck.read.restricted')

    const applicationId = new URL(request.url).searchParams.get('applicationId')

    const checks = await prisma.backgroundCheck.findMany({
      where: applicationId ? { applicationId } : {},
      orderBy: [{ applicationId: 'asc' }, { checkType: 'asc' }],
      take: 1000,
      select: {
        id: true,
        applicationId: true,
        checkType: true,
        status: true,
        providerName: true,
        providerReference: true,
        requestedBy: true,
        requestedAt: true,
        receivedAt: true,
        outcome: true,
        findingSummary: true,
        restrictedNote: true,
        evidenceFileId: true,
        reviewedBy: true,
        reviewedAt: true,
        waivedBy: true,
        waivedReason: true,
        lawfulBasis: true,
        expiresAt: true,
        application: {
          select: {
            id: true,
            referenceNumber: true,
            internalStatus: true,
            candidate: { select: { legalFirstName: true, lastName: true } },
            vacancy: { select: { id: true, title: true, referenceNumber: true } },
          },
        },
      },
    })

    return NextResponse.json({
      checks: checks.map((check) => {
        // §16 the existence and status of a restricted check is visible so the
        // process can be managed; the finding itself is not.
        const redact = isRestrictedCheck(check.checkType) && !canReadRestricted
        return {
          ...check,
          findingSummary: redact ? null : check.findingSummary,
          restrictedNote: redact ? null : check.restrictedNote,
          evidenceFileId: redact ? null : check.evidenceFileId,
          restricted: isRestrictedCheck(check.checkType),
          redacted: redact,
        }
      }),
      capabilities: { readRestricted: canReadRestricted, waive: canMakeHrManagerDecision(user.roles) },
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('backgroundcheck.manage')
    const input = await parseBody(request, schema)

    if (input.action === 'SEED_REQUIRED') {
      // §18 create the check list this vacancy actually requires, so nothing is
      // forgotten before clearance.
      const application = await prisma.application.findUnique({
        where: { id: input.applicationId },
        select: {
          id: true,
          internalStatus: true,
          vacancy: { select: { title: true, contractType: true, safeguardingClassification: true } },
        },
      })
      if (!application) throw new AuthzError('Application not found', 404)
      requireOpenRecruitmentFile(application.internalStatus)

      const required = requiredChecksFor({
        safeguardingClassification: application.vacancy.safeguardingClassification,
        contractType: application.vacancy.contractType,
        title: application.vacancy.title,
      })

      await prisma.$transaction(
        required.map((checkType) =>
          prisma.backgroundCheck.upsert({
            where: { applicationId_checkType: { applicationId: application.id, checkType } },
            update: {},
            create: { applicationId: application.id, checkType, status: 'NOT_REQUESTED' },
          })
        )
      )

      await logAudit({
        actorUserId: user.userId,
        action: 'BACKGROUND_CHECKS_SEEDED',
        resourceType: 'Application',
        resourceId: application.id,
        newValue: { required },
      })
      return NextResponse.json({ success: true, required })
    }

    if (input.action === 'REQUEST') {
      // §16 a check that is only lawful in some circumstances needs its basis on
      // record before it is sent anywhere.
      if (requiresLawfulBasis(input.checkType) && !input.lawfulBasis?.trim())
        throw new AuthzError('Record the lawful basis before requesting this check', 422)

      const application = await prisma.application.findUnique({
        where: { id: input.applicationId },
        select: {
          id: true,
          internalStatus: true,
          candidate: {
            select: {
              legalFirstName: true,
              lastName: true,
              nationality: true,
              licences: { select: { professionalBody: true, licenceNumber: true }, take: 1 },
            },
          },
        },
      })
      if (!application) throw new AuthzError('Application not found', 404)
      requireOpenRecruitmentFile(application.internalStatus)

      // §28.11 only the minimum field set for this check type leaves the system.
      const payload = minimalProviderPayload(input.checkType, {
        fullName: `${application.candidate.legalFirstName} ${application.candidate.lastName}`.trim(),
        nationality: application.candidate.nationality,
        professionalBody: application.candidate.licences[0]?.professionalBody,
        licenceNumber: application.candidate.licences[0]?.licenceNumber,
      })

      const check = await prisma.backgroundCheck.upsert({
        where: { applicationId_checkType: { applicationId: input.applicationId, checkType: input.checkType } },
        update: {
          status: 'REQUESTED',
          providerName: input.providerName?.trim() || null,
          providerReference: input.providerReference?.trim() || null,
          lawfulBasis: input.lawfulBasis?.trim() || null,
          submittedFieldsJson: JSON.stringify(Object.keys(payload)),
          requestedBy: user.userId,
          requestedAt: new Date(),
        },
        create: {
          applicationId: input.applicationId,
          checkType: input.checkType,
          status: 'REQUESTED',
          providerName: input.providerName?.trim() || null,
          providerReference: input.providerReference?.trim() || null,
          lawfulBasis: input.lawfulBasis?.trim() || null,
          submittedFieldsJson: JSON.stringify(Object.keys(payload)),
          requestedBy: user.userId,
          requestedAt: new Date(),
        },
      })

      await logAudit({
        actorUserId: user.userId,
        action: 'BACKGROUND_CHECK_REQUESTED',
        resourceType: 'BackgroundCheck',
        resourceId: check.id,
        // The audit log records which fields were shared, never their values.
        newValue: { checkType: input.checkType, provider: input.providerName, sharedFields: Object.keys(payload) },
      })
      return NextResponse.json({ success: true, check: { ...check, restrictedNote: undefined } })
    }

    if (input.action === 'WAIVE') {
      // §18 a waiver is an HR Manager decision, never an operational one.
      if (!canMakeHrManagerDecision(user.roles))
        throw new AuthzError('Only an HR manager may waive a required check', 403)
      const file = await prisma.backgroundCheck.findUnique({
        where: { id: input.checkId },
        select: { application: { select: { internalStatus: true } } },
      })
      if (!file) throw new AuthzError('Check not found', 404)
      requireOpenRecruitmentFile(file.application.internalStatus)
      const check = await prisma.backgroundCheck.update({
        where: { id: input.checkId },
        data: { status: 'WAIVED', waivedBy: user.userId, waivedReason: input.reason, reviewedAt: new Date() },
      })
      await logAudit({
        actorUserId: user.userId,
        action: 'BACKGROUND_CHECK_WAIVED',
        resourceType: 'BackgroundCheck',
        resourceId: check.id,
        reason: input.reason,
      })
      return NextResponse.json({ success: true, check: { ...check, restrictedNote: undefined } })
    }

    // RECORD_RESULT
    const existing = await prisma.backgroundCheck.findUnique({
      where: { id: input.checkId },
      select: {
        id: true,
        checkType: true,
        status: true,
        applicationId: true,
        application: { select: { internalStatus: true } },
      },
    })
    if (!existing) throw new AuthzError('Check not found', 404)
    requireOpenRecruitmentFile(existing.application.internalStatus)

    // Writing a finding on a restricted check needs restricted authority too;
    // read and write are not separable here.
    if (isRestrictedCheck(existing.checkType) && !(await hasPermission(user.userId, 'backgroundcheck.read.restricted')))
      throw new AuthzError('You are not authorised to record findings for this check type', 403)

    if (input.status === 'CONCERNS_RAISED' && !input.findingSummary?.trim())
      throw new AuthzError('Summarise the concern before recording this outcome', 422)

    const check = await prisma.backgroundCheck.update({
      where: { id: input.checkId },
      data: {
        status: input.status,
        outcome: input.outcome ?? null,
        findingSummary: input.findingSummary?.trim() || null,
        restrictedNote: input.restrictedNote?.trim() || null,
        evidenceFileId: input.evidenceFileId || null,
        expiresAt: input.expiresAt ?? null,
        receivedAt: ['RECEIVED', 'CLEARED', 'CONCERNS_RAISED', 'FAILED'].includes(input.status)
          ? new Date()
          : undefined,
        reviewedBy: user.userId,
        reviewedAt: new Date(),
      },
    })

    await logAudit({
      actorUserId: user.userId,
      action: 'BACKGROUND_CHECK_RECORDED',
      resourceType: 'BackgroundCheck',
      resourceId: check.id,
      previousValue: { status: existing.status },
      // The outcome is auditable; the finding text is not copied into the log.
      newValue: { status: input.status, outcome: input.outcome ?? null },
    })

    return NextResponse.json({ success: true, check: { ...check, restrictedNote: undefined } })
  } catch (error) {
    return authzResponse(error)
  }
}
