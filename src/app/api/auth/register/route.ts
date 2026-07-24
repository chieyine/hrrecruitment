import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createSessionToken, createEmailVerifyToken } from '@/lib/auth'
import { parseBody, registerSchema } from '@/lib/validation'
import { authzResponse } from '@/lib/authz'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { enqueueEmail } from '@/lib/outbox'

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
      return NextResponse.json({ success: true, message: 'If this email can be registered, check your inbox for the next step.' })
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
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      roles,
      sessionVersion: user.sessionVersion,
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        roles,
      },
      message: 'Registration complete. Check your email to verify your address before applying.',
    })

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    })

    return response
  } catch (err) {
    return authzResponse(err)
  }
}
