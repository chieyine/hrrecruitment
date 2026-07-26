import { describe, it, expect } from 'vitest'
import { toTsQuery } from '@/lib/search'

/**
 * `toTsQuery` builds the tsquery that goes into a raw SQL search. It is
 * parameterised, so this is not an injection boundary — but a stray operator
 * would still change the meaning of a user's search, so it must be stripped.
 */
describe('toTsQuery', () => {
  it('turns words into ANDed prefix matches', () => {
    expect(toTsQuery('senior nurse')).toBe('senior:* & nurse:*')
  })

  it('lowercases input', () => {
    expect(toTsQuery('Senior NURSE')).toBe('senior:* & nurse:*')
  })

  it('drops tsquery operators that would change the query', () => {
    expect(toTsQuery('nurse | doctor')).toBe('nurse:* & doctor:*')
    expect(toTsQuery('nurse & !doctor')).toBe('nurse:* & doctor:*')
    expect(toTsQuery('nurse <-> doctor')).toBe('nurse:* & doctor:*')
    expect(toTsQuery("nurse'); DROP TABLE users;--")).toBe('nurse:* & drop:* & table:* & users:*')
  })

  it('ignores single characters, which match almost everything', () => {
    expect(toTsQuery('a nurse')).toBe('nurse:*')
    expect(toTsQuery('a')).toBe('')
  })

  it('returns an empty query for input with nothing usable', () => {
    expect(toTsQuery('')).toBe('')
    expect(toTsQuery('   ')).toBe('')
    expect(toTsQuery('!!! ???')).toBe('')
  })

  it('keeps characters that legitimately appear in names and references', () => {
    expect(toTsQuery('FRAD-2026-001')).toBe('frad-2026-001:*')
    expect(toTsQuery("o'brien")).toBe("o'brien:*")
    expect(toTsQuery('ada@example.org')).toBe('ada@example.org:*')
  })

  it('strips leading and trailing punctuation from a term', () => {
    expect(toTsQuery("'nurse'")).toBe('nurse:*')
    expect(toTsQuery('-nurse-')).toBe('nurse:*')
  })

  it('caps the number of terms so one query cannot be unbounded', () => {
    const many = Array.from({ length: 40 }, (_, index) => `term${index}`).join(' ')
    expect(toTsQuery(many).split(' & ')).toHaveLength(12)
  })

  it('handles non-Latin scripts rather than discarding them', () => {
    expect(toTsQuery('naïve café')).toBe('naïve:* & café:*')
  })
})
