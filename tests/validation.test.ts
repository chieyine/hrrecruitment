import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema, vacancySchema } from '@/lib/validation'

describe('validation schemas', () => {
  it('accepts a valid login and lowercases email', () => {
    const r = loginSchema.safeParse({ email: 'Foo@Bar.com', password: 'x' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('foo@bar.com')
  })
  it('rejects a bad email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
  })
  it('enforces password rules on register', () => {
    expect(registerSchema.safeParse({ legalFirstName: 'A', lastName: 'B', email: 'a@b.com', password: 'short' }).success).toBe(false)
    expect(registerSchema.safeParse({ legalFirstName: 'A', lastName: 'B', email: 'a@b.com', password: 'longenough1', privacyAccepted: true, termsAccepted: true }).success).toBe(true)
    expect(registerSchema.safeParse({ legalFirstName: 'A', lastName: 'B', email: 'a@b.com', password: `Valid1${'é'.repeat(40)}`, privacyAccepted: true, termsAccepted: true }).success).toBe(false)
  })
  it('requires closing date after opening date', () => {
    const base = { title: 'T', departmentId: 'd', categoryId: 'c', dutyStationId: 's', numberOfPositions: 1, contractType: 'PERMANENT', summary: 's', responsibilities: 'r', essentialQualifications: 'e' }
    expect(vacancySchema.safeParse({ ...base, openingAt: '2026-02-01', closingAt: '2026-01-01' }).success).toBe(false)
    expect(vacancySchema.safeParse({ ...base, openingAt: '2026-01-01', closingAt: '2026-02-01' }).success).toBe(true)
  })
})
