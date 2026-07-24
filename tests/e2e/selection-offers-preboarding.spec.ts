import { test, expect } from '@playwright/test'
import { login, logout } from './helpers'

test.describe('Selection, Offers, and Preboarding', () => {
  test('Selection workspace renders for HR', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')
    
    // We assume a selection has been proposed by one HR member
    await login(page, 'hrmanager@frad.org')
    await page.goto('/recruitment/selections')
    
    await expect(page.getByRole('heading', { name: /selection/i }).first()).toBeVisible()
    await logout(page)
  })

  test('Candidate offers workspace renders the current offer state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')
    
    await login(page, 'candidate@example.com')
    await page.goto('/candidate/offers')
    
    await expect(page.getByRole('heading', { name: /^offers$/i })).toBeVisible()
    await logout(page)
  })

  test('Candidate and HR can open their preboarding workspaces', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')
    
    // Candidate preboarding
    await login(page, 'candidate@example.com')
    await page.goto('/candidate/preboarding')
    
    await expect(page.getByRole('heading', { name: /before you start|preboarding/i })).toBeVisible()
    await logout(page)

    // HR waivers
    await login(page, 'hrmanager@frad.org')
    await page.goto('/recruitment/preboarding')
    
    await expect(page.getByRole('heading', { name: /preboarding/i })).toBeVisible()
    await logout(page)
  })
})
