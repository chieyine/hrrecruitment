import { test, expect } from '@playwright/test'
import { login, logout } from './helpers'

test.describe('documented specialist personas',()=>{
  test('recruitment officer can run recruitment but cannot administer the system',async({page})=>{
    await login(page,'recruitment.officer@frad.org')
    await page.goto('/recruitment/applications')
    await expect(page.getByRole('heading',{name:'Applications'})).toBeVisible()
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/recruitment\/dashboard/)
    await logout(page)
  })

  test('hiring manager sees assigned scope and cannot export all reports',async({page})=>{
    await login(page,'hiring.manager@frad.org')
    await page.goto('/recruitment/vacancies')
    await expect(page.getByRole('heading',{name:'Vacancies'})).toBeVisible()
    const response=await page.request.get('/api/recruitment/reports/export?report=pipeline&format=csv')
    expect(response.status()).toBe(403)
    await logout(page)
  })

  test('panel member lands on assigned interviews and cannot manage vacancies',async({page})=>{
    await login(page,'panel.member@frad.org')
    await expect(page).toHaveURL(/\/recruitment\/interviews/)
    await page.goto('/recruitment/vacancies')
    await expect(page).toHaveURL(/\/recruitment\/interviews/)
    await logout(page)
  })

  test('approver lands on independent approval queue',async({page})=>{
    await login(page,'approver@frad.org')
    await expect(page).toHaveURL(/\/recruitment\/approvals/)
    await expect(page.getByRole('heading',{name:/pending approvals/i})).toBeVisible()
    await logout(page)
  })

  test('course administrator is limited to course administration',async({page})=>{
    await login(page,'course.admin@frad.org')
    await expect(page).toHaveURL(/\/admin\/courses/)
    await expect(page.getByRole('heading',{name:/compulsory courses/i})).toBeVisible()
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/admin\/courses/)
    await logout(page)
  })

  test('auditor can read audit and exports but cannot change administration',async({page})=>{
    await login(page,'auditor@frad.org')
    await page.goto('/recruitment/audit')
    await expect(page.getByRole('heading',{name:/audit/i})).toBeVisible()
    const response=await page.request.get('/api/recruitment/reports/export?report=waivers&format=csv')
    expect(response.status()).toBe(200)
    await page.goto('/admin/system-settings')
    await expect(page).toHaveURL(/\/recruitment\/dashboard/)
    await logout(page)
  })
})
