import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { applicationAccess } from '@/lib/recruitment-access'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const user = await requireUser()
    const access = await applicationAccess(user.userId, params.id)
    const readAll = access.readAll
    if (!readAll && !access.assigned) throw new AuthzError('Forbidden', 403)
    const [canReadRestricted, canReadReferences, canManageOffers, canExportDocumentation] = await Promise.all([
      hasPermission(user.userId, 'preboarding.restricted.read'),
      hasPermission(user.userId, 'reference.manage'),
      hasPermission(user.userId, 'offer.manage'),
      hasPermission(user.userId, 'report.export'),
    ])
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        candidate: {
          include: {
            user: { select: { email: true, phone: true } },
            education: true,
            employment: true,
            licences: true,
          },
        },
        vacancy: { include: { department: true, dutyStation: true } },
        scorecards: { where: readAll ? {} : { reviewerUserId: user.userId }, include: { criterionScores: true } },
        stageHistory: { orderBy: { createdAt: 'desc' } },
        notes: { orderBy: { createdAt: 'desc' } },
        answers: { include: { vacancyQuestion: true } },
        files: { include: { fileAsset: { select: { id: true, originalName: true, virusScanStatus: true } }, vacancyQuestion: true } },
        candidateAssessments: { include: { assessment: { select: { title: true, type: true } } }, orderBy: { invitedAt: 'desc' } },
        interviews: { include: { panelMembers: true, panelSubmissions: true }, orderBy: { scheduledStart: 'desc' } },
        referees: { include: { requests: { include: { response: { select: { outcome: true, verifiedAt: true } } }, orderBy: { sentAt: 'desc' } } } },
        offers: { orderBy: { version: 'desc' } },
        selectionDecisions: true,
        preboardings: { include: { forms: true, documents: true, policyAcknowledgements: true, courses: true, tasks: true, readinessChecks: true } },
        messageThreads: {
          where: readAll ? {} : { restricted: false },
          include: {
            messages: {
              select: { id: true, body: true, sentAt: true, readAt: true, senderUserId: true, sender: { select: { email: true } } },
              orderBy: { sentAt: 'asc' },
            },
          },
        },
        resumptionRecord: true,
        erpTransferRecord: true,
      },
    })
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }
    if (!readAll) application.notes = application.notes.filter((note) => !note.restricted && note.authorUserId === user.userId)
    const relatedResourceIds = [
      application.id,
      ...application.selectionDecisions.map((item) => item.id),
      ...application.offers.map((item) => item.id),
      ...application.preboardings.map((item) => item.id),
      ...application.interviews.map((item) => item.id),
      ...application.candidateAssessments.map((item) => item.id),
      ...application.referees.flatMap((item) => [item.id, ...item.requests.map((request) => request.id)]),
    ]
    const [approvals, auditHistory, deliveryHistory] = await Promise.all([
      prisma.approval.findMany({
        where: { resourceId: { in: relatedResourceIds } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.auditLog.findMany({
        where: { resourceId: { in: relatedResourceIds } },
        select: { id: true, action: true, resourceType: true, resourceId: true, reason: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.outboxMessage.findMany({
        where: { applicationId: application.id },
        select: { id: true, subject: true, status: true, attempts: true, deliveredAt: true, lastError: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ])
    const normalizedPhone = application.candidate.primaryPhone?.replace(/\D/g, '') || application.candidate.user.phone?.replace(/\D/g, '') || ''
    const phoneMatches = [
      ...(application.candidate.primaryPhone ? [{ primaryPhone: application.candidate.primaryPhone }] : []),
      ...(application.candidate.user.phone ? [{ user: { phone: application.candidate.user.phone } }] : []),
    ]
    const possibleDuplicates = normalizedPhone.length >= 7 && phoneMatches.length
      ? await prisma.candidateProfile.findMany({
          where: {
            id: { not: application.candidateId },
            OR: phoneMatches,
          },
          select: { id: true, legalFirstName: true, lastName: true },
          take: 10,
        })
      : []
    // Return a role-appropriate projection. Panel members only need the
    // application and their interview context; hiring managers must never
    // receive references or preboarding/payroll material. Audit access is also
    // not a licence to retrieve case content.
    const isAuditor = user.roles.includes('AUDITOR')
    const isPanelOnly = access.panelMember && !access.vacancyOwner && !access.assignedReviewer && !readAll
    const safeApplication: any = { ...application }
    if (!canReadReferences) safeApplication.referees = []
    if (!canManageOffers) safeApplication.offers = []
    if (!canReadRestricted) {
      safeApplication.preboardings = []
      safeApplication.resumptionRecord = null
      safeApplication.erpTransferRecord = null
    }
    if (isPanelOnly) {
      safeApplication.selectionDecisions = []
      safeApplication.stageHistory = []
      safeApplication.messageThreads = []
      safeApplication.notes = []
      safeApplication.candidateAssessments = []
      safeApplication.scorecards = safeApplication.scorecards.filter((scorecard: { reviewerUserId: string }) => scorecard.reviewerUserId === user.userId)
      safeApplication.candidate = {
        id: application.candidate.id,
        legalFirstName: application.candidate.legalFirstName,
        preferredName: application.candidate.preferredName,
        lastName: application.candidate.lastName,
        education: application.candidate.education,
        employment: application.candidate.employment.map((employment) => ({ ...employment, supervisorPhone: undefined })),
        licences: application.candidate.licences,
      }
    }
    if (isAuditor) {
      safeApplication.candidate = {
        id: application.candidate.id,
        legalFirstName: application.candidate.legalFirstName,
        lastName: application.candidate.lastName,
      }
      safeApplication.answers = []
      safeApplication.files = []
      safeApplication.notes = []
      safeApplication.messageThreads = []
      safeApplication.referees = []
      safeApplication.offers = []
      safeApplication.preboardings = []
      safeApplication.resumptionRecord = null
    }
    return NextResponse.json({
      application: {
        ...safeApplication,
        approvals: isPanelOnly ? [] : approvals,
        auditHistory: isPanelOnly ? [] : auditHistory,
        deliveryHistory: readAll && !isAuditor ? deliveryHistory : [],
        possibleDuplicates: readAll && !isAuditor ? possibleDuplicates : [],
        capabilities: { exportDocumentation: canExportDocumentation && !isPanelOnly },
      },
    })
  } catch (err) {
    return authzResponse(err)
  }
}
