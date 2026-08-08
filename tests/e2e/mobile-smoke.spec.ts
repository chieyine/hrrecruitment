import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('public careers and mobile navigation remain usable', async ({ page }) => {
  const response = await page.goto('/careers', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBeLessThan(400)
  await expect(page.getByRole('heading', { name: /find your next role/i })).toBeVisible()

  await page.getByRole('button', { name: 'Open menu' }).click()
  const mobileNavigation = page.getByRole('navigation', { name: 'Primary mobile' })
  await expect(mobileNavigation).toBeVisible()
  await expect(mobileNavigation.getByRole('link', { name: 'Candidate help' })).toBeVisible()
})

test('candidate can sign in and use the mobile workspace', async ({ page }) => {
  await login(page, 'candidate@example.com')
  await expect(page).toHaveURL(/\/candidate\/dashboard/)
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(
    page.getByRole('navigation', { name: 'Primary mobile' }).getByRole('link', { name: 'Applications' })
  ).toBeVisible()
})

test('HR can sign in and open the responsive recruitment dashboard', async ({ page }) => {
  await login(page, 'hrmanager@fradfoundation.org')
  await expect(page).toHaveURL(/\/recruitment\/dashboard/)
  await expect(page.locator('main').first()).toBeVisible()
})
