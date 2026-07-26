import { expect, Page, test } from '@playwright/test'

export const testPassword = process.env.E2E_TEST_PASSWORD || 'FRAD-E2E-Only-2026!'

export async function login(page: Page, email: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password').fill(testPassword)
  await page.getByRole('button', { name: /^sign in/i }).click()
  await expect(page).not.toHaveURL(/\/auth\/login/)
}

export async function logout(page: Page) {
  await page.context().clearCookies()
  await page.goto('/auth/login')
}

export async function assertPageRenders(page: Page, path: string) {
  await test.step(path, async () => {
    const runtimeErrors: string[] = []
    const onPageError = (error: Error) => runtimeErrors.push(error.message)
    page.on('pageerror', onPageError)
    try {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(response, `No navigation response for ${path}`).not.toBeNull()
      expect(response!.status(), `${path} returned ${response!.status()}`).toBeLessThan(400)
      await expect(page.locator('body')).not.toContainText(/application error|internal server error|this page could not be found/i)
      await expect(page.locator('main').first()).toBeVisible()
      expect(runtimeErrors, `Browser runtime errors on ${path}`).toEqual([])
    } finally {
      page.off('pageerror', onPageError)
    }
  })
}
