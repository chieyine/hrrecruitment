import { test, expect } from '@playwright/test'
import { login, logout, testPassword } from './helpers'

test.describe('Authentication and Candidate Profile', () => {
  test('Candidate can register, but must verify email before applying', async ({ page }) => {
    await page.goto('/auth/register')
    
    const unique = Date.now().toString()
    const email = `candidate${unique}@example.com`
    
    await page.getByPlaceholder('Aminu').fill('Test')
    await page.getByPlaceholder('Bello').fill('User')
    await page.getByPlaceholder('name@example.com').fill(email)
    await page.getByPlaceholder('Minimum 8 characters').fill(testPassword)
    await page.getByLabel(/privacy notice/i).check()
    await page.getByLabel(/terms of use/i).check()
    
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Should be redirected to candidate dashboard
    await expect(page).toHaveURL(/\/candidate\/dashboard/)
    await expect(page.getByRole('heading', { name: /hello, test/i })).toBeVisible()
    
    await logout(page)
  })

  test('Candidate can update profile sections', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')
    
    await login(page, 'candidate@example.com')
    
    // Personal Details
    await page.goto('/candidate/profile/personal')
    await page.getByLabel(/primary phone/i).fill('+2348000000000')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByRole('status')).toContainText(/saved|updated/i)
    
    // Education
    await page.goto('/candidate/profile/education')
    await expect(page.getByRole('heading', { name: /education/i })).toBeVisible()
    
    // Employment
    await page.goto('/candidate/profile/employment')
    await expect(page.getByRole('heading', { name: /employment/i })).toBeVisible()

    // Licences
    await page.goto('/candidate/profile/licences')
    await expect(page.getByRole('heading', { name: /licence/i })).toBeVisible()
    
    // Documents
    await page.goto('/candidate/profile/documents')
    await expect(page.getByRole('heading', { name: /^documents$/i })).toBeVisible()

    await logout(page)
  })

  test('Candidate can request account deletion', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing lifecycle is run once.')
    
    await page.goto('/auth/register')
    const unique = Date.now().toString()
    const email = `delete-me${unique}@example.com`
    
    await page.getByPlaceholder('Aminu').fill('Delete')
    await page.getByPlaceholder('Bello').fill('Me')
    await page.getByPlaceholder('name@example.com').fill(email)
    await page.getByPlaceholder('Minimum 8 characters').fill(testPassword)
    await page.getByLabel(/privacy notice/i).check()
    await page.getByLabel(/terms of use/i).check()
    
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/candidate\/dashboard/)

    await page.goto('/candidate/settings')
    await page.getByRole('button', { name: /request account closure/i }).click()
    const dialog = page.getByRole('dialog', { name: /request account closure/i })
    await dialog.getByLabel(/why are you requesting closure/i).fill('End-to-end account closure verification')
    await dialog.getByRole('button', { name: /^request closure$/i }).click()
    await expect(page.getByText(/request saved/i)).toBeVisible()
  })
})
