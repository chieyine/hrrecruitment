/**
 * Pure selection-scoring maths. This module must not import Prisma: it is
 * loaded by unit tests, and pulling the client in at import time spawned a
 * database engine (and an unhandled rejection) for a pure calculation.
 * The database-backed helper lives in ./recruitment-scoring.server.
 */

export const DEFAULT_SELECTION_WEIGHTS = {
  screening: 20,
  assessment: 30,
  interview: 50,
} as const

export function weightedFinalScore(input: {
  screeningScore: number | null
  assessmentScore: number | null
  interviewScore: number | null
}) {
  const parts = [
    [input.screeningScore, DEFAULT_SELECTION_WEIGHTS.screening],
    [input.assessmentScore, DEFAULT_SELECTION_WEIGHTS.assessment],
    [input.interviewScore, DEFAULT_SELECTION_WEIGHTS.interview],
  ] as const
  const available = parts.filter((part) => part[0] !== null)
  if (!available.length) return null
  const weight = available.reduce((sum, part) => sum + part[1], 0)
  return Math.round((available.reduce((sum, [score, partWeight]) => sum + (score ?? 0) * partWeight, 0) / weight) * 100) / 100
}
