import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

const COMPLETE_STATUSES: Record<string, Set<string>> = {
  forms: new Set(['APPROVED', 'WAIVED']),
  documents: new Set(['APPROVED', 'WAIVED']),
  policies: new Set(['SIGNED', 'APPROVED', 'WAIVED']),
  courses: new Set(['COMPLETED', 'WAIVED']),
  tasks: new Set(['COMPLETED', 'APPROVED', 'WAIVED']),
  meetings: new Set(['ATTENDED', 'WAIVED']),
  information: new Set(['ACKNOWLEDGED']),
}

function courseBlocksReadiness(courseSnapshotJson: string | null) {
  try {
    const snapshot = courseSnapshotJson ? JSON.parse(courseSnapshotJson) : null
    // Historical assignments predate timing snapshots and were all intended
    // as pre-resumption requirements.
    return !snapshot?.timing || snapshot.timing === 'BEFORE_RESUMPTION'
  } catch {
    return true
  }
}

/** Assign the vacancy package (or the active general fallback) and materialise
 * its versioned requirements for a candidate. Safe to call more than once. */
export async function instantiatePreboardingPackage(
  candidatePreboardingId: string,
  applicationId: string,
  assignedBy: string,
  explicitPackageId?: string,
  client?: Prisma.TransactionClient
) {
  const db = client ?? prisma
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: { vacancy: { select: { preboardingPackageId: true } } },
  })

  const packageId = explicitPackageId || application?.vacancy.preboardingPackageId
  const pkg = packageId
    ? await db.preboardingPackage.findUnique({
        where: { id: packageId },
        include: {
          packageForms: { include: { formTemplate: true } },
          packageDocuments: { include: { documentRequirement: true } },
          packagePolicies: { include: { policyDocument: true } },
          packageCourses: { include: { course: { include: { contents: true, quizQuestions: true } } } },
          packageTasks: { include: { taskTemplate: true } },
        },
      })
    : await db.preboardingPackage.findFirst({
        where: { active: true },
        orderBy: [{ candidateType: 'asc' }, { version: 'desc' }],
        include: {
          packageForms: { include: { formTemplate: true } },
          packageDocuments: { include: { documentRequirement: true } },
          packagePolicies: { include: { policyDocument: true } },
          packageCourses: { include: { course: { include: { contents: true, quizQuestions: true } } } },
          packageTasks: { include: { taskTemplate: true } },
        },
      })

  if (!pkg) return null

  await db.candidatePreboardingPackage.upsert({ where: { candidatePreboardingId_preboardingPackageId: { candidatePreboardingId, preboardingPackageId: pkg.id } }, update: {}, create: { candidatePreboardingId, preboardingPackageId: pkg.id, assignedBy } })

  const [forms, documents, policies, courses, tasks] = await Promise.all([
    db.candidatePreboardingForm.findMany({ where: { candidatePreboardingId }, select: { formTemplateId: true } }),
    db.candidateRequiredDocument.findMany({ where: { candidatePreboardingId }, select: { documentRequirementId: true } }),
    db.candidatePolicyAcknowledgement.findMany({ where: { candidatePreboardingId }, select: { policyDocumentId: true } }),
    db.candidateCourse.findMany({ where: { candidatePreboardingId }, select: { courseId: true } }),
    db.candidatePreboardingTask.findMany({ where: { candidatePreboardingId }, select: { taskTemplateId: true } }),
  ])

  const dueAt = (days: number) => new Date(Date.now() + days * 86_400_000)
  const formIds = new Set(forms.map((item) => item.formTemplateId))
  const documentIds = new Set(documents.map((item) => item.documentRequirementId))
  const policyIds = new Set(policies.map((item) => item.policyDocumentId))
  const courseIds = new Set(courses.map((item) => item.courseId))
  const taskIds = new Set(tasks.map((item) => item.taskTemplateId))

  await Promise.all([
    ...pkg.packageForms.filter((item) => !formIds.has(item.formTemplateId)).map((item) =>
      db.candidatePreboardingForm.upsert({ where: { candidatePreboardingId_formTemplateId: { candidatePreboardingId, formTemplateId: item.formTemplateId } }, update: {}, create: { candidatePreboardingId, formTemplateId: item.formTemplateId, required: item.required, dueAt: dueAt(item.dueOffsetDays), templateSnapshotJson: JSON.stringify(item.formTemplate) } })
    ),
    ...pkg.packageDocuments.filter((item) => !documentIds.has(item.documentRequirementId)).map((item) =>
      db.candidateRequiredDocument.upsert({ where: { candidatePreboardingId_documentRequirementId: { candidatePreboardingId, documentRequirementId: item.documentRequirementId } }, update: {}, create: { candidatePreboardingId, documentRequirementId: item.documentRequirementId, required: item.required, dueAt: dueAt(item.dueOffsetDays), requirementSnapshotJson: JSON.stringify(item.documentRequirement) } })
    ),
    ...pkg.packagePolicies.filter((item) => !policyIds.has(item.policyDocumentId)).map((item) =>
      db.candidatePolicyAcknowledgement.upsert({ where: { candidatePreboardingId_policyDocumentId: { candidatePreboardingId, policyDocumentId: item.policyDocumentId } }, update: {}, create: { candidatePreboardingId, policyDocumentId: item.policyDocumentId, required: item.required, dueAt: dueAt(item.dueOffsetDays), policySnapshotJson: JSON.stringify(item.policyDocument) } })
    ),
    ...pkg.packageCourses.filter((item) => !courseIds.has(item.courseId)).map((item) =>
      db.candidateCourse.upsert({ where: { candidatePreboardingId_courseId: { candidatePreboardingId, courseId: item.courseId } }, update: {}, create: { candidatePreboardingId, courseId: item.courseId, dueAt: dueAt(item.dueOffsetDays), required: item.required, courseSnapshotJson: JSON.stringify({ ...item.course, timing: item.timing }) } })
    ),
    ...pkg.packageTasks.filter((item) => !taskIds.has(item.taskTemplateId)).map((item) =>
      db.candidatePreboardingTask.upsert({ where: { candidatePreboardingId_taskTemplateId: { candidatePreboardingId, taskTemplateId: item.taskTemplateId } }, update: {}, create: { candidatePreboardingId, taskTemplateId: item.taskTemplateId, dueAt: dueAt(item.dueOffsetDays), required: item.required, taskSnapshotJson: JSON.stringify(item.taskTemplate) } })
    ),
  ])

  return pkg
}

/** Recompute progress from persisted requirement states; readiness is still
 * controlled by mandatory readiness checks and never by this percentage. */
export async function refreshPreboardingProgress(candidatePreboardingId: string) {
  const pb = await prisma.candidatePreboarding.findUnique({
    where: { id: candidatePreboardingId },
    include: { forms: true, documents: true, policyAcknowledgements: true, courses: true, tasks: true, meetings: true, infoItems: true },
  })
  if (!pb) return null

  // Clearance and completion are terminal review decisions. Candidate or staff
  // item activity must not silently downgrade them afterward.
  if (['READY_TO_RESUME', 'COMPLETED'].includes(pb.status)) return pb

  const groups = [
    ['forms', pb.forms] as const,
    ['documents', pb.documents] as const,
    ['policies', pb.policyAcknowledgements] as const,
    ['courses', pb.courses] as const,
    ['tasks', pb.tasks] as const,
    ['meetings', pb.meetings] as const,
    ['information', pb.infoItems] as const,
  ]
  const all = groups.flatMap(([name, items]) => items.map((rawItem) => {
    const item: any = rawItem
    return ({
    name,
    status: name === 'information' ? ('acknowledgedAt' in item && item.acknowledgedAt ? 'ACKNOWLEDGED' : 'PENDING') : item.status,
    required: (name === 'information' ? ('acknowledgementRequired' in item && item.acknowledgementRequired) : item.required)
      && (name !== 'courses' || courseBlocksReadiness('courseSnapshotJson' in item ? item.courseSnapshotJson : null)),
    })
  }))
  const mandatory = all.filter((item) => item.required)
  const completed = mandatory.filter((item) => COMPLETE_STATUSES[item.name].has(item.status)).length
  const percentage = mandatory.length === 0 ? 0 : Math.round((completed / mandatory.length) * 100)
  const startDateComplete = Boolean(pb.startDateConfirmedAt)
  const mandatoryComplete = mandatory.length > 0 && mandatory.every((item) => COMPLETE_STATUSES[item.name].has(item.status)) && startDateComplete

  const updated = await prisma.candidatePreboarding.update({
    where: { id: candidatePreboardingId },
    data: {
      overallCompletionPercentage: percentage,
      readinessStatus: mandatoryComplete ? 'PENDING_HR_REVIEW' : 'PENDING_CANDIDATE',
      status: mandatoryComplete ? 'AWAITING_HR_REVIEW' : 'IN_PROGRESS',
    },
  })
  await syncReadinessChecks(candidatePreboardingId)
  return updated
}

export async function syncReadinessChecks(candidatePreboardingId: string) {
  const pb = await prisma.candidatePreboarding.findUnique({
    where: { id: candidatePreboardingId },
    include: {
      forms: true,
      documents: { include: { documentRequirement: true } },
      policyAcknowledgements: true,
      courses: true,
      tasks: true,
      meetings: true,
      infoItems: true,
      application: { select: { referenceStatus: true, offerStatus: true } },
    },
  })
  if (!pb) return
  const allRequired = <T extends { status: string }>(items: T[], statuses: string[], requireConfigured = false) =>
    (!requireConfigured || items.length > 0) && items.every((item) => statuses.includes(item.status))
  const idDocs = pb.documents.filter((item) => item.required && /IDENTITY|PASSPORT|NIN/i.test(item.documentRequirement.documentType))
  const qualificationDocs = pb.documents.filter((item) => item.required && /ACADEMIC|QUALIFICATION|CERTIFICATE/i.test(item.documentRequirement.documentType))
  const states: Record<string, boolean> = {
    OFFER_ACCEPTED: pb.application.offerStatus === 'ACCEPTED',
    ID_APPROVED: allRequired(idDocs, ['APPROVED', 'WAIVED'], true),
    QUALIFICATION_APPROVED: allRequired(qualificationDocs, ['APPROVED', 'WAIVED'], true),
    FORMS_APPROVED: allRequired(pb.forms.filter((item) => item.required), ['APPROVED', 'WAIVED']),
    POLICIES_SIGNED: allRequired(pb.policyAcknowledgements.filter((item) => item.required), ['SIGNED', 'APPROVED', 'WAIVED']),
    COURSES_COMPLETED: allRequired(pb.courses.filter((item) => item.required && courseBlocksReadiness(item.courseSnapshotJson)), ['COMPLETED', 'WAIVED']),
    TASKS_COMPLETED: allRequired(pb.tasks.filter((item) => item.required), ['COMPLETED', 'APPROVED', 'WAIVED']),
    START_DATE_CONFIRMED: Boolean(pb.startDateConfirmedAt),
    REQUIRED_MEETINGS: allRequired(pb.meetings.filter((item) => item.required), ['ATTENDED', 'WAIVED']),
    REPORTING_ACKNOWLEDGED: pb.infoItems
      .filter((item) => item.acknowledgementRequired && item.category === 'REPORTING')
      .every((item) => Boolean(item.acknowledgedAt)),
    REFERENCES_SATISFACTORY: ['SATISFACTORY', 'NOT_REQUIRED', 'WAIVED'].includes(pb.application.referenceStatus || ''),
    PROFESSIONAL_LICENCE: allRequired(
      pb.documents.filter((item) => item.required && /LICEN[CS]E|PROFESSIONAL REGISTRATION/i.test(item.documentRequirement.documentType)),
      ['APPROVED', 'WAIVED'],
      pb.documents.some((item) => item.required && /LICEN[CS]E|PROFESSIONAL REGISTRATION/i.test(item.documentRequirement.documentType)),
    ),
    MEDICAL_CLEARANCE: allRequired(
      pb.documents.filter((item) => item.required && /MEDICAL|FITNESS|HEALTH CLEARANCE/i.test(item.documentRequirement.documentType)),
      ['APPROVED', 'WAIVED'],
      pb.documents.some((item) => item.required && /MEDICAL|FITNESS|HEALTH CLEARANCE/i.test(item.documentRequirement.documentType)),
    ),
  }
  await Promise.all(Object.entries(states).map(([checkType, passed]) =>
    prisma.readinessCheck.updateMany({
      where: { candidatePreboardingId, checkType, status: { in: ['PENDING', 'PASSED'] } },
      data: { status: passed ? 'PASSED' : 'PENDING', reviewedAt: passed ? new Date() : null },
    })
  ))
}
