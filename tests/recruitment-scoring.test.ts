import { describe, expect, it } from 'vitest'
import { weightedFinalScore } from '@/lib/recruitment-scoring'
import { deterministicShuffle } from '@/lib/deterministic-shuffle'

describe('recruitment scoring', () => {
  it('applies the documented screening, assessment and interview weights', () => {
    expect(weightedFinalScore({ screeningScore: 80, assessmentScore: 70, interviewScore: 90 })).toBe(82)
  })

  it('renormalises weights when a configured stage is not used', () => {
    expect(weightedFinalScore({ screeningScore: 80, assessmentScore: null, interviewScore: 90 })).toBe(87.14)
  })

  it('does not invent a score before any component is available', () => {
    expect(weightedFinalScore({ screeningScore: null, assessmentScore: null, interviewScore: null })).toBeNull()
  })
})

describe('assessment randomisation', () => {
  it('is stable for the same assignment and differs across assignments', () => {
    const questions = Array.from({ length: 12 }, (_, index) => `q-${index}`)
    expect(deterministicShuffle(questions, 'assignment-a')).toEqual(deterministicShuffle(questions, 'assignment-a'))
    expect(deterministicShuffle(questions, 'assignment-a')).not.toEqual(deterministicShuffle(questions, 'assignment-b'))
  })
})
