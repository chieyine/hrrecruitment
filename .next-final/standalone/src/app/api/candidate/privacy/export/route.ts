import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * A privacy export contains the candidate's own supplied data and the
 * candidate-facing outcome record. It intentionally excludes reviewer notes,
 * scoring evidence, peer deliberations, confidential references, internal
 * snapshots, security metadata, and restricted threads.
 */
export async function GET() {
  try {
    const user = await requireUser()
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.userId },
      select: {
        id: true, legalFirstName: true, middleName: true, lastName: true,
        preferredName: true, nationality: true, countryOfResidence: true,
        state: true, lga: true, city: true, address: true, primaryPhone: true,
        alternatePhone: true, preferredContactMethod: true,
        willingnessToRelocate: true, earliestStartDate: true,
        profileCompletionPercentage: true, createdAt: true, updatedAt: true,
        education: true, employment: true, licences: true, certifications: true,
        skills: true, languages: true, consentRecords: true,
        deletionRequests: {
          select: { id: true, status: true, reason: true, requestedAt: true, decidedAt: true },
        },
        documents: {
          select: {
            id: true, documentType: true, expiryDate: true, status: true,
            createdAt: true,
            fileAsset: {
              select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
            },
          },
        },
        applications: {
          select: {
            id: true, candidateVisibleStatus: true, submittedAt: true,
            createdAt: true, updatedAt: true,
            vacancy: { select: { referenceNumber: true, title: true } },
            answers: {
              select: {
                answerJson: true,
                vacancyQuestion: { select: { label: true, fieldType: true } },
              },
            },
            files: {
              select: {
                fileAsset: {
                  select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
                },
              },
            },
            candidateAssessments: {
              select: {
                id: true, status: true, invitedAt: true, startedAt: true,
                submittedAt: true, score: true, passed: true,
                assessment: { select: { title: true, type: true } },
                answers: {
                  select: {
                    // Candidate-supplied answers belong in the export. Internal
                    // per-answer scores and marker comments are deliberative
                    // recruitment evidence and are intentionally excluded.
                    answerJson: true,
                    assessmentQuestion: { select: { prompt: true, questionType: true } },
                  },
                },
              },
            },
            interviews: {
              select: {
                id: true, title: true, scheduledStart: true, scheduledEnd: true,
                timezone: true, venue: true, meetingLink: true, format: true,
                status: true, candidateResponse: true, candidateComment: true,
              },
            },
            offers: {
              select: {
                id: true, position: true, dutyStation: true, contractType: true,
                contractDuration: true, salary: true, startDate: true, endDate: true,
                probationPeriod: true, reportingLine: true, conditions: true,
                acceptanceDeadline: true, status: true, sentAt: true, viewedAt: true,
                acceptedAt: true, declinedAt: true, candidateComment: true,
                signatureName: true, signatureMethod: true,
              },
            },
            preboardings: {
              select: {
                id: true, status: true, overallCompletionPercentage: true,
                readinessStatus: true, startedAt: true, readyAt: true,
                completedAt: true, confirmedStartDate: true,
                forms: {
                  select: {
                    id: true, responseJson: true, status: true, submittedAt: true,
                    returnReason: true, dueAt: true,
                    formTemplate: { select: { title: true } },
                  },
                },
                documents: {
                  select: {
                    id: true, expiryDate: true, status: true, submittedAt: true,
                    rejectionReason: true, dueAt: true,
                    documentRequirement: { select: { name: true, documentType: true } },
                  },
                },
                policyAcknowledgements: {
                  select: {
                    id: true, status: true, viewedAt: true, acknowledgedAt: true,
                    signedAt: true, signatureMethod: true, signatureData: true,
                    policyDocument: { select: { title: true, version: true } },
                  },
                },
                courses: {
                  select: {
                    id: true, status: true, assignedAt: true, dueAt: true,
                    startedAt: true, completedAt: true, score: true, attempts: true,
                    course: { select: { title: true, version: true } },
                  },
                },
                tasks: {
                  select: {
                    id: true, status: true, assignedAt: true, dueAt: true,
                    submittedAt: true, completedAt: true, candidateComment: true,
                    taskTemplate: { select: { title: true } },
                  },
                },
                infoItems: {
                  select: { category: true, title: true, content: true, acknowledgedAt: true },
                },
                meetings: {
                  select: {
                    title: true, description: true, scheduledStart: true,
                    scheduledEnd: true, timezone: true, venue: true,
                    meetingLink: true, status: true, candidateResponse: true,
                  },
                },
              },
            },
            messageThreads: {
              where: { restricted: false },
              select: {
                subject: true, category: true,
                messages: {
                  select: { senderUserId: true, body: true, sentAt: true, readAt: true },
                },
              },
            },
          },
        },
      },
    })
    if (!profile) throw new AuthzError('Candidate profile not found', 404)

    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.userId,
        email: user.email,
      },
      profile,
    }
    await logAudit({
      actorUserId: user.userId,
      action: 'PRIVACY_DATA_EXPORT',
      resourceType: 'CandidateProfile',
      resourceId: profile.id,
    })
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="frad-personal-data-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    return authzResponse(error)
  }
}
