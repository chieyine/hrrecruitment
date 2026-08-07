import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { login, logout } from './helpers'

const prisma = new PrismaClient()
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

async function accessibilityIssues(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const issues: string[] = []
    if (document.documentElement.lang !== 'en') issues.push('Document language is not English')
    if (!document.querySelector('main#main-content')) issues.push('Missing main-content landmark')
    if (!document.querySelector('h1')) issues.push('Missing level-one heading')
    for (const image of Array.from(document.querySelectorAll('img'))) {
      if (!image.hasAttribute('alt')) issues.push(`Image without alt: ${image.getAttribute('src') || 'unknown'}`)
    }
    for (const control of Array.from(
      document.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea')
    )) {
      const labels = 'labels' in control ? Array.from((control as HTMLInputElement).labels || []) : []
      const named =
        labels.some((label) => Boolean(label.textContent?.trim())) ||
        Boolean(control.getAttribute('aria-label')?.trim()) ||
        Boolean(control.getAttribute('aria-labelledby')?.trim()) ||
        Boolean(control.getAttribute('title')?.trim())
      if (!named)
        issues.push(
          `Unlabelled ${control.tagName.toLowerCase()}: ${control.id || control.getAttribute('name') || 'unknown'}`
        )
    }
    for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('button'))) {
      if (
        !button.textContent?.trim() &&
        !button.getAttribute('aria-label')?.trim() &&
        !button.getAttribute('title')?.trim()
      ) {
        issues.push(`Unnamed button: ${button.outerHTML.slice(0, 120)}`)
      }
    }
    return issues
  })
}

test.describe('accessibility and interrupted-connectivity acceptance', () => {
  test.afterAll(async () => {
    await prisma.$disconnect()
  })

  test('keyboard landmarks, control names, and reduced-motion support work on primary pages', async ({ page }) => {
    await page.goto('/auth/login')
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveText(/skip to main content/i)
    expect(await accessibilityIssues(page)).toEqual([])

    await login(page, 'candidate@example.com')
    await page.goto('/candidate/dashboard')
    expect(await accessibilityIssues(page)).toEqual([])

    await page.emulateMedia({ reducedMotion: 'reduce' })
    const duration = await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.className = 'animate-fade-in'
      document.body.appendChild(probe)
      const value = getComputedStyle(probe).animationDuration
      probe.remove()
      return value
    })
    expect(['0.00001s', '1e-05s', '0s']).toContain(duration)
    await logout(page)
  })

  test('application draft survives an API outage after local autosave', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'State-changing interrupted-connectivity scenario runs once')
    const [hr, department, dutyStation] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: 'hrmanager@fradfoundation.org' }, select: { id: true } }),
      prisma.department.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
      prisma.dutyStation.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
    ])
    const vacancy = await prisma.vacancy.create({
      data: {
        referenceNumber: `OFFLINE-${runId}`,
        title: `Interrupted connectivity ${runId}`,
        departmentId: department.id,
        dutyStationId: dutyStation.id,
        contractType: 'FIXED_TERM',
        summary: 'Low-connectivity acceptance fixture',
        responsibilities: 'Verify local draft recovery',
        essentialQualifications: 'Acceptance fixture qualification',
        openingAt: new Date(Date.now() - 86_400_000),
        closingAt: new Date(Date.now() + 7 * 86_400_000),
        status: 'OPEN',
        ownerUserId: hr.id,
        questions: {
          create: {
            fieldType: 'LONGTEXT',
            label: 'Why are you interested?',
            required: true,
            displayOrder: 0,
          },
        },
      },
    })

    await login(page, 'candidate@example.com')
    await page.goto(`/candidate/applications/apply?vacancyId=${vacancy.id}`)
    const answer = 'This draft must remain available while the application APIs are temporarily unreachable.'
    await page.getByLabel('Why are you interested?').fill(answer)
    await expect
      .poll(async () =>
        page.evaluate((id) => Boolean(localStorage.getItem(`frad-application-draft:${id}`)), vacancy.id)
      )
      .toBe(true)

    await page.route('**/api/**', (route) => route.abort('failed'))
    await page.reload()
    await expect(page.getByText(/connection unavailable.*locally saved application draft/i)).toBeVisible()
    await expect(page.getByLabel('Why are you interested?')).toHaveValue(answer)
    await page.unroute('**/api/**')
    await logout(page)
  })
})
