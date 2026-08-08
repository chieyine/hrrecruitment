import { describe, expect, it } from 'vitest'
import { homeRouteForRoles } from '@/lib/home-route'

describe('homeRouteForRoles', () => {
  it('opens dashboards for candidates and general recruitment staff', () => {
    expect(homeRouteForRoles(['CANDIDATE'])).toBe('/candidate/dashboard')
    expect(homeRouteForRoles(['RECRUITMENT_OFFICER'])).toBe('/recruitment/dashboard')
    expect(homeRouteForRoles(['HR_MANAGER'])).toBe('/recruitment/dashboard')
  })

  it('keeps single-purpose staff in their own workspace', () => {
    expect(homeRouteForRoles(['SYSTEM_ADMIN'])).toBe('/admin/system-settings')
    expect(homeRouteForRoles(['PANEL_MEMBER'])).toBe('/recruitment/interviews')
    expect(homeRouteForRoles(['APPROVER'])).toBe('/recruitment/approvals')
    expect(homeRouteForRoles(['AUDITOR'])).toBe('/recruitment/audit')
  })

  it('does not let one specialist role override a broader staff assignment', () => {
    expect(homeRouteForRoles(['SYSTEM_ADMIN', 'HR_MANAGER'])).toBe('/admin/system-settings')
    expect(homeRouteForRoles(['APPROVER', 'RECRUITMENT_OFFICER'])).toBe('/recruitment/dashboard')
  })

  it('sends unauthorised role sets to the public careers page', () => {
    expect(homeRouteForRoles([])).toBe('/careers')
    expect(homeRouteForRoles(['PUBLIC'])).toBe('/careers')
  })
})
