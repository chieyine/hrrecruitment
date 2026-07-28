import { prisma } from '@/lib/prisma'

export const AUTOMATIONS = [
  {
    code: 'VACANCY_SCHEDULES',
    name: 'Vacancy opening and closure',
    description: 'Open scheduled vacancies and close them at the configured deadline.',
  },
  {
    code: 'DRAFT_REMINDERS',
    name: 'Incomplete application reminders',
    description: 'Remind candidates whose draft has not been updated for three days.',
  },
  {
    code: 'ASSESSMENT_REMINDERS',
    name: 'Assessment reminders',
    description: 'Remind candidates when an assessment opens or approaches its deadline.',
  },
  {
    code: 'ASSESSMENT_INVITATIONS',
    name: 'Assessment invitations',
    description: 'Invite shortlisted candidates automatically when one published assessment applies to their vacancy.',
  },
  {
    code: 'INTERVIEW_REMINDERS',
    name: 'Interview reminders',
    description: 'Remind candidates and panel members about interviews in the next 24 hours.',
  },
  {
    code: 'REFERENCE_REMINDERS',
    name: 'Reference reminders',
    description: 'Chase reference requests that are approaching expiry.',
  },
  {
    code: 'OFFER_REMINDERS',
    name: 'Offer reminders and expiry',
    description: 'Warn candidates before the response deadline and expire unanswered offers.',
  },
  {
    code: 'PREBOARDING_REMINDERS',
    name: 'Preboarding reminders',
    description: 'Remind candidates about mandatory forms, documents, policies, courses and tasks.',
  },
  {
    code: 'READINESS_ALERTS',
    name: 'Start-date readiness alerts',
    description: 'Warn HR when a new starter is not ready within seven days of their start date.',
  },
  {
    code: 'WORK_ESCALATION',
    name: 'SLA escalation',
    description: 'Escalate overdue work according to the active service targets.',
  },
  {
    code: 'DECISION_REMINDERS',
    name: 'Manager and approver decision reminders',
    description: 'Notify assigned decision owners about work that is due or overdue.',
  },
  {
    code: 'SCHEDULED_REPORTS',
    name: 'Scheduled reports',
    description: 'Send recurring report download notices to approved recipients.',
  },
  {
    code: 'ASSESSMENT_AUTO_SUBMIT',
    name: 'Assessment auto-submission',
    description: 'Submit timed assessments after their configured closing point.',
  },
] as const

export type AutomationCode = (typeof AUTOMATIONS)[number]['code']

export async function automationMode(code: AutomationCode) {
  const control = await prisma.automationControl.findUnique({ where: { code } })
  return control?.mode || 'ACTIVE'
}

export async function recordAutomation(input: {
  code: AutomationCode
  action: string
  targetType: string
  targetId: string
  status: 'PREVIEWED' | 'COMPLETED' | 'SKIPPED' | 'OVERRIDDEN' | 'FAILED'
  details?: unknown
  actorUserId?: string
}) {
  await prisma.automationActionLog.create({
    data: {
      automationCode: input.code,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      status: input.status,
      detailsJson: JSON.stringify(input.details || {}),
      actorUserId: input.actorUserId || null,
    },
  })
}

export async function automatedBatch<T extends { id: string }>(
  code: AutomationCode,
  action: string,
  targetType: string,
  records: T[],
  handler: (record: T) => Promise<void>
) {
  const mode = await automationMode(code)
  let completed = 0
  let previewed = 0
  let skipped = 0
  let failed = 0
  for (const record of records) {
    if (mode === 'PAUSED') {
      await recordAutomation({
        code,
        action,
        targetType,
        targetId: record.id,
        status: 'SKIPPED',
        details: { reason: 'Automation paused' },
      })
      skipped++
      continue
    }
    if (mode === 'PREVIEW') {
      await recordAutomation({ code, action, targetType, targetId: record.id, status: 'PREVIEWED' })
      previewed++
      continue
    }
    try {
      await handler(record)
      await recordAutomation({ code, action, targetType, targetId: record.id, status: 'COMPLETED' })
      completed++
    } catch (error) {
      await recordAutomation({
        code,
        action,
        targetType,
        targetId: record.id,
        status: 'FAILED',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      })
      failed++
    }
  }
  return { completed, previewed, skipped, failed }
}
