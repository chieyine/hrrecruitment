import { prisma } from '@/lib/prisma'

const DEFAULT_TARGET_MINUTES: Record<string, number> = {
  APPLICATION_REVIEW: 24 * 60,
  APPROVAL_DECISION: 8 * 60,
  PREBOARDING_REVIEW: 24 * 60,
  OFFER_APPROVAL: 8 * 60,
  REFERENCE_REVIEW: 24 * 60,
  ASSESSMENT_MARKING: 24 * 60,
  INTERVIEW_SCORE_FOLLOW_UP: 8 * 60,
  PREBOARDING_OVERDUE: 8 * 60,
  OFFER_RESPONSE_DUE: 8 * 60,
}

function deadline(from: Date, minutes: number) {
  return new Date(from.getTime() + minutes * 60_000)
}

async function targetMinutes(workType: string) {
  const policy = await prisma.slaPolicy.findFirst({
    where: { workType, active: true },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    select: { targetMinutes: true },
  })
  return policy?.targetMinutes ?? DEFAULT_TARGET_MINUTES[workType] ?? 24 * 60
}

/**
 * Materialises actionable work from authoritative workflow records. Upserts
 * make this safe to call from the page, scheduler, or a future queue worker.
 */
export async function syncOperationalWorkItems() {
  const [
    reviewMinutes,
    approvalMinutes,
    preboardingMinutes,
    offerMinutes,
    referenceMinutes,
    assessmentMinutes,
    interviewMinutes,
  ] = await Promise.all([
    targetMinutes('APPLICATION_REVIEW'),
    targetMinutes('APPROVAL_DECISION'),
    targetMinutes('PREBOARDING_REVIEW'),
    targetMinutes('OFFER_APPROVAL'),
    targetMinutes('REFERENCE_REVIEW'),
    targetMinutes('ASSESSMENT_MARKING'),
    targetMinutes('INTERVIEW_SCORE_FOLLOW_UP'),
  ])

  const now = new Date()
  const offerWarning = new Date(now.getTime() + 48 * 60 * 60_000)
  const [
    applications,
    approvals,
    preboardings,
    offers,
    references,
    assessments,
    interviews,
    activePreboardings,
    responseDueOffers,
  ] = await Promise.all([
    prisma.application.findMany({
      where: { internalStatus: 'SUBMITTED' },
      select: {
        id: true,
        assignedReviewerId: true,
        updatedAt: true,
        vacancy: { select: { id: true, referenceNumber: true, title: true } },
        candidate: { select: { legalFirstName: true, lastName: true } },
      },
      take: 500,
    }),
    prisma.approval.findMany({
      where: { decision: 'PENDING' },
      select: { id: true, resourceType: true, resourceId: true, approverUserId: true, createdAt: true },
      take: 500,
    }),
    prisma.candidatePreboarding.findMany({
      where: { status: 'AWAITING_HR_REVIEW' },
      select: {
        id: true,
        applicationId: true,
        startedAt: true,
        application: {
          select: {
            vacancyId: true,
            vacancy: { select: { referenceNumber: true, title: true } },
            candidate: { select: { legalFirstName: true, lastName: true } },
          },
        },
      },
      take: 500,
    }),
    prisma.offer.findMany({
      where: { status: 'PENDING_APPROVAL' },
      select: {
        id: true,
        applicationId: true,
        startDate: true,
        application: {
          select: {
            vacancyId: true,
            vacancy: { select: { referenceNumber: true, title: true } },
            candidate: { select: { legalFirstName: true, lastName: true } },
          },
        },
      },
      take: 500,
    }),
    prisma.application.findMany({
      where: {
        internalStatus: 'REFERENCE_CHECK',
        referenceStatus: { in: ['SATISFACTORY_WITH_CONCERNS', 'UNSATISFACTORY'] },
      },
      select: {
        id: true,
        vacancyId: true,
        updatedAt: true,
        referenceStatus: true,
        vacancy: { select: { referenceNumber: true, title: true } },
        candidate: { select: { legalFirstName: true, lastName: true } },
      },
      take: 500,
    }),
    prisma.candidateAssessment.findMany({
      where: { status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] }, markerUserId: null },
      include: {
        assessment: { select: { title: true } },
        application: { include: { candidate: true, vacancy: true } },
      },
      take: 500,
    }),
    prisma.interview.findMany({
      where: { scheduledEnd: { lt: now }, status: { in: ['CONFIRMED', 'ATTENDED'] } },
      include: {
        application: { include: { candidate: true, vacancy: true } },
        panelMembers: { include: { submission: true } },
      },
      take: 500,
    }),
    prisma.candidatePreboarding.findMany({
      where: { status: { in: ['IN_PROGRESS', 'AWAITING_HR_REVIEW'] } },
      include: {
        application: { include: { candidate: true, vacancy: true } },
        forms: true,
        documents: true,
        policyAcknowledgements: true,
        courses: true,
        tasks: true,
      },
      take: 500,
    }),
    prisma.offer.findMany({
      where: { status: { in: ['SENT', 'VIEWED'] }, acceptanceDeadline: { lte: offerWarning } },
      include: { application: { include: { candidate: true, vacancy: true } } },
      take: 500,
    }),
  ])
  const overduePreboardings = activePreboardings
    .map((item) => ({
      item,
      overdue: [
        ...item.forms.filter(
          (entry) =>
            entry.required && entry.dueAt && entry.dueAt < now && !['APPROVED', 'WAIVED'].includes(entry.status)
        ),
        ...item.documents.filter(
          (entry) =>
            entry.required && entry.dueAt && entry.dueAt < now && !['APPROVED', 'WAIVED'].includes(entry.status)
        ),
        ...item.policyAcknowledgements.filter(
          (entry) =>
            entry.required &&
            entry.dueAt &&
            entry.dueAt < now &&
            !['SIGNED', 'APPROVED', 'WAIVED'].includes(entry.status)
        ),
        ...item.courses.filter(
          (entry) =>
            entry.required && entry.dueAt && entry.dueAt < now && !['COMPLETED', 'WAIVED'].includes(entry.status)
        ),
        ...item.tasks.filter(
          (entry) =>
            entry.required &&
            entry.dueAt &&
            entry.dueAt < now &&
            !['COMPLETED', 'APPROVED', 'WAIVED'].includes(entry.status)
        ),
      ],
    }))
    .filter((entry) => entry.overdue.length > 0)
  const incompleteInterviews = interviews
    .map((item) => ({ item, missing: item.panelMembers.filter((member) => !member.submission).length }))
    .filter((entry) => entry.missing > 0)

  const writes = [
    ...applications.map((item) =>
      prisma.workItem.upsert({
        where: { deduplicationKey: `application-review:${item.id}` },
        update: {
          assignedUserId: item.assignedReviewerId,
          dueAt: deadline(item.updatedAt, reviewMinutes),
          title: `Review ${item.candidate.legalFirstName} ${item.candidate.lastName}`,
        },
        create: {
          deduplicationKey: `application-review:${item.id}`,
          workType: 'APPLICATION_REVIEW',
          title: `Review ${item.candidate.legalFirstName} ${item.candidate.lastName}`,
          description: `${item.vacancy.referenceNumber} · ${item.vacancy.title}`,
          assignedUserId: item.assignedReviewerId,
          assignedRole: item.assignedReviewerId ? null : 'RECRUITMENT_OFFICER',
          resourceType: 'APPLICATION',
          resourceId: item.id,
          vacancyId: item.vacancy.id,
          applicationId: item.id,
          dueAt: deadline(item.updatedAt, reviewMinutes),
        },
      })
    ),
    ...approvals.map((item) =>
      prisma.workItem.upsert({
        where: { deduplicationKey: `approval:${item.id}` },
        update: { assignedUserId: item.approverUserId, dueAt: deadline(item.createdAt, approvalMinutes) },
        create: {
          deduplicationKey: `approval:${item.id}`,
          workType: 'APPROVAL_DECISION',
          title: `${item.resourceType.replaceAll('_', ' ')} approval`,
          assignedUserId: item.approverUserId,
          resourceType: item.resourceType,
          resourceId: item.resourceId,
          dueAt: deadline(item.createdAt, approvalMinutes),
        },
      })
    ),
    ...preboardings.map((item) =>
      prisma.workItem.upsert({
        where: { deduplicationKey: `preboarding-review:${item.id}` },
        update: { dueAt: deadline(item.startedAt, preboardingMinutes) },
        create: {
          deduplicationKey: `preboarding-review:${item.id}`,
          workType: 'PREBOARDING_REVIEW',
          title: `Clear ${item.application.candidate.legalFirstName} ${item.application.candidate.lastName}`,
          description: `${item.application.vacancy.referenceNumber} · Preboarding review`,
          assignedRole: 'HR_MANAGER',
          resourceType: 'PREBOARDING',
          resourceId: item.id,
          vacancyId: item.application.vacancyId,
          applicationId: item.applicationId,
          candidatePreboardingId: item.id,
          dueAt: deadline(item.startedAt, preboardingMinutes),
        },
      })
    ),
    ...offers.map((item) =>
      prisma.workItem.upsert({
        where: { deduplicationKey: `offer-approval:${item.id}` },
        update: {},
        create: {
          deduplicationKey: `offer-approval:${item.id}`,
          workType: 'OFFER_APPROVAL',
          title: `Approve offer for ${item.application.candidate.legalFirstName} ${item.application.candidate.lastName}`,
          description: `${item.application.vacancy.referenceNumber} · ${item.application.vacancy.title}`,
          assignedRole: 'HR_MANAGER',
          resourceType: 'OFFER',
          resourceId: item.id,
          vacancyId: item.application.vacancyId,
          applicationId: item.applicationId,
          dueAt: deadline(new Date(), offerMinutes),
        },
      })
    ),
    ...references.map((item) =>
      prisma.workItem.upsert({
        where: { deduplicationKey: `reference-review:${item.id}` },
        update: { priority: item.referenceStatus === 'UNSATISFACTORY' ? 'URGENT' : 'HIGH' },
        create: {
          deduplicationKey: `reference-review:${item.id}`,
          workType: 'REFERENCE_REVIEW',
          title: `Review reference concern: ${item.candidate.legalFirstName} ${item.candidate.lastName}`,
          description: `${item.vacancy.referenceNumber} · ${item.referenceStatus}`,
          priority: item.referenceStatus === 'UNSATISFACTORY' ? 'URGENT' : 'HIGH',
          assignedRole: 'HR_MANAGER',
          resourceType: 'APPLICATION',
          resourceId: item.id,
          vacancyId: item.vacancyId,
          applicationId: item.id,
          dueAt: deadline(item.updatedAt, referenceMinutes),
        },
      })
    ),
    ...assessments.map((item) =>
      prisma.workItem.upsert({
        where: { deduplicationKey: `assessment-marking:${item.id}` },
        update: { dueAt: deadline(item.submittedAt || item.invitedAt, assessmentMinutes) },
        create: {
          deduplicationKey: `assessment-marking:${item.id}`,
          workType: 'ASSESSMENT_MARKING',
          title: `Mark assessment for ${item.application.candidate.legalFirstName} ${item.application.candidate.lastName}`,
          description: `${item.application.vacancy.referenceNumber} · ${item.assessment.title}`,
          priority: 'HIGH',
          assignedRole: 'RECRUITMENT_OFFICER',
          resourceType: 'ASSESSMENT',
          resourceId: item.id,
          vacancyId: item.application.vacancyId,
          applicationId: item.applicationId,
          dueAt: deadline(item.submittedAt || item.invitedAt, assessmentMinutes),
        },
      })
    ),
    ...incompleteInterviews.map(({ item, missing }) =>
      prisma.workItem.upsert({
        where: { deduplicationKey: `interview-scores:${item.id}` },
        update: {
          description: `${item.application.vacancy.referenceNumber} · ${missing} panel submission${missing === 1 ? '' : 's'} outstanding`,
        },
        create: {
          deduplicationKey: `interview-scores:${item.id}`,
          workType: 'INTERVIEW_SCORE_FOLLOW_UP',
          title: `Chase interview scores for ${item.application.candidate.legalFirstName} ${item.application.candidate.lastName}`,
          description: `${item.application.vacancy.referenceNumber} · ${missing} panel submission${missing === 1 ? '' : 's'} outstanding`,
          priority: 'HIGH',
          assignedRole: 'HR_MANAGER',
          resourceType: 'INTERVIEW',
          resourceId: item.id,
          vacancyId: item.application.vacancyId,
          applicationId: item.applicationId,
          dueAt: deadline(item.scheduledEnd, interviewMinutes),
        },
      })
    ),
    ...overduePreboardings.map(({ item, overdue }) =>
      prisma.workItem.upsert({
        where: { deduplicationKey: `preboarding-overdue:${item.id}` },
        update: {
          title: `${overdue.length} overdue preboarding item${overdue.length === 1 ? '' : 's'} for ${item.application.candidate.legalFirstName} ${item.application.candidate.lastName}`,
        },
        create: {
          deduplicationKey: `preboarding-overdue:${item.id}`,
          workType: 'PREBOARDING_OVERDUE',
          title: `${overdue.length} overdue preboarding item${overdue.length === 1 ? '' : 's'} for ${item.application.candidate.legalFirstName} ${item.application.candidate.lastName}`,
          description: `${item.application.vacancy.referenceNumber} · Candidate follow-up required`,
          priority: 'URGENT',
          assignedRole: 'HR_MANAGER',
          resourceType: 'PREBOARDING',
          resourceId: item.id,
          vacancyId: item.application.vacancyId,
          applicationId: item.applicationId,
          candidatePreboardingId: item.id,
          dueAt: now,
        },
      })
    ),
    ...responseDueOffers.map((item) =>
      prisma.workItem.upsert({
        where: { deduplicationKey: `offer-response:${item.id}` },
        update: { dueAt: item.acceptanceDeadline, priority: item.acceptanceDeadline < now ? 'URGENT' : 'HIGH' },
        create: {
          deduplicationKey: `offer-response:${item.id}`,
          workType: 'OFFER_RESPONSE_DUE',
          title: `Offer response due: ${item.application.candidate.legalFirstName} ${item.application.candidate.lastName}`,
          description: `${item.application.vacancy.referenceNumber} · Deadline ${item.acceptanceDeadline.toISOString()}`,
          priority: item.acceptanceDeadline < now ? 'URGENT' : 'HIGH',
          assignedRole: 'HR_MANAGER',
          resourceType: 'OFFER',
          resourceId: item.id,
          vacancyId: item.application.vacancyId,
          applicationId: item.applicationId,
          dueAt: item.acceptanceDeadline,
        },
      })
    ),
  ]
  if (writes.length) await prisma.$transaction(writes)

  const activeKeys = new Set([
    ...applications.map((item) => `application-review:${item.id}`),
    ...approvals.map((item) => `approval:${item.id}`),
    ...preboardings.map((item) => `preboarding-review:${item.id}`),
    ...offers.map((item) => `offer-approval:${item.id}`),
    ...references.map((item) => `reference-review:${item.id}`),
    ...assessments.map((item) => `assessment-marking:${item.id}`),
    ...incompleteInterviews.map(({ item }) => `interview-scores:${item.id}`),
    ...overduePreboardings.map(({ item }) => `preboarding-overdue:${item.id}`),
    ...responseDueOffers.map((item) => `offer-response:${item.id}`),
  ])
  const open = await prisma.workItem.findMany({
    where: {
      workType: {
        in: [
          'APPLICATION_REVIEW',
          'APPROVAL_DECISION',
          'PREBOARDING_REVIEW',
          'OFFER_APPROVAL',
          'REFERENCE_REVIEW',
          'ASSESSMENT_MARKING',
          'INTERVIEW_SCORE_FOLLOW_UP',
          'PREBOARDING_OVERDUE',
          'OFFER_RESPONSE_DUE',
        ],
      },
      status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] },
    },
    select: { id: true, deduplicationKey: true },
  })
  const stale = open.filter((item) => !activeKeys.has(item.deduplicationKey)).map((item) => item.id)
  if (stale.length) {
    await prisma.workItem.updateMany({
      where: { id: { in: stale } },
      data: { status: 'COMPLETED', completedAt: new Date(), lockVersion: { increment: 1 } },
    })
  }
}

export function workItemHref(item: {
  resourceType: string
  resourceId: string
  applicationId: string | null
  candidatePreboardingId: string | null
}) {
  if (item.candidatePreboardingId) return `/recruitment/preboarding/${item.candidatePreboardingId}`
  if (item.applicationId) return `/recruitment/applications/${item.applicationId}`
  if (item.resourceType === 'VACANCY') return `/recruitment/vacancies/${item.resourceId}`
  if (item.resourceType === 'OFFER') return '/recruitment/offers'
  return '/recruitment/approvals'
}
