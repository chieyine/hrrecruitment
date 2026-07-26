import { prisma } from './prisma'
import { weightedFinalScore } from './recruitment-scoring'

export { DEFAULT_SELECTION_WEIGHTS, weightedFinalScore } from './recruitment-scoring'

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
