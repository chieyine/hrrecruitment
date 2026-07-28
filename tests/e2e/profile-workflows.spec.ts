import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('candidate profile lifecycle', () => {
  test.skip(({ isMobile }) => isMobile, 'Mutating profile lifecycle runs once on desktop Chromium.')

  test('personal information saves and persists after reload', async ({ page }) => {
    await login(page, 'candidate@example.com')
    await page.goto('/candidate/profile')
    await expect(page.getByRole('link', { name: /edit personal details/i })).toBeVisible()
    await expect(page.getByRole('navigation', { name: /edit profile sections/i })).toBeVisible()
    await page.getByRole('link', { name: /edit personal details/i }).click()
    await expect(page).toHaveURL(/\/candidate\/profile\/personal$/)
    await expect(page.getByRole('link', { name: /candidate overview/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /create account/i })).toHaveCount(0)
    await expect(page.getByLabel('Preferred Name')).toHaveValue('Aminu')
    await page.getByLabel('Preferred Name').fill('Aminu E2E')
    await page.getByLabel('City / Town').fill('Gwagwalada')
    await page.getByLabel('Earliest Available Start Date').fill('2026-09-01')
    await page.getByRole('button', { name: /save personal details/i }).click()
    await expect(page.getByRole('status')).toContainText(/changes saved/i)
    await page.reload()
    await expect(page.getByLabel('Preferred Name')).toHaveValue('Aminu E2E')
    await expect(page.getByLabel('City / Town')).toHaveValue('Gwagwalada')
    await expect(page.getByLabel('Earliest Available Start Date')).toHaveValue('2026-09-01')
  })

  test('education can be created, edited, reloaded, and deleted', async ({ page }) => {
    await login(page, 'candidate@example.com')
    await page.goto('/candidate/profile/education')
    await page.getByRole('button', { name: /add education/i }).click()
    await page.getByLabel('Institution Name').fill('E2E University')
    await page.getByLabel('Field of Study').fill('People Operations')
    await page.getByLabel('Education Start Year').fill('2015')
    await page.getByLabel('Education Completion Year').fill('2019')
    await page.getByLabel('Grade').fill('Distinction')
    await page.getByRole('button', { name: /save record/i }).click()
    await expect(page.getByRole('status')).toContainText(/added/i)
    await expect(page.getByText('E2E University')).toBeVisible()

    await page.getByRole('button', { name: /edit e2e university/i }).click()
    await page.getByLabel('Institution Name').fill('E2E University Updated')
    await page.getByRole('button', { name: /update record/i }).click()
    await expect(page.getByRole('status')).toContainText(/updated/i)
    await page.reload()
    await expect(page.getByText('E2E University Updated')).toBeVisible()

    await page.getByRole('button', { name: /delete e2e university updated/i }).click()
    await page
      .getByRole('dialog', { name: /delete education record/i })
      .getByRole('button', { name: /delete record/i })
      .click()
    await expect(page.getByRole('status')).toContainText(/deleted/i)
    await expect(page.getByText('E2E University Updated')).toHaveCount(0)
  })

  test('employment can be created, edited, reloaded, and deleted', async ({ page }) => {
    await login(page, 'candidate@example.com')
    await page.goto('/candidate/profile/employment')
    await page.getByRole('button', { name: /add experience/i }).click()
    await page.getByLabel('Employer / Organization').fill('E2E Relief Foundation')
    await page.getByLabel('Job Title').fill('Recruitment Assistant')
    await page.getByLabel('Employment Start Date').fill('2020-01-10')
    await page.getByLabel('Employment End Date').fill('2022-06-30')
    await page.getByLabel('Key Responsibilities').fill('Coordinated candidate communications and interview logistics.')
    await page.getByRole('button', { name: /save experience/i }).click()
    await expect(page.getByRole('status')).toContainText(/added/i)

    await page.getByRole('button', { name: /edit recruitment assistant at e2e relief foundation/i }).click()
    await page.getByLabel('Job Title').fill('Recruitment Officer')
    await page.getByRole('button', { name: /update experience/i }).click()
    await expect(page.getByRole('status')).toContainText(/updated/i)
    await page.reload()
    await expect(page.getByText('Recruitment Officer')).toBeVisible()

    await page.getByRole('button', { name: /delete recruitment officer at e2e relief foundation/i }).click()
    await page
      .getByRole('dialog', { name: /delete employment record/i })
      .getByRole('button', { name: /delete record/i })
      .click()
    await expect(page.getByRole('status')).toContainText(/deleted/i)
    await expect(page.getByText('Recruitment Officer')).toHaveCount(0)
  })

  test('licence can be created, edited, reloaded, and deleted', async ({ page }) => {
    await login(page, 'candidate@example.com')
    await page.goto('/candidate/profile/licences')
    await page.getByRole('button', { name: /add licence/i }).click()
    await page.getByLabel('Professional Body').fill('E2E HR Institute')
    await page.getByLabel('Licence / Membership Type').fill('Professional Member')
    await page.getByLabel('Licence Number').fill('E2E-LIC-100')
    await page.getByLabel('Licence Issue Date').fill('2024-01-01')
    await page.getByLabel('Licence Expiry Date').fill('2028-01-01')
    await page.getByRole('button', { name: /save licence/i }).click()
    await expect(page.getByRole('status')).toContainText(/added/i)

    await page.getByRole('button', { name: /edit licence e2e-lic-100/i }).click()
    await page.getByLabel('Licence / Membership Type').fill('Senior Professional Member')
    await page.getByRole('button', { name: /update licence/i }).click()
    await expect(page.getByRole('status')).toContainText(/updated/i)
    await page.reload()
    await expect(page.getByText('Senior Professional Member')).toBeVisible()

    await page.getByRole('button', { name: /delete licence e2e-lic-100/i }).click()
    await page
      .getByRole('dialog', { name: /delete licence/i })
      .getByRole('button', { name: /delete licence/i })
      .click()
    await expect(page.getByRole('status')).toContainText(/deleted/i)
    await expect(page.getByText('Senior Professional Member')).toHaveCount(0)
  })

  test('skills can be added, edited, and deleted', async ({ page }) => {
    await login(page, 'candidate@example.com')
    await page.goto('/candidate/profile')
    const section = page.getByRole('heading', { name: /skills, languages and certifications/i }).locator('..')
    await section.getByPlaceholder('Skill').fill('Workforce planning')
    await section.getByRole('button', { name: /^add$/i }).click()
    await expect(section.getByText('Workforce planning')).toBeVisible()

    const item = section.locator('div').filter({ hasText: 'Workforce planning' }).last()
    await item.getByRole('button', { name: /edit/i }).click()
    await section.getByPlaceholder('Skill').fill('Strategic workforce planning')
    await section.getByRole('button', { name: /^save$/i }).click()
    await expect(section.getByText('Strategic workforce planning')).toBeVisible()
    await section
      .locator('div')
      .filter({ hasText: 'Strategic workforce planning' })
      .last()
      .getByRole('button', { name: /delete/i })
      .click()
    await expect(section.getByText('Strategic workforce planning')).toHaveCount(0)
  })

  test('document can be uploaded, edited, reloaded, and deleted', async ({ page }) => {
    await login(page, 'candidate@example.com')
    await page.goto('/candidate/profile/documents')
    await page.getByRole('button', { name: /upload document/i }).click()
    await page.locator('input[type="file"]').setInputFiles({
      name: 'e2e-profile.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF'),
    })
    await page.getByRole('button', { name: /save document/i }).click()
    await expect(page.getByText('e2e-profile.pdf')).toBeVisible()

    await page.getByRole('button', { name: /edit e2e-profile.pdf/i }).click()
    await page.getByLabel('Edit Document Category').selectOption('ACADEMIC_CERTIFICATE')
    await page.getByLabel('Edit Document Expiry Date').fill('2030-01-01')
    await page.getByRole('button', { name: /save changes/i }).click()
    // Wait for the PATCH and the success state before reloading; otherwise the
    // navigation can abort the in-flight request on a slower first compilation.
    await expect(page.getByRole('status')).toContainText(/updated/i)
    await page.reload()
    await expect(page.getByText('ACADEMIC_CERTIFICATE')).toBeVisible()

    await page.getByRole('button', { name: /delete e2e-profile.pdf/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /^delete$/i }).click()
    await expect(page.getByText('e2e-profile.pdf')).toHaveCount(0)
  })
})
