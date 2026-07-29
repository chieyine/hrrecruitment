import { test, expect } from '@playwright/test'
import { login, logout } from './helpers'

test('candidate submits an application and HR can open its Candidate 360 record', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'State-changing lifecycle is run once; mobile coverage is supplied by the page and access suites.'
  )

  await login(page, 'candidate@example.com')
  const vacanciesResponse = await page.request.get('/api/public/vacancies')
  expect(vacanciesResponse.ok()).toBeTruthy()
  const vacanciesBody = await vacanciesResponse.json()
  const vacancy = vacanciesBody.vacancies.find(
    (item: { referenceNumber: string }) => item.referenceNumber === 'FRAD-HR-2026-001'
  )
  expect(vacancy).toBeTruthy()

  await page.goto(`/candidate/applications/apply?vacancyId=${vacancy.id}`)
  await expect(page.getByRole('heading', { name: /apply for senior human resources officer/i })).toBeVisible()
  await page.getByLabel(/I agree to these declarations/i).check()
  await page.getByRole('button', { name: /review application/i }).click()
  await page
    .getByRole('dialog', { name: /review your application/i })
    .getByRole('button', { name: /go back and edit/i })
    .click()
  await expect(page.getByRole('dialog', { name: /review your application/i })).toHaveCount(0)
  await expect(page).toHaveURL(/#application-edit-form$/)
  await expect(
    page
      .getByTestId('application-edit-form')
      .locator('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])')
      .first()
  ).toBeFocused()
  await expect(page.getByLabel(/I agree to these declarations/i)).toBeChecked()
  await page.getByRole('button', { name: /review application/i }).click()
  await page
    .getByRole('dialog', { name: /review your application/i })
    .getByRole('button', { name: /submit application/i })
    .click()
  await expect(page).toHaveURL(/\/candidate\/applications\/.+\/receipt/)
  await expect(page.getByRole('heading', { name: /thank you for applying/i })).toBeVisible()
  const applicationId = page.url().split('/').at(-2)!

  await page.goto('/candidate/applications')
  await expect(page.getByText('Senior Human Resources Officer')).toBeVisible()
  await expect(page.getByText(/^received$/i).first()).toBeVisible()

  await page.goto(`/careers/${encodeURIComponent(vacancy.referenceNumber)}`)
  await expect(page.getByRole('link', { name: /view application/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /start application/i })).toHaveCount(0)

  await logout(page)
  await login(page, 'hrmanager@frad.org')
  await page.goto('/recruitment/applications')
  await expect(page.getByText(/Aminu/).first()).toBeVisible()
  const preview = await page.request.post('/api/recruitment/applications/bulk-stage-change', {
    data: {
      applicationIds: [applicationId],
      toStatus: 'UNDER_REVIEW',
      candidateVisibleStatus: 'UNDER_REVIEW',
      reason: 'Browser acceptance preview',
      previewOnly: true,
    },
  })
  expect(preview.status(), await preview.text()).toBe(200)
  expect((await preview.json()).eligible).toHaveLength(1)
  const candidateLink = page
    .getByRole('row', { name: /Aminu/i })
    .first()
    .getByRole('link', { name: /open record/i })
  await candidateLink.click()
  await expect(page).toHaveURL(/\/recruitment\/applications\//)
  await expect(page.getByRole('heading').first()).toBeVisible()
  const caseFile = await page.request.get(`/api/recruitment/applications/${applicationId}/documentation`)
  expect(caseFile.status(), await caseFile.text()).toBe(200)
  expect(
    Buffer.from(await caseFile.body())
      .subarray(0, 2)
      .toString()
  ).toBe('PK')
})

test('candidate updates personal information and talent-pool preference', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')
  await login(page, 'candidate@example.com')
  await page.goto('/candidate/profile/personal')

  const phone = page.locator('input[type="tel"]').first()
  await phone.fill('+2348098765432')
  await page.getByRole('button', { name: /save/i }).click()
  await expect(page.getByRole('status')).toContainText(/saved|updated/i)

  await page.goto('/candidate/settings')
  const talentControl = page.getByRole('button', { name: /talent pool/i }).or(page.getByLabel(/talent pool/i))
  await expect(talentControl.first()).toBeVisible()
  await talentControl.first().click()
  await expect(page.getByRole('status')).toBeVisible()
})

test('HR manager creates and removes a recruitment configuration record', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')
  await login(page, 'hrmanager@frad.org')
  await page.goto('/admin/departments')

  await page.getByRole('button', { name: /^add department$/i }).click()
  const unique = Date.now().toString()
  await page.getByLabel('Name').fill(`E2E Department ${unique}`)
  await page.getByLabel('Code').fill(`E2E${unique.slice(-6)}`)
  await page.getByRole('button', { name: /^save$/i }).click()
  await expect(page.getByText(`E2E Department ${unique}`)).toBeVisible()

  const row = page.getByRole('row').filter({ hasText: `E2E Department ${unique}` })
  await row.getByRole('button', { name: /delete/i }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^remove$/i })
    .click()
  await expect(row).toHaveCount(0)
})

test('critical API authorization and health boundaries hold', async ({ page }, testInfo) => {
  const health = await page.request.get('/api/health')
  expect(health.ok()).toBeTruthy()

  const unauthenticatedAdmin = await page.request.get('/api/admin/governance')
  expect([401, 403]).toContain(unauthenticatedAdmin.status())

  await login(page, 'candidate@example.com')
  const candidateAdmin = await page.request.get('/api/admin/governance')
  expect(candidateAdmin.status()).toBe(403)

  await logout(page)
  await login(page, 'hrmanager@frad.org')
  const staffApplications = await page.request.get('/api/recruitment/applications')
  expect(staffApplications.ok(), `${testInfo.project.name}: staff applications endpoint`).toBeTruthy()
})
