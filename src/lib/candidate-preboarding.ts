import { prisma } from './prisma'

/** Load the signed-in candidate's most recent preboarding record with all
 *  sub-items resolved (titles included), or null if they have none. */
export async function getMyPreboarding(userId: string) {
  const preboarding = await prisma.candidatePreboarding.findFirst({
    where: { application: { candidate: { userId } } },
    orderBy: { startedAt: 'desc' },
    include: {
      forms: { include: { formTemplate: { select: { title: true, description: true, schemaJson: true } } } },
      documents: { include: { documentRequirement: true } },
      policyAcknowledgements: {
        include: {
          policyDocument: {
            select: {
              title: true,
              category: true,
              version: true,
              effectiveDate: true,
              summary: true,
              acknowledgementMethod: true,
              fileAssetId: true,
            },
          },
        },
      },
      courses: {
        include: {
          contentProgress: true,
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
  if (!preboarding) return null
  return {
    ...preboarding,
    forms: preboarding.forms.map((form) => ({
      ...form,
      formTemplate: readSnapshot(form.templateSnapshotJson, form.formTemplate),
    })),
    documents: preboarding.documents.map((document) => ({
      ...document,
      documentRequirement: readSnapshot(document.requirementSnapshotJson, document.documentRequirement),
    })),
  }
}

function readSnapshot<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return { ...fallback, ...JSON.parse(value) }
  } catch {
    return fallback
  }
}
