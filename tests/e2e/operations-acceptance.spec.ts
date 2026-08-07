import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { login, logout } from './helpers'

const prisma = new PrismaClient()
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

let fixture: {
  hrId: string
  hiringManagerId: string
  candidateId: string
  departmentId: string
  dutyStationId: string
}

async function createVacancy(
  suffix: string,
  ownerUserId = fixture.hrId,
  options: { status?: string; openingAt?: Date; closingAt?: Date; questions?: Array<Record<string, unknown>> } = {}
) {
  return prisma.vacancy.create({
    data: {
      referenceNumber: `OPS-${runId}-${suffix}`,
      title: `Operations acceptance ${suffix} ${runId}`,
      departmentId: fixture.departmentId,
      dutyStationId: fixture.dutyStationId,
      contractType: 'FIXED_TERM',
      summary: 'Operations acceptance fixture',
      responsibilities: 'Exercise the complete operational workflow',
      essentialQualifications: 'Acceptance fixture qualification',
      openingAt: options.openingAt ?? new Date(Date.now() - 86_400_000),
      closingAt: options.closingAt ?? new Date(Date.now() + 7 * 86_400_000),
      status: options.status ?? 'OPEN',
      ownerUserId,
      questions: options.questions ? { create: options.questions as any } : undefined,
    },
    include: { questions: { orderBy: { displayOrder: 'asc' } } },
  })
}

test.describe('operational completeness acceptance', () => {
  test.beforeAll(async () => {
    const [hr, hiringManager, candidateUser, department, dutyStation] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: 'hrmanager@fradfoundation.org' }, select: { id: true } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'hiring.manager@fradfoundation.org' }, select: { id: true } }),
      prisma.user.findUniqueOrThrow({
        where: { email: 'candidate@example.com' },
        include: { candidateProfile: { select: { id: true } } },
      }),
      prisma.department.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
      prisma.dutyStation.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
    ])
    if (!candidateUser.candidateProfile) throw new Error('The seeded candidate profile is missing')
    fixture = {
      hrId: hr.id,
      hiringManagerId: hiringManager.id,
      candidateId: candidateUser.candidateProfile.id,
      departmentId: department.id,
      dutyStationId: dutyStation.id,
    }
  })

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing acceptance scenarios run once on desktop Chromium')
  })

  test.afterAll(async () => {
    await prisma.$disconnect()
  })

  test('conditional questions are enforced for candidate and HR-assisted entry', async ({ page }) => {
    const questions = [
      { fieldType: 'YESNO', label: 'Do you require a work permit?', required: true, displayOrder: 0 },
      {
        fieldType: 'LONGTEXT',
        label: 'Provide work-permit details',
        required: true,
        displayOrder: 1,
        conditionJson: JSON.stringify({ dependsOnIndex: 0, operator: 'EQUALS', value: true }),
      },
    ]
    const hiddenVacancy = await createVacancy('conditional-hidden', fixture.hrId, { questions })
    const visibleVacancy = await createVacancy('conditional-visible', fixture.hrId, { questions })
    const assistedVacancy = await createVacancy('conditional-assisted', fixture.hrId, { questions })

    await login(page, 'candidate@example.com')
    const hiddenSubmit = await page.request.post('/api/candidate/applications', {
      headers: { 'Idempotency-Key': `conditional-hidden-${runId}` },
      data: {
        vacancyId: hiddenVacancy.id,
        mode: 'SUBMIT',
        declarationsAccepted: true,
        answers: [
          { vacancyQuestionId: hiddenVacancy.questions[0].id, answer: false },
          { vacancyQuestionId: hiddenVacancy.questions[1].id, answer: 'This hidden answer must not be persisted.' },
        ],
        documents: [],
      },
    })
    expect(hiddenSubmit.status(), await hiddenSubmit.text()).toBe(200)
    const hiddenApplicationId = (await hiddenSubmit.json()).applicationId as string
    const savedAnswers = await prisma.applicationAnswer.findMany({ where: { applicationId: hiddenApplicationId } })
    expect(savedAnswers).toHaveLength(1)
    expect(savedAnswers[0].vacancyQuestionId).toBe(hiddenVacancy.questions[0].id)

    const missingVisibleAnswer = await page.request.post('/api/candidate/applications', {
      headers: { 'Idempotency-Key': `conditional-visible-${runId}` },
      data: {
        vacancyId: visibleVacancy.id,
        mode: 'SUBMIT',
        declarationsAccepted: true,
        answers: [{ vacancyQuestionId: visibleVacancy.questions[0].id, answer: true }],
        documents: [],
      },
    })
    expect(missingVisibleAnswer.status()).toBe(400)
    expect(await missingVisibleAnswer.text()).toContain('Provide work-permit details')
    await logout(page)

    await login(page, 'hrmanager@fradfoundation.org')
    const assisted = await page.request.post('/api/recruitment/applications/assisted', {
      data: {
        candidateId: fixture.candidateId,
        vacancyId: assistedVacancy.id,
        reason: 'Candidate requested documented telephone assistance because internet access was unavailable.',
        answers: [{ vacancyQuestionId: assistedVacancy.questions[0].id, answer: false }],
      },
    })
    expect(assisted.status(), await assisted.text()).toBe(200)
    const assistedId = (await assisted.json()).applicationId as string
    const [history, audit, snapshot] = await Promise.all([
      prisma.applicationStageHistory.findFirst({ where: { applicationId: assistedId } }),
      prisma.auditLog.findFirst({ where: { resourceId: assistedId, action: 'HR_ASSISTED_APPLICATION_ENTERED' } }),
      prisma.applicationProfileSnapshot.findFirst({ where: { applicationId: assistedId } }),
    ])
    expect(history?.reason).toContain('HR-assisted entry')
    expect(audit?.reason).toContain('internet access')
    expect(snapshot?.profileJson).toContain('_assistedEntry')
    await logout(page)
  })

  test('global search finds scoped phone and ERP records without leaking unrelated candidates', async ({ page }) => {
    const searchableUser = await prisma.user.create({
      data: {
        email: `searchable-${runId}@example.com`,
        phone: `+234801${runId.replace(/\D/g, '').slice(-6).padStart(6, '0')}`,
        passwordHash: 'not-used-in-acceptance-tests',
        emailVerifiedAt: new Date(),
        candidateProfile: {
          create: {
            legalFirstName: 'Searchable',
            lastName: `Scoped${runId}`,
            primaryPhone: `+234902${runId.replace(/\D/g, '').slice(-6).padStart(6, '0')}`,
          },
        },
      },
      include: { candidateProfile: true },
    })
    const hiddenUser = await prisma.user.create({
      data: {
        email: `hidden-${runId}@example.com`,
        passwordHash: 'not-used-in-acceptance-tests',
        emailVerifiedAt: new Date(),
        candidateProfile: {
          create: {
            legalFirstName: 'Hidden',
            lastName: `Leak${runId}`,
            primaryPhone: `HIDDEN-${runId}`,
          },
        },
      },
      include: { candidateProfile: true },
    })
    const scopedVacancy = await createVacancy('search-scoped', fixture.hiringManagerId)
    const hiddenVacancy = await createVacancy('search-hidden', fixture.hrId)
    const scopedApplication = await prisma.application.create({
      data: {
        candidateId: searchableUser.candidateProfile!.id,
        vacancyId: scopedVacancy.id,
        internalStatus: 'TRANSFERRED_TO_ERP',
        candidateVisibleStatus: 'RECRUITMENT_COMPLETED',
        assignedReviewerId: fixture.hiringManagerId,
        submittedAt: new Date(),
      },
    })
    await prisma.eRPTransferRecord.create({
      data: {
        applicationId: scopedApplication.id,
        erpPersonnelNumber: `ERP-${runId}`,
        recordedBy: fixture.hrId,
      },
    })
    await prisma.application.create({
      data: {
        candidateId: hiddenUser.candidateProfile!.id,
        vacancyId: hiddenVacancy.id,
        internalStatus: 'SUBMITTED',
        candidateVisibleStatus: 'APPLICATION_RECEIVED',
        submittedAt: new Date(),
      },
    })

    await login(page, 'hiring.manager@fradfoundation.org')
    const phoneSearch = await page.request.get(
      `/api/recruitment/search?q=${encodeURIComponent(searchableUser.candidateProfile!.primaryPhone!)}`
    )
    expect(phoneSearch.status()).toBe(200)
    expect((await phoneSearch.json()).applications.map((item: { id: string }) => item.id)).toContain(
      scopedApplication.id
    )

    const erpSearch = await page.request.get(`/api/recruitment/search?q=${encodeURIComponent(`ERP-${runId}`)}`)
    expect(erpSearch.status()).toBe(200)
    expect((await erpSearch.json()).applications[0].erpPersonnelNumber).toBe(`ERP-${runId}`)

    const hiddenSearch = await page.request.get(`/api/recruitment/search?q=${encodeURIComponent(`HIDDEN-${runId}`)}`)
    expect(hiddenSearch.status()).toBe(200)
    expect((await hiddenSearch.json()).applications).toEqual([])
    await logout(page)
  })

  test('HR creates, invites, and records an auditable practical assessment outcome', async ({ page }) => {
    const vacancy = await createVacancy('offline-assessment')
    const application = await prisma.application.create({
      data: {
        candidateId: fixture.candidateId,
        vacancyId: vacancy.id,
        internalStatus: 'SHORTLISTED',
        candidateVisibleStatus: 'SHORTLISTED',
        submittedAt: new Date(),
      },
    })

    await login(page, 'hrmanager@fradfoundation.org')
    const create = await page.request.post('/api/recruitment/assessments', {
      data: {
        vacancyId: vacancy.id,
        title: `Practical assessment ${runId}`,
        description: 'Observed practical safeguarding exercise',
        type: 'PRACTICAL',
        durationMinutes: 60,
        passMark: 70,
        maximumAttempts: 1,
        randomizeQuestions: false,
        autoSubmit: false,
        configuration: { deliveryMode: 'OFFLINE', venue: 'FRAD training room' },
        questions: [
          {
            questionType: 'NUMBER',
            prompt: 'Observed practical performance',
            maximumScore: 100,
          },
        ],
      },
    })
    expect(create.status(), await create.text()).toBe(200)
    const assessmentId = (await create.json()).assessment.id as string

    const invite = await page.request.post(`/api/recruitment/assessments/${assessmentId}/invite`, {
      data: { applicationIds: [application.id] },
    })
    expect(invite.status(), await invite.text()).toBe(200)
    const candidateAssessment = await prisma.candidateAssessment.findFirstOrThrow({
      where: { applicationId: application.id, assessmentId },
    })

    const missingEvidence = await page.request.post(
      `/api/recruitment/candidate-assessments/${candidateAssessment.id}/mark`,
      {
        data: { score: 82 },
      }
    )
    expect(missingEvidence.status()).toBe(400)

    const mark = await page.request.post(`/api/recruitment/candidate-assessments/${candidateAssessment.id}/mark`, {
      data: {
        score: 82,
        comment: 'Observed by two assessors; the candidate completed every mandatory safety step.',
        offlineRecord: {
          venue: 'FRAD training room',
          assessedAt: new Date().toISOString(),
          attendance: 'ATTENDED',
          invigilator: 'Acceptance Test Assessor',
          scriptReference: `PRACTICAL-${runId}`,
        },
      },
    })
    expect(mark.status(), await mark.text()).toBe(200)
    const [savedAssessment, savedApplication, audit] = await Promise.all([
      prisma.candidateAssessment.findUniqueOrThrow({ where: { id: candidateAssessment.id } }),
      prisma.application.findUniqueOrThrow({ where: { id: application.id } }),
      prisma.auditLog.findFirst({ where: { resourceId: candidateAssessment.id, action: 'ASSESSMENT_MARKED' } }),
    ])
    expect(savedAssessment.status).toBe('PASSED')
    expect(savedAssessment.markerComment).toContain('two assessors')
    expect(savedApplication.internalStatus).toBe('ASSESSMENT_COMPLETED')
    expect(audit).not.toBeNull()
    await logout(page)
  })

  test('all reports export, schedules are controlled, and due jobs execute once', async ({ page }) => {
    test.setTimeout(180_000)
    const reportTypes = [
      'pipeline',
      'candidate-stages',
      'assessments',
      'interviews',
      'references',
      'offers',
      'preboarding',
      'outstanding',
      'courses',
      'readiness',
      'resumption',
      'erp',
      'waivers',
      'work-items',
      'communications',
      'approvals',
      'audit',
      'privacy-deletions',
      'delivery',
      'data-quality',
    ]
    await login(page, 'auditor@fradfoundation.org')
    for (const report of reportTypes) {
      const response = await page.request.get(`/api/recruitment/reports/export?report=${report}&format=csv`)
      expect(response.status(), `${report}: ${await response.text()}`).toBe(200)
      expect(response.headers()['content-disposition']).toContain(`frad-${report}.csv`)
      expect((await response.body()).length).toBeGreaterThan(0)
    }
    const xlsx = await page.request.get('/api/recruitment/reports/export?report=candidate-stages&format=xlsx')
    expect(xlsx.status()).toBe(200)
    expect(
      Buffer.from(await xlsx.body())
        .subarray(0, 2)
        .toString()
    ).toBe('PK')
    const pdf = await page.request.get('/api/recruitment/reports/export?report=candidate-stages&format=pdf')
    expect(pdf.status()).toBe(200)
    const pdfText = Buffer.from(await pdf.body()).toString()
    expect(pdfText).toContain('FRAD candidate stages report')
    expect(pdfText).not.toContain('undefined')
    const pack = await page.request.get('/api/recruitment/reports/export?report=all&format=zip')
    expect(pack.status()).toBe(200)
    expect(
      Buffer.from(await pack.body())
        .subarray(0, 2)
        .toString()
    ).toBe('PK')
    expect(pack.headers()['content-disposition']).toContain('documentation-pack.zip')
    const restrictedComplaint = await page.request.get('/api/recruitment/reports/export?report=complaints&format=csv')
    expect(restrictedComplaint.status()).toBe(403)
    const restrictedConfiguration = await page.request.get(
      '/api/recruitment/reports/export?report=configuration-changes&format=csv'
    )
    expect(restrictedConfiguration.status()).toBe(403)

    const createSchedule = await page.request.post('/api/recruitment/reports/schedules', {
      data: {
        reportType: 'preboarding',
        format: 'xlsx',
        frequency: 'DAILY',
        recipientEmail: 'auditor@fradfoundation.org',
        nextRunAt: new Date(Date.now() + 86_400_000).toISOString(),
      },
    })
    expect(createSchedule.status(), await createSchedule.text()).toBe(200)
    const scheduleId = (await createSchedule.json()).schedule.id as string
    const schedules = await page.request.get('/api/recruitment/reports/schedules')
    expect(schedules.status()).toBe(200)
    expect((await schedules.json()).schedules.map((item: { id: string }) => item.id)).toContain(scheduleId)
    await logout(page)

    await prisma.scheduledReport.update({
      where: { id: scheduleId },
      data: { nextRunAt: new Date(Date.now() - 60_000) },
    })
    const scheduledVacancy = await createVacancy('scheduled-opening', fixture.hrId, {
      status: 'SCHEDULED',
      openingAt: new Date(Date.now() - 60_000),
      closingAt: new Date(Date.now() + 86_400_000),
    })
    const cron = await page.request.post('/api/cron/process-schedules', {
      headers: { 'x-cron-secret': 'e2e-cron-secret-that-is-at-least-32-characters' },
    })
    expect(cron.status(), await cron.text()).toBe(200)
    const summary = (await cron.json()).summary
    expect(summary.scheduledReportsCount).toBeGreaterThanOrEqual(1)
    expect(summary.openedVacanciesCount).toBeGreaterThanOrEqual(1)
    const [processedSchedule, openedVacancy, queuedDelivery] = await Promise.all([
      prisma.scheduledReport.findUniqueOrThrow({ where: { id: scheduleId } }),
      prisma.vacancy.findUniqueOrThrow({ where: { id: scheduledVacancy.id } }),
      prisma.outboxMessage.findFirst({
        where: { deduplicationKey: { startsWith: `scheduled-report:${scheduleId}:` } },
      }),
    ])
    expect(processedSchedule.lastRunAt).not.toBeNull()
    expect(processedSchedule.nextRunAt.getTime()).toBeGreaterThan(Date.now())
    expect(openedVacancy.status).toBe('OPEN')
    // A production-mode server without SMTP must fail closed while retaining
    // the queued message for retry; SMTP delivery itself is an environment
    // acceptance test, not something E2E should fake or contact externally.
    expect(queuedDelivery?.status).toBe('FAILED')
    expect(queuedDelivery?.lastError).toContain('SMTP transport is not configured')

    await login(page, 'auditor@fradfoundation.org')
    const disable = await page.request.delete('/api/recruitment/reports/schedules', { data: { id: scheduleId } })
    expect(disable.status(), await disable.text()).toBe(200)
    expect((await prisma.scheduledReport.findUniqueOrThrow({ where: { id: scheduleId } })).active).toBe(false)
    await logout(page)
  })
})
