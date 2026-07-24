import { prisma } from './prisma'
import { createNotification } from './notifications'
import { enqueueEmail, processOutboxBatch } from './outbox'
import { runRetentionPolicy } from './retention'
import { readFileAsset, deleteStoredFile } from './s3'
import { scanBuffer } from './virus-scan'
import { randomUUID } from 'crypto'
import { syncOperationalWorkItems } from './work-items'
import { automatedBatch } from './automations'
import { applyConfigurationRelease, expireConfigurationRelease } from './configuration-releases'
import { generateScheduledReportAttachment } from './scheduled-report'

function normalizeAssessmentAnswer(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => String(item).trim().toLowerCase()).sort())
  }
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value).trim().toLowerCase()
}

export async function processBackgroundSchedules() {
  const now = new Date()
  const leaseOwner = randomUUID()
  const leaseUntil = new Date(now.getTime() + 15 * 60_000)
  const renewed = await prisma.jobLease.updateMany({ where: { jobName: 'PROCESS_SCHEDULES', lockedUntil: { lte: now } }, data: { leaseOwner, lockedUntil: leaseUntil } })
  if (!renewed.count) {
    try { await prisma.jobLease.create({ data: { jobName: 'PROCESS_SCHEDULES', leaseOwner, lockedUntil: leaseUntil } }) }
    catch { throw new Error('PROCESS_SCHEDULES is already running') }
  }
  const jobRun = await prisma.jobRun.create({ data: { jobName: 'PROCESS_SCHEDULES' } })
  const notifyOnceToday = async (userId: string, type: string, title: string, body: string) => {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const exists = await prisma.notification.findFirst({ where: { userId, type, body, sentAt: { gte: start } }, select: { id: true } })
    if (!exists) await createNotification({ userId, type, title, body })
  }

  try {
  const vacanciesToOpen = await prisma.vacancy.findMany({ where: { status: 'SCHEDULED', openingAt: { lte: now }, closingAt: { gt: now } }, select: { id: true } })
  const openedVacanciesResult = await automatedBatch('VACANCY_SCHEDULES', 'OPEN_VACANCY', 'Vacancy', vacanciesToOpen, async (vacancy) => { await prisma.vacancy.updateMany({ where: { id: vacancy.id, status: 'SCHEDULED' }, data: { status: 'OPEN' } }) })

  // 1. Expire outdated vacancies
  const vacanciesToClose = await prisma.vacancy.findMany({ where: { status: 'OPEN', closingAt: { lt: now } }, select: { id: true } })
  const expiredVacanciesResult = await automatedBatch('VACANCY_SCHEDULES', 'CLOSE_VACANCY', 'Vacancy', vacanciesToClose, async (vacancy) => { await prisma.vacancy.updateMany({ where: { id: vacancy.id, status: 'OPEN' }, data: { status: 'CLOSED' } }) })

  // 2. Expire pending offers past acceptance deadline
  const expiredOffers = await prisma.offer.findMany({
    where: {
      status: { in: ['SENT', 'VIEWED'] },
      acceptanceDeadline: { lt: now },
    },
    include: {
      application: {
        include: { candidate: true },
      },
    },
  })

  await automatedBatch('OFFER_REMINDERS', 'EXPIRE_OFFER', 'Offer', expiredOffers, async (offer) => {
    const changed = await prisma.$transaction(async (tx) => {
      const expired = await tx.offer.updateMany({
        where: { id: offer.id, status: { in: ['SENT', 'VIEWED'] }, version: offer.version },
        data: { status: 'EXPIRED' },
      })
      if (expired.count) {
        await tx.application.updateMany({
          where: { id: offer.applicationId, internalStatus: 'OFFER_SENT' },
          data: {
            internalStatus: 'OFFER_EXPIRED',
            candidateVisibleStatus: 'RECRUITMENT_COMPLETED',
            offerStatus: 'EXPIRED',
            lockVersion: { increment: 1 },
          },
        })
      }
      return expired
    })
    if (changed.count && offer.application.candidate.userId) {
      await createNotification({
        userId: offer.application.candidate.userId,
        type: 'OFFER_EXPIRED',
        title: 'Job Offer Expired',
        body: `Your job offer for ${offer.position} has passed its acceptance deadline and expired.`,
      })
    }
  })

  const reminderWindow = new Date(now.getTime() + 2 * 86400000)
  const offerReminders = await prisma.offer.findMany({ where: { status: { in: ['SENT', 'VIEWED'] }, acceptanceDeadline: { gt: now, lte: reminderWindow } }, include: { application: { include: { candidate: true } } }, take: 500 })
  await automatedBatch('OFFER_REMINDERS', 'REMIND_OFFER', 'Offer', offerReminders, async (offer) => { await notifyOnceToday(offer.application.candidate.userId, `OFFER_REMINDER:${offer.id}`, 'Offer response reminder', `Your offer for ${offer.position} expires on ${offer.acceptanceDeadline.toLocaleDateString('en-GB')}.`) })

  const courseReminders = await prisma.candidateCourse.findMany({ where: { required: true, status: { notIn: ['COMPLETED', 'WAIVED'] }, dueAt: { lte: reminderWindow } }, include: { course: true, candidatePreboarding: { include: { application: { include: { candidate: true } } } } }, take: 500 })
  await automatedBatch('PREBOARDING_REMINDERS', 'REMIND_COURSE', 'CandidateCourse', courseReminders, async (item) => { await notifyOnceToday(item.candidatePreboarding.application.candidate.userId, `COURSE_REMINDER:${item.id}`, 'Preboarding course due', `Complete ${item.course.title}${item.dueAt ? ` by ${item.dueAt.toLocaleDateString('en-GB')}` : ''}.`) })
  const taskReminders = await prisma.candidatePreboardingTask.findMany({ where: { required: true, status: { notIn: ['COMPLETED', 'APPROVED', 'WAIVED'] }, dueAt: { lte: reminderWindow } }, include: { taskTemplate: true, candidatePreboarding: { include: { application: { include: { candidate: true } } } } }, take: 500 })
  await automatedBatch('PREBOARDING_REMINDERS', 'REMIND_TASK', 'CandidatePreboardingTask', taskReminders, async (item) => { await notifyOnceToday(item.candidatePreboarding.application.candidate.userId, `TASK_REMINDER:${item.id}`, 'Preboarding task due', `Complete ${item.taskTemplate.title}${item.dueAt ? ` by ${item.dueAt.toLocaleDateString('en-GB')}` : ''}.`) })
  const formReminders = await prisma.candidatePreboardingForm.findMany({ where: { required: true, status: { notIn: ['APPROVED', 'WAIVED'] }, dueAt: { lte: reminderWindow } }, include: { formTemplate: true, candidatePreboarding: { include: { application: { include: { candidate: true } } } } }, take: 500 })
  await automatedBatch('PREBOARDING_REMINDERS', 'REMIND_FORM', 'CandidatePreboardingForm', formReminders, async (item) => { await notifyOnceToday(item.candidatePreboarding.application.candidate.userId, `FORM_REMINDER:${item.id}`, 'Preboarding form due', `Complete ${item.formTemplate.title}${item.dueAt ? ` by ${item.dueAt.toLocaleDateString('en-GB')}` : ''}.`) })
  const documentReminders = await prisma.candidateRequiredDocument.findMany({ where: { required: true, status: { notIn: ['APPROVED', 'WAIVED'] }, dueAt: { lte: reminderWindow } }, include: { documentRequirement: true, candidatePreboarding: { include: { application: { include: { candidate: true } } } } }, take: 500 })
  await automatedBatch('PREBOARDING_REMINDERS', 'REMIND_DOCUMENT', 'CandidateRequiredDocument', documentReminders, async (item) => { await notifyOnceToday(item.candidatePreboarding.application.candidate.userId, `DOCUMENT_REMINDER:${item.id}`, 'Preboarding document due', `Submit ${item.documentRequirement.name}${item.dueAt ? ` by ${item.dueAt.toLocaleDateString('en-GB')}` : ''}.`) })
  const policyReminders = await prisma.candidatePolicyAcknowledgement.findMany({ where: { required: true, status: { notIn: ['SIGNED', 'APPROVED', 'WAIVED'] }, dueAt: { lte: reminderWindow } }, include: { policyDocument: true, candidatePreboarding: { include: { application: { include: { candidate: true } } } } }, take: 500 })
  await automatedBatch('PREBOARDING_REMINDERS', 'REMIND_POLICY', 'CandidatePolicyAcknowledgement', policyReminders, async (item) => { await notifyOnceToday(item.candidatePreboarding.application.candidate.userId, `POLICY_REMINDER:${item.id}`, 'Policy signature due', `Read and sign ${item.policyDocument.title}${item.dueAt ? ` by ${item.dueAt.toLocaleDateString('en-GB')}` : ''}.`) })

  const draftThreshold = new Date(now.getTime() - 3 * 86400000)
  const draftApplications = await prisma.application.findMany({ where: { internalStatus: 'DRAFT', updatedAt: { lte: draftThreshold }, vacancy: { status: 'OPEN', closingAt: { gt: now } } }, include: { candidate: true, vacancy: true }, take: 500 })
  await automatedBatch('DRAFT_REMINDERS', 'REMIND_DRAFT', 'Application', draftApplications, async (application) => { await notifyOnceToday(application.candidate.userId, `APPLICATION_DRAFT_REMINDER:${application.id}`, 'Complete your application', `Your draft application for ${application.vacancy.title} has not been submitted. It closes on ${application.vacancy.closingAt.toLocaleDateString('en-GB')}.`) })

  const assessmentReminders = await prisma.candidateAssessment.findMany({ where: { status: { in: ['INVITED','NOT_STARTED'] }, assessment: { OR: [{ opensAt: { lte: reminderWindow } }, { closesAt: { lte: reminderWindow } }] } }, include: { assessment: true, application: { include: { candidate: true } } }, take: 500 })
  await automatedBatch('ASSESSMENT_REMINDERS', 'REMIND_ASSESSMENT', 'CandidateAssessment', assessmentReminders, async (record) => { await notifyOnceToday(record.application.candidate.userId, `ASSESSMENT_REMINDER:${record.id}`, 'Assessment reminder', `${record.assessment.title} is ready or approaching its deadline${record.assessment.closesAt ? ` on ${record.assessment.closesAt.toLocaleDateString('en-GB')}` : ''}.`) })

  const assessmentInvitationCandidates = await prisma.application.findMany({ where: { internalStatus: 'SHORTLISTED', candidateAssessments: { none: {} }, vacancy: { assessments: { some: {} } } }, include: { candidate: true, vacancy: { include: { assessments: true } } }, take: 500 })
  const unambiguousAssessmentInvitations = assessmentInvitationCandidates.filter((application) => application.vacancy.assessments.length === 1 && (!application.vacancy.assessments[0].closesAt || application.vacancy.assessments[0].closesAt > now))
  await automatedBatch('ASSESSMENT_INVITATIONS', 'INVITE_ASSESSMENT', 'Application', unambiguousAssessmentInvitations, async (application) => {
    const assessment = application.vacancy.assessments[0]
    await prisma.$transaction(async (tx) => {
      await tx.candidateAssessment.create({ data: { applicationId: application.id, assessmentId: assessment.id, status: 'INVITED' } })
      await tx.application.update({ where: { id: application.id }, data: { internalStatus: 'ASSESSMENT_INVITED', candidateVisibleStatus: 'ASSESSMENT_INVITED', lockVersion: { increment: 1 } } })
    })
    await createNotification({ userId: application.candidate.userId, type: 'ASSESSMENT_INVITED', title: 'Assessment invitation', body: `An assessment for ${application.vacancy.title} is ready in your account.` })
  })

  const interviewWindow = new Date(now.getTime() + 86400000)
  const interviewReminders = await prisma.interview.findMany({ where: { status: { in: ['SCHEDULED','CONFIRMED','RESCHEDULED'] }, scheduledStart: { gt: now, lte: interviewWindow } }, include: { application: { include: { candidate: true } }, panelMembers: true }, take: 500 })
  await automatedBatch('INTERVIEW_REMINDERS', 'REMIND_INTERVIEW', 'Interview', interviewReminders, async (interview) => {
    await notifyOnceToday(interview.application.candidate.userId, `INTERVIEW_REMINDER:${interview.id}`, 'Interview reminder', `${interview.title} starts on ${interview.scheduledStart.toLocaleString('en-GB')}.`)
    for (const member of interview.panelMembers) await notifyOnceToday(member.userId, `PANEL_INTERVIEW_REMINDER:${interview.id}`, 'Panel interview reminder', `${interview.title} starts on ${interview.scheduledStart.toLocaleString('en-GB')}.`)
  })

  const referenceReminders = await prisma.referenceRequest.findMany({ where: { status: { in: ['PENDING','SENT'] }, expiresAt: { gt: now, lte: reminderWindow }, OR: [{ reminderSentAt: null }, { reminderSentAt: { lt: new Date(now.getTime()-86400000) } }] }, include: { referee: true }, take: 500 })
  await automatedBatch('REFERENCE_REMINDERS', 'REMIND_REFERENCE', 'ReferenceRequest', referenceReminders, async (request) => {
    await enqueueEmail({ recipient: request.referee.email, subject: 'Reminder: FRAD reference request', html: '<p>Please complete the confidential FRAD reference request using the original secure link before it expires.</p>', deduplicationKey: `automatic-reference-reminder:${request.id}:${now.toISOString().slice(0,10)}` })
    await prisma.referenceRequest.update({ where: { id: request.id }, data: { reminderSentAt: now } })
  })

  const resumptionWindow = new Date(now.getTime() + 7 * 86400000)
  const notReadySoon = await prisma.candidatePreboarding.findMany({ where: { confirmedStartDate: { gt: now, lte: resumptionWindow }, readinessStatus: { not: 'READY_TO_RESUME' } }, include: { application: { include: { candidate: true, vacancy: true } } }, take: 500 })
  if (notReadySoon.length) {
    const managers = await prisma.user.findMany({ where: { accountStatus: 'ACTIVE', userRoles: { some: { role: { name: 'HR_MANAGER' } } } }, select: { id: true } })
    await automatedBatch('READINESS_ALERTS', 'ALERT_READINESS', 'CandidatePreboarding', notReadySoon, async (record) => { for (const manager of managers) await notifyOnceToday(manager.id, `NOT_READY_TO_RESUME:${record.id}`, 'Candidate not ready to resume', `${record.application.candidate.legalFirstName} ${record.application.candidate.lastName} is due to resume ${record.confirmedStartDate!.toLocaleDateString('en-GB')} for ${record.application.vacancy.title}, but readiness is ${record.readinessStatus}.`) })
  }

  const dueReports = await prisma.scheduledReport.findMany({ where: { active: true, nextRunAt: { lte: now } }, take: 100 })
  await automatedBatch('SCHEDULED_REPORTS', 'SEND_REPORT', 'ScheduledReport', dueReports, async (schedule) => {
    const attachment = await generateScheduledReportAttachment(schedule.reportType, schedule.format)
    await enqueueEmail({ recipient: schedule.recipientEmail, subject: `Scheduled FRAD report: ${schedule.reportType}`, html: '<p>Your scheduled FRAD report is attached. It contains controlled information; store and share it under FRAD privacy and retention rules.</p>', attachments: [attachment], deduplicationKey: `scheduled-report:${schedule.id}:${schedule.nextRunAt.toISOString()}` })
    const nextRunAt = new Date(schedule.nextRunAt)
    if (schedule.frequency === 'DAILY') nextRunAt.setUTCDate(nextRunAt.getUTCDate()+1)
    else if (schedule.frequency === 'WEEKLY') nextRunAt.setUTCDate(nextRunAt.getUTCDate()+7)
    else nextRunAt.setUTCMonth(nextRunAt.getUTCMonth()+1)
    await prisma.scheduledReport.update({ where: { id: schedule.id }, data: { lastRunAt: now, nextRunAt } })
  })

  const dueConfigurationReleases = await prisma.configurationChangeRequest.findMany({ where: { status: 'APPROVED', changeType: { startsWith: 'GENERIC_CONFIG_UPDATE:' }, scheduledFor: { lte: now } }, take: 100 })
  for (const release of dueConfigurationReleases) {
    try {
      await applyConfigurationRelease(release.id, release.decidedBy || release.requestedBy)
    } catch (error) {
      await prisma.configurationChangeRequest.update({ where: { id: release.id }, data: { status: 'FAILED', decisionComment: error instanceof Error ? error.message : 'Scheduled publication failed', lockVersion: { increment: 1 } } })
    }
  }
  const expiredConfigurationReleases = await prisma.configurationChangeRequest.findMany({ where: { status: 'APPLIED', effectiveTo: { lte: now } }, take: 100 })
  for (const release of expiredConfigurationReleases) await expireConfigurationRelease(release.id)

  const soon = new Date(now.getTime() + 30 * 86400000)
  const expiringLicences = await prisma.candidateLicence.findMany({ where: { expiryDate: { gt: now, lte: soon } }, include: { candidate: true }, take: 500 })
  for (const licence of expiringLicences) await notifyOnceToday(licence.candidate.userId, `LICENCE_EXPIRING:${licence.id}`, 'Professional licence expiring', `${licence.licenceType} expires on ${licence.expiryDate!.toLocaleDateString('en-GB')}. Upload renewed evidence when available.`)

  // 3. Auto-submit open assessments past closing window
  const activeCandidateAssessments = await prisma.candidateAssessment.findMany({
    where: { status: 'IN_PROGRESS', assessment: { autoSubmit: true } },
    include: {
      assessment: { include: { questions: true } },
      answers: true,
    },
    take: 500,
  })
  const expiredCandidateAssessments = activeCandidateAssessments.filter((record) => Boolean(record.startedAt && (record.startedAt.getTime() + record.assessment.durationMinutes * 60_000 <= now.getTime() || (record.assessment.closesAt && record.assessment.closesAt <= now))))

  await automatedBatch('ASSESSMENT_AUTO_SUBMIT', 'AUTO_SUBMIT', 'CandidateAssessment', expiredCandidateAssessments, async (ca) => {
    const answerMap = new Map(ca.answers.map((answer) => {
      try { return [answer.assessmentQuestionId, answer.answerJson ? JSON.parse(answer.answerJson) : null] as const }
      catch { return [answer.assessmentQuestionId, answer.answerJson] as const }
    }))
    const autoTypes = new Set(['MCQ', 'MULTISELECT', 'TRUEFALSE'])
    const fullyAutomatic = ca.assessment.questions.every((question) => autoTypes.has(question.questionType))
    let earned = 0
    let possible = 0
    for (const question of ca.assessment.questions) {
      if (!autoTypes.has(question.questionType)) continue
      possible += question.maximumScore
      let correct: unknown = null
      try { correct = question.correctAnswerJson ? JSON.parse(question.correctAnswerJson) : null }
      catch { correct = question.correctAnswerJson }
      const actual = answerMap.get(question.id)
      const expected = Array.isArray(correct) && correct.length === 1 && !Array.isArray(actual) ? correct[0] : correct
      if (normalizeAssessmentAnswer(actual) === normalizeAssessmentAnswer(expected)) earned += question.maximumScore
    }
    const score = possible > 0 ? Math.round((earned / possible) * 1000) / 10 : 0
    const passed = fullyAutomatic ? score >= ca.assessment.passMark : null
    await prisma.$transaction(async (tx) => {
      const submitted = await tx.candidateAssessment.updateMany({
        where: { id: ca.id, status: 'IN_PROGRESS' },
        data: {
          status: fullyAutomatic ? (passed ? 'PASSED' : 'FAILED') : 'AUTO_SUBMITTED',
          autoSubmitted: true,
          submittedAt: now,
          score: possible > 0 ? score : null,
          passed,
        },
      })
      if (submitted.count && fullyAutomatic) {
        await tx.application.updateMany({
          where: { id: ca.applicationId, internalStatus: 'ASSESSMENT_INVITED' },
          data: {
            assessmentScore: score,
            internalStatus: 'ASSESSMENT_COMPLETED',
            candidateVisibleStatus: 'ASSESSMENT_COMPLETED',
            lockVersion: { increment: 1 },
          },
        })
      }
    })
  })

  // 4. Expire overdue reference requests that were never completed.
  const expiredReferences = await prisma.referenceRequest.updateMany({
    where: { status: { in: ['PENDING', 'SENT'] }, expiresAt: { lt: now } },
    data: { status: 'EXPIRED' },
  })

  await syncOperationalWorkItems()
  const decisionItems = await prisma.workItem.findMany({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] }, assignedUserId: { not: null }, assignedUser: { userRoles: { some: { role: { name: { in: ['HIRING_MANAGER', 'APPROVER'] } } } } }, OR: [{ dueAt: { lte: reminderWindow } }, { priority: 'URGENT' }] }, take: 500 })
  await automatedBatch('DECISION_REMINDERS', 'REMIND_DECISION_OWNER', 'WorkItem', decisionItems, async (item) => {
    await notifyOnceToday(item.assignedUserId!, `DECISION_REMINDER:${item.id}`, 'Recruitment decision required', `${item.title}${item.dueAt ? ` is due ${item.dueAt.toLocaleDateString('en-GB')}` : ' needs your attention'}.`)
  })
  const escalationCandidates = await prisma.workItem.findMany({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] }, dueAt: { lt: now }, escalatedAt: null }, select: { id: true } })
  const escalatedWork = await automatedBatch('WORK_ESCALATION', 'ESCALATE_WORK', 'WorkItem', escalationCandidates, async (item) => { await prisma.workItem.updateMany({ where: { id: item.id, escalatedAt: null }, data: { escalatedAt: now, escalationLevel: { increment: 1 }, priority: 'URGENT' } }) })

  const outbox = await processOutboxBatch()
  const retention = await runRetentionPolicy(now)
  const pendingFiles = await prisma.fileAsset.findMany({ where: { virusScanStatus: 'PENDING' }, take: 25 })
  let cleanFiles = 0, infectedFiles = 0
  for (const file of pendingFiles) {
    const bytes = await readFileAsset(file.storageKey)
    if (!bytes) continue
    const status = await scanBuffer(bytes)
    if (status === 'CLEAN') { await prisma.fileAsset.update({ where: { id: file.id }, data: { virusScanStatus: 'CLEAN' } }); cleanFiles++ }
    else if (status === 'INFECTED') { await deleteStoredFile(file.storageKey); await prisma.fileAsset.update({ where: { id: file.id }, data: { virusScanStatus: 'INFECTED' } }); await prisma.operationalEvent.create({ data: { eventType: 'MALWARE_DETECTED', severity: 'CRITICAL', resourceType: 'FileAsset', resourceId: file.id } }); infectedFiles++ }
  }
  const summary = {
    expiredVacanciesCount: expiredVacanciesResult.completed,
    openedVacanciesCount: openedVacanciesResult.completed,
    expiredOffersCount: expiredOffers.length,
    autoSubmittedAssessmentsCount: expiredCandidateAssessments.length,
    expiredReferencesCount: expiredReferences.count,
    escalatedWorkItemsCount: escalatedWork.completed,
    offerRemindersCount: offerReminders.length,
    courseRemindersCount: courseReminders.length,
    taskRemindersCount: taskReminders.length,
    formRemindersCount: formReminders.length,
    documentRemindersCount: documentReminders.length,
    policyRemindersCount: policyReminders.length,
    draftApplicationRemindersCount: draftApplications.length,
    assessmentRemindersCount: assessmentReminders.length,
    assessmentInvitationsCount: unambiguousAssessmentInvitations.length,
    interviewRemindersCount: interviewReminders.length,
    referenceRemindersCount: referenceReminders.length,
    decisionRemindersCount: decisionItems.length,
    notReadyToResumeAlertsCount: notReadySoon.length,
    scheduledReportsCount: dueReports.length,
    scheduledConfigurationReleasesCount: dueConfigurationReleases.length,
    expiringLicenceRemindersCount: expiringLicences.length,
    outbox,
    retention,
    scannedPendingFiles: pendingFiles.length, cleanFiles, infectedFiles,
  }
  await prisma.jobRun.update({ where: { id: jobRun.id }, data: { status: 'COMPLETED', completedAt: new Date(), summaryJson: JSON.stringify(summary) } })
  return summary
  } catch (error) {
    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }).catch(() => undefined)
    throw error
  } finally {
    await prisma.jobLease.deleteMany({
      where: { jobName: 'PROCESS_SCHEDULES', leaseOwner },
    }).catch(() => undefined)
  }
}
