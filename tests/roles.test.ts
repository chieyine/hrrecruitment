import { describe, expect, it } from 'vitest'
import { hasCandidateRole, hasStaffRole, isCandidateOnly } from '@/lib/roles'

describe('role classification', () => {
  it('recognises every operational staff role', () => {
    expect(hasStaffRole(['RECRUITMENT_OFFICER'])).toBe(true)
    expect(hasStaffRole(['HR_MANAGER'])).toBe(true)
    expect(hasStaffRole(['PANEL_MEMBER'])).toBe(true)
    expect(hasStaffRole(['AUDITOR'])).toBe(true)
  })

  it('does not treat public, referee, empty, or candidate roles as staff', () => {
    expect(hasStaffRole([])).toBe(false)
    expect(hasStaffRole(['PUBLIC'])).toBe(false)
    expect(hasStaffRole(['REFEREE'])).toBe(false)
    expect(hasStaffRole(['CANDIDATE'])).toBe(false)
  })

  it('keeps dual-role staff in the staff workspace', () => {
    const roles = ['CANDIDATE', 'HIRING_MANAGER']
    expect(hasCandidateRole(roles)).toBe(true)
    expect(hasStaffRole(roles)).toBe(true)
    expect(isCandidateOnly(roles)).toBe(false)
  })

  it('requires an actual candidate role for candidate-only routing', () => {
    expect(isCandidateOnly(['CANDIDATE'])).toBe(true)
    expect(isCandidateOnly(['PUBLIC'])).toBe(false)
    expect(isCandidateOnly([])).toBe(false)
  })
})
