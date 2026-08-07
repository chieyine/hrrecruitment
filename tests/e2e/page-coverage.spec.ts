import { test } from '@playwright/test'
import { assertPageRenders, login } from './helpers'

// These are deliberate route inventories, not single-screen smoke tests. On a
// modest laptop the 20–25 authenticated server-rendered pages legitimately
// exceed the suite's normal per-workflow timeout.
test.describe.configure({ timeout: 300_000 })

const candidatePages = [
  '/candidate/dashboard',
  '/candidate/profile',
  '/candidate/profile/personal',
  '/candidate/profile/education',
  '/candidate/profile/employment',
  '/candidate/profile/licences',
  '/candidate/profile/documents',
  '/candidate/applications',
  '/candidate/interviews',
  '/candidate/preboarding',
  '/candidate/preboarding/forms',
  '/candidate/preboarding/documents',
  '/candidate/preboarding/policies',
  '/candidate/preboarding/courses',
  '/candidate/preboarding/tasks',
  '/candidate/preboarding/meetings',
  '/candidate/preboarding/reporting-information',
  '/candidate/tasks',
  '/candidate/messages',
  '/candidate/accommodations',
  '/candidate/complaints',
  '/candidate/settings',
]

const recruitmentPages = [
  '/recruitment/dashboard',
  '/recruitment/work',
  '/recruitment/vacancies',
  '/recruitment/vacancies/new',
  '/recruitment/applications',
  '/recruitment/assessments',
  '/recruitment/interviews',
  '/recruitment/references',
  '/recruitment/selections',
  '/recruitment/approvals',
  '/recruitment/offers',
  '/recruitment/preboarding',
  '/recruitment/accommodations',
  '/recruitment/communications',
  '/recruitment/complaints',
  '/recruitment/talent-pools',
  '/recruitment/reports',
  '/recruitment/quality',
  '/recruitment/audit',
]

const systemAdminPages = [
  '/admin/users',
  '/admin/roles',
  '/admin/permissions',
  '/admin/system-settings',
  '/admin/operating-model',
  '/admin/governance',
  '/admin/deletion-requests',
]

const recruitmentSetupPages = [
  '/admin/departments',
  '/admin/projects',
  '/admin/duty-stations',
  '/admin/contract-types',
  '/admin/document-types',
  '/admin/vacancy-categories',
  '/admin/templates',
  '/admin/notification-templates',
  '/admin/scorecards',
  '/admin/policies',
  '/admin/forms',
  '/admin/tasks',
  '/admin/preboarding-packages',
  '/admin/configuration-releases',
]

const courseAdminPages = ['/admin/courses', '/admin/configuration-releases']

const officerOperationsPages = ['/admin/automations', '/admin/fraud-reports']

test('all candidate workspace pages render for the candidate role', async ({ page }) => {
  await login(page, 'candidate@example.com')
  for (const path of candidatePages) await assertPageRenders(page, path)
})

test('all recruitment workspace pages render for HR', async ({ page }) => {
  await login(page, 'hrmanager@fradfoundation.org')
  for (const path of recruitmentPages) await assertPageRenders(page, path)

  const vacancyResponse = await page.request.get('/api/recruitment/vacancies')
  if (!vacancyResponse.ok())
    throw new Error(`Vacancy API returned ${vacancyResponse.status()}: ${await vacancyResponse.text()}`)
  const vacancyBody = await vacancyResponse.json()
  const vacancyId = vacancyBody.vacancies.find(
    (vacancy: { referenceNumber: string }) => vacancy.referenceNumber === 'FRAD-HR-2026-001'
  )?.id
  if (vacancyId) {
    await assertPageRenders(page, `/recruitment/vacancies/${vacancyId}`)
    await assertPageRenders(page, `/recruitment/vacancies/${vacancyId}/applications`)
  }
})

test('all administration pages render for the system administrator', async ({ page }) => {
  await login(page, 'admin@fradfoundation.org')
  for (const path of systemAdminPages) await assertPageRenders(page, path)
})

test('recruitment setup pages render for the HR manager', async ({ page }) => {
  await login(page, 'hrmanager@fradfoundation.org')
  for (const path of recruitmentSetupPages) await assertPageRenders(page, path)
})

test('learning setup pages render for the course administrator', async ({ page }) => {
  await login(page, 'course.admin@fradfoundation.org')
  for (const path of courseAdminPages) await assertPageRenders(page, path)
})

test('recruitment operations pages render for the Recruitment / HR Officer', async ({ page }) => {
  await login(page, 'recruitment.officer@fradfoundation.org')
  for (const path of officerOperationsPages) await assertPageRenders(page, path)
})
