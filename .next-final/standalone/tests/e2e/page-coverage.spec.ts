import { test } from '@playwright/test'
import { assertPageRenders, login } from './helpers'

const candidatePages = [
  '/candidate/dashboard',
  '/candidate/profile',
  '/candidate/profile/personal',
  '/candidate/profile/education',
  '/candidate/profile/employment',
  '/candidate/profile/licences',
  '/candidate/profile/documents',
  '/candidate/applications',
  '/candidate/assessments',
  '/candidate/interviews',
  '/candidate/offers',
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
  '/recruitment/operations',
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
  '/recruitment/insights',
  '/recruitment/audit',
]

const adminPages = [
  '/admin/users',
  '/admin/roles',
  '/admin/permissions',
  '/admin/departments',
  '/admin/projects',
  '/admin/duty-stations',
  '/admin/contract-types',
  '/admin/document-types',
  '/admin/vacancy-categories',
  '/admin/templates',
  '/admin/notification-templates',
  '/admin/scorecards',
  '/admin/assessment-bank',
  '/admin/interview-questions',
  '/admin/courses',
  '/admin/policies',
  '/admin/forms',
  '/admin/tasks',
  '/admin/preboarding-packages',
  '/admin/system-settings',
  '/admin/operating-model',
  '/admin/governance',
  '/admin/deletion-requests',
  '/admin/automations',
  '/admin/configuration-releases',
]

test('all candidate workspace pages render for the candidate role', async ({ page }) => {
  await login(page, 'candidate@example.com')
  for (const path of candidatePages) await assertPageRenders(page, path)
})

test('all recruitment workspace pages render for HR', async ({ page }) => {
  await login(page, 'hrmanager@frad.org')
  for (const path of recruitmentPages) await assertPageRenders(page, path)

  const vacancyResponse = await page.request.get('/api/recruitment/vacancies')
  if (!vacancyResponse.ok()) throw new Error(`Vacancy API returned ${vacancyResponse.status()}: ${await vacancyResponse.text()}`)
  const vacancyBody = await vacancyResponse.json()
  const vacancyId = vacancyBody.vacancies.find((vacancy: { referenceNumber: string }) => vacancy.referenceNumber === 'FRAD-HR-2026-001')?.id
  if (vacancyId) {
    await assertPageRenders(page, `/recruitment/vacancies/${vacancyId}`)
    await assertPageRenders(page, `/recruitment/vacancies/${vacancyId}/applications`)
  }
})

test('all administration pages render for the system administrator', async ({ page }) => {
  await login(page, 'admin@frad.org')
  for (const path of adminPages) await assertPageRenders(page, path)
})
