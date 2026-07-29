import type { Prisma } from '@prisma/client'

type DatabaseClient = Prisma.TransactionClient

export async function recalculateApplicationReferenceStatus(
  tx: DatabaseClient,
  applicationId: string
) {
  const referees = await tx.referee.findMany({
    where: { applicationId },
    select: {
      contactStatus: true,
      requests: {
        orderBy: [{ sentAt: 'desc' }, { expiresAt: 'desc' }],
        take: 1,
        select: {
          status: true,
          response: { select: { outcome: true, verifiedAt: true } },
        },
      },
    },
  })

  if (!referees.length) return 'NOT_REQUIRED'

  const verifiedOutcomes = referees.flatMap((referee) => {
    const response = referee.requests[0]?.response
    return response?.verifiedAt ? [response.outcome] : []
  })

  const hasOutstanding = referees.some((referee) => {
    if (referee.contactStatus === 'WAIVED') return false
    if (referee.contactStatus === 'UNABLE_TO_CONTACT') return true
    return !referee.requests[0]?.response?.verifiedAt
  })

  let status: string
  if (verifiedOutcomes.includes('UNSATISFACTORY')) status = 'UNSATISFACTORY'
  else if (hasOutstanding) status = 'PENDING'
  else if (verifiedOutcomes.includes('SATISFACTORY_WITH_CONCERNS')) status = 'SATISFACTORY_WITH_CONCERNS'
  else if (verifiedOutcomes.length) status = 'SATISFACTORY'
  else if (referees.every((referee) => referee.contactStatus === 'WAIVED')) status = 'WAIVED'
  else status = 'PENDING'

  await tx.application.update({ where: { id: applicationId }, data: { referenceStatus: status } })
  return status
}
