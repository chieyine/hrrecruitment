import { describe, expect, it } from 'vitest'
import { hasRequiredRole } from '@/lib/authz'

describe('system administrator role separation', () => {
  it('does not satisfy an HR-only role check', () => {
    expect(hasRequiredRole(['SYSTEM_ADMIN'], ['HR_MANAGER'])).toBe(false)
  })

  it('fails closed when one account has both system-admin and HR roles', () => {
    expect(hasRequiredRole(['SYSTEM_ADMIN', 'HR_MANAGER'], ['HR_MANAGER', 'APPROVER'])).toBe(false)
  })

  it('allows explicit platform-administration checks', () => {
    expect(hasRequiredRole(['SYSTEM_ADMIN'], ['SYSTEM_ADMIN'])).toBe(true)
    expect(hasRequiredRole(['SYSTEM_ADMIN', 'HR_MANAGER'], ['SYSTEM_ADMIN'])).toBe(true)
  })

  it('keeps normal HR and approver role checks unchanged', () => {
    expect(hasRequiredRole(['HR_MANAGER'], ['HR_MANAGER', 'APPROVER'])).toBe(true)
    expect(hasRequiredRole(['APPROVER'], ['HR_MANAGER', 'APPROVER'])).toBe(true)
  })
})
