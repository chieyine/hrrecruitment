import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createSessionToken } from '@/lib/auth'
import { parseBody, loginSchema } from '@/lib/validation'
import { authzResponse } from '@/lib/authz'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const ip = clientIp(request)
    // Keep a generous request-volume ceiling for password-hashing protection.
    // Failed credentials are subject to the tighter limits below; successful
    // logins must not lock out legitimate users or automated session renewal.
    const volumeLimit = await rateLimitDistributed(`login-volume:${ip}`, 100, 60_000)
    if (!volumeLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(volumeLimit.retryAfterSeconds) } }
      )
    }

    const { email, password } = await parseBody(request, loginSchema)
    const normalizedEmail = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    })

    if (!user) {
      const [ipLimit, accountLimit] = await Promise.all([
        rateLimitDistributed(`login-failure:${ip}`, 10, 60_000),
        rateLimitDistributed(`login-account-failure:${normalizedEmail}`, 10, 15 * 60_000),
      ])
      if (!ipLimit.allowed || !accountLimit.allowed) {
        const retryAfter = Math.max(ipLimit.retryAfterSeconds, accountLimit.retryAfterSeconds)
        return NextResponse.json(
          { error: 'Too many attempts. Please try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        )
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (user.accountStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account is locked or suspended. Please contact HR.' }, { status: 403 })
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      const [ipLimit, accountLimit] = await Promise.all([
        rateLimitDistributed(`login-failure:${ip}`, 10, 60_000),
        rateLimitDistributed(`login-account-failure:${normalizedEmail}`, 10, 15 * 60_000),
      ])
      await logAudit({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'User',
        resourceId: user.id,
        reason: 'Incorrect password',
      })
      if (!ipLimit.allowed || !accountLimit.allowed) {
        const retryAfter = Math.max(ipLimit.retryAfterSeconds, accountLimit.retryAfterSeconds)
        return NextResponse.json(
          { error: 'Too many attempts. Please try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        )
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const roles = user.userRoles
      .filter((assignment) => (assignment.scopeType || 'GLOBAL') === 'GLOBAL')
      .map((assignment) => assignment.role.name)

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      roles,
      sessionVersion: user.sessionVersion,
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    await logAudit({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'User',
      resourceId: user.id,
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        roles,
      },
    })

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400, // 24h
    })

    return response
  } catch (err) {
    return authzResponse(err)
  }
}
