import { prisma } from './prisma'
import { profileCompletion } from './profile-completion'

export async function refreshProfileCompletion(candidateId: string) {
  const profile = await prisma.candidateProfile.findUnique({
    where: { id: candidateId },
    include: {
      education: { select: { id: true } },
      employment: { select: { id: true } },
      documents: { select: { id: true } },
    },
  })
  if (!profile) return null
  const completion = profileCompletion(profile)
  await prisma.candidateProfile.update({
    where: { id: candidateId },
    data: { profileCompletionPercentage: completion.percentage },
  })
  return completion
}
