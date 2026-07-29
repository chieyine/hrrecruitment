import { prisma } from '@/lib/prisma'

export type CandidateTask = {
  key: string
  title: string
  context: string
  href: string
  dueAt: Date | null
  priority: number
  kind: 'Assessment' | 'Interview' | 'Offer' | 'Preboarding'
}

export async function getCandidateTasks(userId: string): Promise<CandidateTask[]> {
  const now = new Date()
  const [
    assessments,
    interviews,
    offers,
    forms,
    documents,
    policies,
    courses,
    tasks,
    information,
    meetings,
    startDates,
  ] = await Promise.all([
    prisma.candidateAssessment.findMany({
      where: {
        application: { candidate: { userId } },
        status: { in: ['INVITED', 'NOT_STARTED', 'IN_PROGRESS'] },
        assessment: { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
      },
      select: {
        id: true,
        status: true,
        assessment: { select: { title: true, closesAt: true } },
        application: { select: { vacancy: { select: { title: true } } } },
      },
    }),
    prisma.interview.findMany({
      where: {
        application: { candidate: { userId } },
        status: { notIn: ['ATTENDED', 'DID_NOT_ATTEND', 'CANCELLED'] },
        candidateResponse: null,
        scheduledEnd: { gt: now },
      },
      select: {
        id: true,
        title: true,
        scheduledStart: true,
        application: { select: { vacancy: { select: { title: true } } } },
      },
    }),
    prisma.offer.findMany({
      where: {
        application: { candidate: { userId } },
        status: { in: ['SENT', 'VIEWED'] },
        acceptanceDeadline: { gt: now },
      },
      select: { id: true, position: true, acceptanceDeadline: true },
    }),
    prisma.candidatePreboardingForm.findMany({
      where: {
        candidatePreboarding: { application: { candidate: { userId } } },
        required: true,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED'] },
      },
      select: { id: true, dueAt: true, formTemplate: { select: { title: true } } },
    }),
    prisma.candidateRequiredDocument.findMany({
      where: {
        candidatePreboarding: { application: { candidate: { userId } } },
        required: true,
        status: { in: ['NOT_SUBMITTED', 'REJECTED', 'RESUBMISSION_REQUIRED', 'EXPIRED'] },
      },
      select: { id: true, dueAt: true, documentRequirement: { select: { name: true } } },
    }),
    prisma.candidatePolicyAcknowledgement.findMany({
      where: {
        candidatePreboarding: { application: { candidate: { userId } } },
        required: true,
        status: { notIn: ['SIGNED', 'APPROVED', 'WAIVED'] },
      },
      select: { id: true, dueAt: true, policyDocument: { select: { title: true } } },
    }),
    prisma.candidateCourse.findMany({
      where: {
        candidatePreboarding: { application: { candidate: { userId } } },
        required: true,
        status: { notIn: ['COMPLETED', 'WAIVED'] },
      },
      select: { id: true, dueAt: true, course: { select: { title: true } } },
    }),
    prisma.candidatePreboardingTask.findMany({
      where: {
        candidatePreboarding: { application: { candidate: { userId } } },
        required: true,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED'] },
      },
      select: { id: true, dueAt: true, taskTemplate: { select: { title: true } } },
    }),
    prisma.candidateInformationItem.findMany({
      where: {
        candidatePreboarding: { application: { candidate: { userId } } },
        acknowledgementRequired: true,
        acknowledgedAt: null,
      },
      select: { id: true, title: true },
    }),
    prisma.preboardingMeeting.findMany({
      where: {
        candidatePreboarding: { application: { candidate: { userId } } },
        required: true,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        candidateResponse: null,
        scheduledEnd: { gt: now },
      },
      select: { id: true, title: true, scheduledStart: true },
    }),
    prisma.candidatePreboarding.findMany({
      where: {
        startDateConfirmedAt: null,
        application: { offers: { some: { status: 'ACCEPTED' } }, candidate: { userId } },
      },
      select: {
        id: true,
        application: {
          select: {
            vacancy: { select: { title: true } },
            offers: {
              where: { status: 'ACCEPTED' },
              orderBy: { acceptedAt: 'desc' },
              take: 1,
              select: { startDate: true },
            },
          },
        },
      },
    }),
  ])

  return [
    ...assessments.map((item) => ({
      key: `assessment-${item.id}`,
      title: `${item.status === 'IN_PROGRESS' ? 'Continue' : 'Start'} assessment: ${item.assessment.title}`,
      context: item.application.vacancy.title,
      href: `/candidate/assessments/${item.id}`,
      dueAt: item.assessment.closesAt,
      priority: 1,
      kind: 'Assessment' as const,
    })),
    ...interviews.map((item) => ({
      key: `interview-${item.id}`,
      title: `Respond to interview: ${item.title}`,
      context: item.application.vacancy.title,
      href: `/candidate/interviews#interview-${item.id}`,
      dueAt: item.scheduledStart,
      priority: 1,
      kind: 'Interview' as const,
    })),
    ...offers.map((item) => ({
      key: `offer-${item.id}`,
      title: `Review offer: ${item.position}`,
      context: 'Offer',
      href: `/candidate/offers/${item.id}`,
      dueAt: item.acceptanceDeadline,
      priority: 0,
      kind: 'Offer' as const,
    })),
    ...forms.map((item) => ({
      key: `form-${item.id}`,
      title: `Complete form: ${item.formTemplate.title}`,
      context: 'Before you start',
      href: `/candidate/preboarding/forms#form-${item.id}`,
      dueAt: item.dueAt,
      priority: 2,
      kind: 'Preboarding' as const,
    })),
    ...documents.map((item) => ({
      key: `document-${item.id}`,
      title: `Upload document: ${item.documentRequirement.name}`,
      context: 'Before you start',
      href: `/candidate/preboarding/documents#document-${item.id}`,
      dueAt: item.dueAt,
      priority: 2,
      kind: 'Preboarding' as const,
    })),
    ...policies.map((item) => ({
      key: `policy-${item.id}`,
      title: `Read and sign: ${item.policyDocument.title}`,
      context: 'Before you start',
      href: `/candidate/preboarding/policies#policy-${item.id}`,
      dueAt: item.dueAt,
      priority: 2,
      kind: 'Preboarding' as const,
    })),
    ...courses.map((item) => ({
      key: `course-${item.id}`,
      title: `Complete course: ${item.course.title}`,
      context: 'Before you start',
      href: `/candidate/preboarding/courses#course-${item.id}`,
      dueAt: item.dueAt,
      priority: 2,
      kind: 'Preboarding' as const,
    })),
    ...tasks.map((item) => ({
      key: `task-${item.id}`,
      title: item.taskTemplate.title,
      context: 'Before you start',
      href: `/candidate/preboarding/tasks#task-${item.id}`,
      dueAt: item.dueAt,
      priority: 2,
      kind: 'Preboarding' as const,
    })),
    ...information.map((item) => ({
      key: `information-${item.id}`,
      title: `Read and confirm: ${item.title}`,
      context: 'Before you start',
      href: `/candidate/preboarding/reporting-information#information-${item.id}`,
      dueAt: null,
      priority: 2,
      kind: 'Preboarding' as const,
    })),
    ...meetings.map((item) => ({
      key: `meeting-${item.id}`,
      title: `Respond to meeting: ${item.title}`,
      context: 'Before you start',
      href: `/candidate/preboarding/meetings#meeting-${item.id}`,
      dueAt: item.scheduledStart,
      priority: 1,
      kind: 'Preboarding' as const,
    })),
    ...startDates.map((item) => ({
      key: `start-date-${item.id}`,
      title: `Confirm your start date for ${item.application.vacancy.title}`,
      context: 'Before you start',
      href: '/candidate/preboarding#start-date',
      dueAt: item.application.offers[0]?.startDate || null,
      priority: 1,
      kind: 'Preboarding' as const,
    })),
  ].sort(
    (a, b) =>
      (a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
      a.priority - b.priority ||
      a.key.localeCompare(b.key)
  )
}
