import { test, expect } from '@playwright/test'
import { login, logout, testPassword } from './helpers'

test.describe('Applications and Screening', () => {
  test('Candidate can save an application as a draft and restore it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')

    // Use a dedicated candidate so this draft lifecycle remains independent
    // from submission tests that intentionally consume the seeded application.
    await page.goto('/auth/register')
    const unique = Date.now().toString()
    await page.getByPlaceholder('Aminu').fill('Draft')
    await page.getByPlaceholder('Bello').fill('Candidate')
    await page.getByPlaceholder('name@example.com').fill(`draft-${unique}@example.com`)
    await page.getByPlaceholder('Minimum 8 characters').fill(testPassword)
    await page.getByLabel(/privacy notice/i).check()
    await page.getByLabel(/terms of use/i).check()
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/candidate\/dashboard/)

    const vacanciesResponse = await page.request.get('/api/public/vacancies')
    const vacanciesBody = await vacanciesResponse.json()
    const vacancy = vacanciesBody.vacancies.find(
      (item: { referenceNumber: string }) => item.referenceNumber === 'FRAD-HR-2026-001'
    )

    await page.goto(`/candidate/applications/apply?vacancyId=${vacancy.id}`)
    await expect(page.getByRole('heading', { name: /apply for/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /candidate overview/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /create account/i })).toHaveCount(0)

    await page.getByRole('button', { name: /save draft/i }).click()
    await expect(page.getByRole('status')).toContainText(/draft saved/i)

    await page.goto('/candidate/dashboard')
    const dashboardApplication = page
      .locator('a[href*="/candidate/applications/apply"]')
      .filter({ hasText: vacancy.title })
    await expect(dashboardApplication).toContainText('Draft')
    await expect(dashboardApplication).toContainText('Last saved')
    await expect(dashboardApplication).toHaveAttribute('href', /\/candidate\/applications\/apply\?vacancyId=/)
    await expect(dashboardApplication).not.toContainText('Application submitted')
    await expect(dashboardApplication).not.toContainText('Application received')

    await page.goto('/candidate/applications')
    const listedApplication = page.getByTestId('candidate-application-card').filter({ hasText: vacancy.title })
    await expect(listedApplication).toContainText('Draft')
    await expect(listedApplication.getByRole('link', { name: 'Continue application' })).toBeVisible()

    await logout(page)
  })

  test('HR can open a candidate application record', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')

    await login(page, 'hrmanager@frad.org')
    await page.goto('/recruitment/applications')

    const candidateLink = page
      .getByRole('row', { name: /Aminu Bello/i })
      .first()
      .getByRole('link', { name: /open record/i })
    await expect(candidateLink).toBeVisible()
    await candidateLink.click()
    await expect(page).toHaveURL(/\/recruitment\/applications\//)
    await expect(page.getByRole('heading').first()).toBeVisible()
    await logout(page)
  })
})
