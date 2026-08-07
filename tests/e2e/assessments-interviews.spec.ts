import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { login, logout } from './helpers'

const prisma = new PrismaClient()
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

test.describe('Assessments and Interviews', () => {
  test.afterAll(async () => {
    await prisma.$disconnect()
  })

  test('Candidate can start and submit a timed assessment', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')

    const [candidate, department, dutyStation, owner] = await Promise.all([
      prisma.candidateProfile.findFirstOrThrow({
        where: { user: { email: 'candidate@example.com' } },
        select: { id: true },
      }),
      prisma.department.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
      prisma.dutyStation.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'hrmanager@fradfoundation.org' }, select: { id: true } }),
    ])
    const vacancy = await prisma.vacancy.create({
      data: {
        referenceNumber: `ASSESS-E2E-${runId}`,
        title: `Assessment browser fixture ${runId}`,
        departmentId: department.id,
        dutyStationId: dutyStation.id,
        contractType: 'FIXED_TERM',
        summary: 'Browser assessment fixture',
        responsibilities: 'Complete the browser assessment',
        essentialQualifications: 'Acceptance fixture',
        openingAt: new Date(Date.now() - 86_400_000),
        closingAt: new Date(Date.now() + 7 * 86_400_000),
        status: 'OPEN',
        ownerUserId: owner.id,
      },
    })
    const application = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        vacancyId: vacancy.id,
        internalStatus: 'ASSESSMENT_INVITED',
        candidateVisibleStatus: 'ASSESSMENT_INVITED',
        submittedAt: new Date(),
      },
    })
    const assessment = await prisma.assessment.create({
      data: {
        vacancyId: vacancy.id,
        title: `Timed assessment ${runId}`,
        type: 'ONLINE_MCQ',
        durationMinutes: 30,
        passMark: 50,
        questions: {
          create: {
            questionType: 'MCQ',
            prompt: 'Which option is correct?',
            optionsJson: JSON.stringify(['Option A', 'Option B']),
            correctAnswerJson: JSON.stringify('Option A'),
            maximumScore: 1,
            displayOrder: 0,
          },
        },
      },
    })
    await prisma.candidateAssessment.create({
      data: { applicationId: application.id, assessmentId: assessment.id, status: 'INVITED' },
    })

    await login(page, 'candidate@example.com')
    await page.goto('/candidate/tasks')

    const startButton = page.getByRole('link', { name: /start assessment/i }).first()
    await expect(startButton).toBeVisible()
    await startButton.click()
    await page.getByRole('button', { name: /^start assessment$/i }).click()
    await expect(page.getByText(/time remaining/i)).toBeVisible()

    await page.getByRole('radio').first().check()
    await expect(page.getByRole('status')).toContainText(/saved/i)

    await page.getByRole('button', { name: /review and submit/i }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^submit assessment$/i })
      .click()

    await expect(page.getByRole('heading', { name: /completed|submitted/i })).toBeVisible()

    await logout(page)
  })

  test('HR interview workspace exposes scheduling and panel records', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')

    await login(page, 'hrmanager@fradfoundation.org')
    await page.goto('/recruitment/interviews')

    await expect(page.getByRole('heading', { name: /^interviews$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /schedule and invite/i })).toBeVisible()

    await logout(page)
  })
})
