import { describe, expect, it } from 'vitest'
import {
  hashSignaturePayload,
  isCriticalSignature,
  CRITICAL_SIGNATURE_TYPES,
  SIGNABLE_RESOURCE_TYPES,
  SignatureRequiredError,
} from '@/lib/signature-policy'

describe('hashSignaturePayload — §28.10 tamper evidence', () => {
  it('is stable regardless of key order', () => {
    expect(hashSignaturePayload({ a: 1, b: 2 })).toBe(hashSignaturePayload({ b: 2, a: 1 }))
  })

  it('is stable for nested objects too', () => {
    expect(hashSignaturePayload({ outer: { a: 1, b: 2 } })).toBe(hashSignaturePayload({ outer: { b: 2, a: 1 } }))
  })

  it('changes when a value changes', () => {
    // This is what makes a later edit to a signed record detectable.
    expect(hashSignaturePayload({ salary: 100 })).not.toBe(hashSignaturePayload({ salary: 101 }))
  })

  it('changes when a field is added', () => {
    expect(hashSignaturePayload({ a: 1 })).not.toBe(hashSignaturePayload({ a: 1, b: 2 }))
  })

  it('distinguishes null from absent', () => {
    expect(hashSignaturePayload({ a: 1, b: null })).not.toBe(hashSignaturePayload({ a: 1 }))
  })

  it('respects array order', () => {
    expect(hashSignaturePayload([1, 2])).not.toBe(hashSignaturePayload([2, 1]))
  })

  it('does not confuse a number with its string form', () => {
    expect(hashSignaturePayload({ a: 1 })).not.toBe(hashSignaturePayload({ a: '1' }))
  })
})

describe('critical signatures — §28.10', () => {
  it('treats every approval that confers authority as critical', () => {
    for (const type of [
      'FUNDING_CONFIRMATION',
      'OFFER_APPROVAL',
      'FINAL_OFFER',
      'CANDIDATE_ACCEPTANCE',
      'ERP_TRANSFER_APPROVAL',
      'LONGLIST_APPROVAL',
      'SELECTION_RECOMMENDATION',
    ]) {
      expect(isCriticalSignature(type)).toBe(true)
    }
  })

  it('leaves purely informational acknowledgements non-blocking', () => {
    expect(isCriticalSignature('CONFLICT_DECLARATION')).toBe(false)
    expect(isCriticalSignature('REFERENCE_FORM')).toBe(false)
  })

  it('treats an unknown type as non-critical rather than throwing', () => {
    expect(isCriticalSignature('SOMETHING_ELSE')).toBe(false)
  })

  it('only lists types that are actually signable', () => {
    for (const type of CRITICAL_SIGNATURE_TYPES) {
      expect(SIGNABLE_RESOURCE_TYPES).toContain(type)
    }
  })
})

describe('SignatureRequiredError', () => {
  it('says plainly that nothing was saved', () => {
    const error = new SignatureRequiredError('OFFER_APPROVAL')
    expect(error.message).toContain('Nothing has been saved')
    expect(error.name).toBe('SignatureRequiredError')
  })
})
