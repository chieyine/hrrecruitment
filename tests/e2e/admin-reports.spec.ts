import { test, expect } from '@playwright/test'
import { login, logout } from './helpers'

test.describe('Admin and Reports', () => {
  test('HR manager owns recruitment reference data', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')

    await login(page, 'hrmanager@fradfoundation.org')

    // Duty Stations
    await page.goto('/admin/duty-stations')
    await page.getByRole('button', { name: /^add duty station$/i }).click()
    const unique = Date.now().toString()
    await page.getByLabel('Name').fill(`Station ${unique}`)
    await page.getByLabel('State').fill(`STN${unique.slice(-4)}`)
    await page.getByRole('button', { name: /^save$/i }).click()
    await expect(page.getByText(`Station ${unique}`)).toBeVisible()

    await logout(page)

    await login(page, 'admin@fradfoundation.org')
    await page.goto('/admin/deletion-requests')
    await expect(page.getByRole('heading', { name: /deletion requests/i })).toBeVisible()

    await logout(page)
  })

  test('HR can export pipeline reports and manage My Work queue', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')

    await login(page, 'hrmanager@fradfoundation.org')

    // Reports
    await page.goto('/recruitment/reports')
    await page.getByRole('link', { name: /^downloads$/i }).click()
    const exportCSV = page.locator('a[href*=\"report=pipeline\"][href*=\"format=csv\"]')
    await expect(exportCSV).toBeVisible()
    const downloadPromise = page.waitForEvent('download')
    await exportCSV.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.csv')

    // My Work SLA Queue
    await page.goto('/recruitment/work')
    await expect(page.getByRole('heading', { name: /my work/i })).toBeVisible()
    await logout(page)
  })

  test('administration workflows use structured, accessible forms', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop administration interaction is covered once.')

    await login(page, 'admin@fradfoundation.org')

    await page.goto('/admin/governance')
    await page.getByRole('button', { name: /place hold/i }).click()
    const holdDialog = page.getByRole('dialog', { name: /place legal hold/i })
    await expect(holdDialog.getByLabel(/resource type/i)).toBeVisible()
    await expect(holdDialog.getByLabel(/resource id/i)).toBeVisible()
    await expect(holdDialog.getByLabel(/^reason/i)).toBeVisible()
    await holdDialog.getByRole('button', { name: /cancel/i }).click()

    await page.goto('/admin/operating-model')
    await page
      .getByRole('button', { name: /propose change/i })
      .first()
      .click()
    const targetDialog = page.getByRole('dialog', { name: /propose service target change/i })
    await expect(targetDialog.getByLabel(/new target in minutes/i)).toBeVisible()
    await expect(targetDialog.getByLabel(/reason for change/i)).toBeVisible()
    await targetDialog.getByRole('button', { name: /cancel/i }).click()

    await logout(page)
    await login(page, 'course.admin@fradfoundation.org')
    await page.goto('/admin/courses')
    await page.getByRole('combobox', { name: /course/i }).selectOption({ index: 1 })
    await page.getByRole('button', { name: /add quiz question/i }).click()
    const quizDialog = page.getByRole('dialog', { name: /add quiz question/i })
    await expect(quizDialog.getByLabel(/question type/i)).toBeVisible()
    await expect(quizDialog.getByLabel(/^question$/i)).toBeVisible()
    await expect(quizDialog.getByLabel(/answer options/i)).toBeVisible()
    await quizDialog.getByRole('button', { name: /cancel/i }).click()

    await logout(page)
  })
})
