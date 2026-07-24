import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { createEmailChangeToken } from '@/lib/auth'
import { enqueueEmail } from '@/lib/outbox'
import { logAudit } from '@/lib/audit'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('UPDATE_PHONE'), phone: z.string().trim().min(7).max(30) }),
  z.object({ action: z.literal('CHANGE_EMAIL'), email: z.string().trim().toLowerCase().email() }),
  z.object({ action: z.literal('REQUEST_CLOSURE'), reason: z.string().max(2000).optional() }),
  z.object({ action: z.literal('WITHDRAW_CONSENT'), consentType: z.enum(['PRIVACY_NOTICE', 'TERMS_OF_USE']), reason: z.string().max(2000).optional() }),
  z.object({ action: z.literal('SET_TALENT_POOL_CONSENT'), decision: z.boolean() }),
])

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = await parseBody(request, schema)
    const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.userId } })
    if (!profile) return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 })

    if (input.action === 'UPDATE_PHONE') {
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.userId }, data: { phone: input.phone } }),
        prisma.candidateProfile.update({ where: { id: profile.id }, data: { primaryPhone: input.phone } }),
      ])
    } else if (input.action === 'CHANGE_EMAIL') {
      const token = await createEmailChangeToken(user.userId, input.email, user.sessionVersion)
      const appUrl = process.env.APP_URL
      if (!appUrl) throw new Error('APP_URL is required to send email-change links')
      const verificationLink = new URL('/verify-email', appUrl)
      verificationLink.hash = `token=${encodeURIComponent(token)}`
      await enqueueEmail({
        recipient: input.email,
        subject: 'Verify your new FRAD email',
        html: `<p><a href="${verificationLink.toString()}">Verify this email change</a>. The link expires in one hour.</p>`,
        deduplicationKey: `email-change:${user.userId}:${input.email}:${user.sessionVersion}`,
      })
    } else if (input.action === 'SET_TALENT_POOL_CONSENT') {
      if (!input.decision) {
        await prisma.consentRecord.updateMany({
          where: { candidateId: profile.id, consentType: 'TALENT_POOL', withdrawnAt: null },
          data: { withdrawnAt: new Date() },
        })
        await prisma.talentPoolMember.updateMany({
          where: { candidateId: profile.id, status: { in: ['ACTIVE', 'CONTACTED'] } },
          data: { status: 'REMOVED' },
        })
      } else {
        const active = await prisma.consentRecord.findFirst({
          where: { candidateId: profile.id, consentType: 'TALENT_POOL', decision: true, withdrawnAt: null },
        })
        if (!active) await prisma.consentRecord.create({
          data: { candidateId: profile.id, consentType: 'TALENT_POOL', noticeVersion: '2026-07', decision: true },
        })
      }
    } else if (input.action === 'WITHDRAW_CONSENT') {
      const latest = await prisma.consentRecord.findFirst({
        where: { candidateId: profile.id, consentType: input.consentType, withdrawnAt: null },
        orderBy: { decidedAt: 'desc' },
      })
      const now = new Date()
      await prisma.$transaction(async (tx) => {
        if (latest) await tx.consentRecord.update({ where: { id: latest.id }, data: { withdrawnAt: now } })
        const activeApplications = await tx.application.findMany({
          where: {
            candidateId: profile.id,
            internalStatus: { notIn: ['DRAFT', 'WITHDRAWN', 'CANCELLED', 'NOT_SELECTED', 'TRANSFERRED_TO_ERP'] },
          },
          select: { id: true, internalStatus: true },
        })
        for (const application of activeApplications) {
          await tx.application.update({
            where: { id: application.id },
            data: {
              internalStatus: 'WITHDRAWN',
              candidateVisibleStatus: 'WITHDRAWN',
              preboardingStatus: application.internalStatus === 'PREBOARDING' ? 'STOPPED' : undefined,
              lockVersion: { increment: 1 },
            },
          })
          await tx.applicationStageHistory.create({
            data: {
              applicationId: application.id,
              fromStatus: application.internalStatus,
              toStatus: 'WITHDRAWN',
              changedBy: user.userId,
              reason: `Candidate withdrew ${input.consentType} consent`,
            },
          })
        }
        const pending = await tx.dataDeletionRequest.findFirst({ where: { candidateId: profile.id, status: 'PENDING' } })
        if (!pending) await tx.dataDeletionRequest.create({ data: { candidateId: profile.id, reason: input.reason || `Consent withdrawn: ${input.consentType}` } })
      })
    } else {
      const pending = await prisma.dataDeletionRequest.findFirst({ where: { candidateId: profile.id, status: 'PENDING' } })
      if (!pending) await prisma.dataDeletionRequest.create({ data: { candidateId: profile.id, reason: input.reason || null } })
    }

    await logAudit({
      actorUserId: user.userId,
      action: `ACCOUNT_${input.action}`,
      resourceType: 'CandidateProfile',
      resourceId: profile.id,
      newValue: input.action === 'SET_TALENT_POOL_CONSENT' ? { decision: input.decision } : undefined,
    })
    return NextResponse.json({
      success: true,
      message: input.action === 'WITHDRAW_CONSENT'
        ? 'Consent withdrawn. Active recruitment processing has stopped and your data request is awaiting review.'
        : undefined,
    })
  } catch (error) {
    return authzResponse(error)
  }
}
