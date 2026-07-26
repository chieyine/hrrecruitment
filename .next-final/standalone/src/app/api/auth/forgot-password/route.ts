import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResetToken } from '@/lib/auth'
import { enqueueEmail } from '@/lib/outbox'
import { parseBody, forgotPasswordSchema } from '@/lib/validation'
import { authzResponse } from '@/lib/authz'
import { rateLimitDistributed, clientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const rl = await rateLimitDistributed(`forgot:${clientIp(request)}`, 5, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const { email } = await parseBody(request, forgotPasswordSchema)
    const accountLimit = await rateLimitDistributed(`forgot-account:${email}`, 3, 60 * 60_000)
    if (!accountLimit.allowed) return NextResponse.json({ success: true, message: 'If an account exists with this email, a password reset link has been sent.' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      const token = await createResetToken(user.id, user.sessionVersion)
      const appUrl = process.env.APP_URL
      if (!appUrl) throw new Error('APP_URL is required to send password-reset links')
      const link = new URL('/reset-password', appUrl)
      link.hash = `token=${encodeURIComponent(token)}`
      await enqueueEmail({
        recipient: user.email,
        subject: 'Reset your FRAD Recruitment password',
        html: `<p>We received a request to reset your password.</p>
               <p><a href="${link.toString()}">Reset your password</a> (link expires in 1 hour).</p>
               <p>If you did not request this, you can safely ignore this email.</p>`,
        deduplicationKey: `password-reset:${user.id}:${token.slice(-16)}`,
      })
    }

    // Always generic — never reveal whether an account exists.
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  } catch (err) {
    return authzResponse(err)
  }
}
