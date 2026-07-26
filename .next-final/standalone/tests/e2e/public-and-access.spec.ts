import { test, expect } from '@playwright/test'
import { assertPageRenders, login, logout } from './helpers'

const publicPages = [
  '/',
  '/careers',
  '/careers/FRAD-HR-2026-001',
  '/guidance',
  '/privacy',
  '/terms',
  '/recruitment-faq',
  '/complaints',
  '/report-fraud',
  '/auth/login',
  '/auth/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]

test('unknown routes render the branded not-found page with a real 404 status', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: /we could not find that page/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /view open vacancies/i }).first()).toBeVisible()
})

test('candidate guidance renders without a server or runtime error', async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  const response = await page.goto('/guidance', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: /a clear process, from application to start date/i })).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/application error|internal server error/i)
  expect(runtimeErrors).toEqual([])
})

test('every public page renders without a runtime or server error', async ({ page }) => {
  for (const path of publicPages) await assertPageRenders(page, path)
})

test('public complaint and fraud-report submissions complete', async ({ page }, testInfo) => {
  await page.goto('/complaints')
  await page.getByLabel('Short summary').fill(`E2E recruitment support ${testInfo.project.name}`)
  await page.getByLabel(/Contact email/i).fill('anonymous@example.com')
  await page.getByLabel('What happened?').fill('This is a deterministic browser test of the confidential complaint submission workflow.')
  await page.getByRole('button', { name: /submit concern/i }).click()
    await expect(page.getByRole('status')).toContainText(/received|reference/i)

    await page.goto('/report-fraud')
    await page.getByLabel(/how did the person contact you/i).fill('e2e-fraud@example.org')
    await page.getByLabel('What happened?').fill('A deterministic test report describing an impersonation and prohibited recruitment-fee request.')
    await page.getByRole('button', { name: /submit fraud report/i }).click()
  await expect(page.getByRole('status')).toContainText(/received|reference/i)
})

test('protected areas redirect unauthenticated visitors', async ({ page }) => {
  for (const path of ['/candidate/dashboard', '/recruitment/dashboard', '/admin/users']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/auth\/login/)
  }
})

test('candidate can authenticate, sign out, and cannot enter staff or admin workspaces', async ({ page }) => {
  await login(page, 'candidate@example.com')
  await expect(page).toHaveURL(/\/candidate\/dashboard/)

  await page.goto('/recruitment/dashboard')
  await expect(page).toHaveURL(/\/candidate\/dashboard/)
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/candidate\/dashboard/)

  await logout(page)
  await expect(page).toHaveURL(/\/auth\/login/)
})

test('staff can authenticate and is kept out of the candidate workspace', async ({ page }) => {
  await login(page, 'hrmanager@frad.org')
  await page.goto('/recruitment/dashboard')
  await expect(page.getByRole('heading').first()).toBeVisible()
  await page.goto('/candidate/dashboard')
  await expect(page).toHaveURL(/\/recruitment\/dashboard/)
})
