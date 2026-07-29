import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { buildOfferDocument } from '@/lib/offer-document'
import { snapshottedOfferBody } from '@/lib/offer-template'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  try {
    const user = await requireUser()
    const [canManage, assignedApproval] = await Promise.all([
      hasPermission(user.userId, 'offer.manage'),
      prisma.approval.findFirst({
        where: {
          resourceType: 'OFFER',
          resourceId: params.id,
          approverUserId: user.userId,
          decision: { in: ['PENDING', 'CONDITIONS_PENDING'] },
        },
        select: { id: true },
      }),
    ])
    if (!canManage && !assignedApproval) throw new AuthzError('Offer preview not found', 404)

    const offer = await prisma.offer.findUnique({
      where: { id: params.id },
      include: {
        offerTemplate: { select: { bodyTemplate: true } },
        application: {
          select: {
            candidate: { select: { legalFirstName: true, lastName: true } },
          },
        },
      },
    })
    if (!offer) throw new AuthzError('Offer preview not found', 404)

    const bytes = buildOfferDocument(
      {
        ...offer,
        candidateName: `${offer.application.candidate.legalFirstName} ${offer.application.candidate.lastName}`,
        templateBody: snapshottedOfferBody(offer.templateSnapshotJson, offer.offerTemplate?.bodyTemplate),
      },
      'PREVIEW'
    )
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="FRAD-offer-preview-${offer.id}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return authzResponse(error)
  }
}
