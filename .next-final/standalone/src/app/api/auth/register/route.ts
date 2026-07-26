import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createEmailVerifyToken } from '@/lib/auth'
import { issueSession, attachSession } from '@/lib/session'
import { parseBody, registerSchema } from '@/lib/validation'
import { authzResponse } from '@/lib/authz'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { enqueueEmail } from '@/lib/outbox'

/** One neutral message for both new and already-registered addresses. */
const REGISTRATION_MESSAGE = 'If this email can be registered, check your inbox for the next step.'

export async function POST(request: Request) {
  try {
    const rl = await rateLimitDistributed(`register:${clientIp(request)}`, 5, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const { legalFirstName, lastName, email, phone, password, privacyAccepted, termsAccepted } = await parseBody(
      request,
      registerSchema
    )

    const normalizedEmail = email.toLowerCase().trim()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      if (!existingUser.emailVerifiedAt && existingUser.accountStatus === 'ACTIVE') {
        const verificationToken = await createEmailVerifyToken(existingUser.id)
        const appUrl = process.env.APP_URL
        if (!appUrl) throw new Error('APP_URL is required to send verification links')
        const verificationLink = new URL('/verify-email', appUrl)
        verificationLink.hash = `token=${encodeURIComponent(verificationToken)}`
        const resendWindow = new Date().toISOString().slice(0, 13)
        await enqueueEmail({
          recipient: existingUser.email,
          subject: 'Verify your FRAD Recruitment email',
          html: `<p>Welcome to FRAD Recruitment.</p><p><a href="${verificationLink.toString()}">Verify your email address</a> before submitting an application. This link expires in 24 hours.</p>`,
          deduplicationKey: `email-verification:${existingUser.id}:${resendWindow}`,
        })
      }
      return NextResponse.json({ success: true, message: REGISTRATION_MESSAGE })
    }

    const passwordHash = await hashPassword(password)

    const candidateRole = await prisma.role.upsert({
      where: { name: 'CANDIDATE' },
      update: {},
      create: { name: 'CANDIDATE', description: 'Job applicant and preboarding candidate' },
    })

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        phone: phone || null,
        passwordHash,
        accountStatus: 'ACTIVE',
        emailVerifiedAt: null,
        userRoles: {
          create: {
            roleId: candidateRole.id,
            scopeType: 'GLOBAL',
            scopeId: 'GLOBAL',
            }
        },
        candidateProfile: {
          create: {
            legalFirstName: legalFirstName.trim(),
            lastName: lastName.trim(),
            primaryPhone: phone || null,
            profileCompletionPercentage: 30,
            consentRecords: {
              create: [
                { consentType: 'PRIVACY_NOTICE', noticeVersion: '2026-07', decision: privacyAccepted },
                { consentType: 'TERMS_OF_USE', noticeVersion: '2026-07', decision: termsAccepted },
              ],
            },
          },
        },
      },
    })

    await logAudit({
      actorUserId: user.id,
      action: 'USER_REGISTERED',
      resourceType: 'User',
      resourceId: user.id,
    })

    const verificationToken = await createEmailVerifyToken(user.id)
    const appUrl = process.env.APP_URL
    if (!appUrl) throw new Error('APP_URL is required to send verification links')
    const verificationLink = new URL('/verify-email', appUrl)
    verificationLink.hash = `token=${encodeURIComponent(verificationToken)}`
    await enqueueEmail({
      recipient: user.email,
      subject: 'Verify your FRAD Recruitment email',
      html: `<p>Welcome to FRAD Recruitment.</p><p><a href="${verificationLink.toString()}">Verify your email address</a> before submitting an application. This link expires in 24 hours.</p>`,
      deduplicationKey: `email-verification:${user.id}:${new Date().toISOString().slice(0, 13)}`,
    })

    const roles = ['CANDIDATE']
    const { token } = await issueSession(request, {
      userId: user.id,
      email: user.email,
      roles,
      sessionVersion: user.sessionVersion,
    })

    // The body must be byte-identical to the already-registered response so
    // the endpoint cannot be used to enumerate registered email addresses.
    // The session cookie is what tells a genuinely new user they are signed in.
    return attachSession(NextResponse.json({ success: true, message: REGISTRATION_MESSAGE }), token)
  } catch (err) {
    return authzResponse(err)
  }
}
