import { prisma } from './prisma'

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

/** Recalculate after any screening, assessment, or interview score changes. */
export async function refreshApplicationFinalScore(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { screeningScore: true, assessmentScore: true, interviewScore: true },
  })
  if (!application) return null
  const finalScore = weightedFinalScore(application)
  await prisma.application.update({ where: { id: applicationId }, data: { finalScore } })
  return finalScore
}
