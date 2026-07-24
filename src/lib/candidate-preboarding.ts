import { prisma } from './prisma'

/** Load the signed-in candidate's most recent preboarding record with all
 *  sub-items resolved (titles included), or null if they have none. */
export async function getMyPreboarding(userId: string) {
  return prisma.candidatePreboarding.findFirst({
    where: { application: { candidate: { userId } } },
    orderBy: { startedAt: 'desc' },
    include: {
      forms: { include: { formTemplate: { select: { title: true, description: true, schemaJson: true } } } },
      documents: { include: { documentRequirement: true } },
      policyAcknowledgements: { include: { policyDocument: { select: { title: true, summary: true, acknowledgementMethod: true, fileAssetId: true } } } },
      courses: {
        include: {
          course: {
            include: {
              quizQuestions: {
                orderBy: { displayOrder: 'asc' },
                select: { id: true, question: true, questionType: true, optionsJson: true, displayOrder: true },
              },
              contents: { orderBy: { displayOrder: 'asc' } },
            },
          },
        },
      },
      tasks: { include: { taskTemplate: true } },
      meetings: true,
      infoItems: true,
    },
  })
}
