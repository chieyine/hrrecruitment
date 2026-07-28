import { NextRequest, NextResponse } from 'next/server'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { oidcEnvironment, oidcConfiguration, secureEqual } from '@/lib/oidc'
import { issueSession, attachSession } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { hasStaffRole } from '@/lib/roles'
import { homeRouteForRoles } from '@/lib/home-route'

/**
 * The handshake cookies are written with path '/api/auth/sso'. A delete must
 * repeat that path or the browser keeps the original cookie, leaving a
 * replayable state/verifier/nonce behind for the rest of its 10-minute life.
 */
function clearSsoCookies(response: NextResponse) {
  for (const name of ['frad_sso_state', 'frad_sso_verifier', 'frad_sso_nonce']) {
    response.cookies.set(name, '', { path: '/api/auth/sso', maxAge: 0 })
  }
}

export async function GET(request: NextRequest) {
  const login = new URL('/auth/login', request.url)
  try {
    const code = request.nextUrl.searchParams.get('code'),
      state = request.nextUrl.searchParams.get('state')
    const storedState = request.cookies.get('frad_sso_state')?.value,
      verifier = request.cookies.get('frad_sso_verifier')?.value,
      nonce = request.cookies.get('frad_sso_nonce')?.value
    if (!code || !verifier || !nonce || !secureEqual(state, storedState))
      throw new Error('Invalid or expired SSO response')
    const environment = oidcEnvironment(),
      configuration = await oidcConfiguration(environment.issuer)
    const tokenResponse = await fetch(configuration.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: environment.redirectUri,
        client_id: environment.clientId,
        client_secret: environment.clientSecret,
        code_verifier: verifier,
      }),
    })
    if (!tokenResponse.ok) throw new Error('Identity provider rejected the authorization code')
    const tokens = (await tokenResponse.json()) as { id_token?: string }
    if (!tokens.id_token) throw new Error('Identity provider did not return an ID token')
    const verified = await jwtVerify(tokens.id_token, createRemoteJWKSet(new URL(configuration.jwks_uri)), {
      issuer: environment.issuer,
      audience: environment.clientId,
    })
    const subject = verified.payload.sub,
      email = String(verified.payload.email || '').toLowerCase(),
      emailVerified = verified.payload.email_verified
    if (!subject || !email || emailVerified !== true || !secureEqual(String(verified.payload.nonce || ''), nonce))
      throw new Error('A verified work email and valid SSO nonce are required')
    const allowedDomain = process.env.OIDC_ALLOWED_EMAIL_DOMAIN?.toLowerCase()
    if (allowedDomain && email.split('@').at(-1) !== allowedDomain)
      throw new Error('This email domain is not permitted')
    const linked = await prisma.externalIdentity.findUnique({
      where: { issuer_subject: { issuer: environment.issuer, subject } },
      include: { user: { include: { userRoles: { include: { role: true } } } } },
    })
    const user =
      linked?.user ||
      (await prisma.user.findUnique({ where: { email }, include: { userRoles: { include: { role: true } } } }))
    if (!user || user.accountStatus !== 'ACTIVE' || !hasStaffRole(user.userRoles.map((item) => item.role.name)))
      throw new Error('No active FRAD staff account is linked to this email')
    if (linked && linked.userId !== user.id) throw new Error('SSO identity is linked to another account')
    await prisma.externalIdentity.upsert({
      where: { issuer_subject: { issuer: environment.issuer, subject } },
      update: { lastLoginAt: new Date(), emailAtLink: email },
      create: { userId: user.id, issuer: environment.issuer, subject, emailAtLink: email, lastLoginAt: new Date() },
    })
    const roles = user.userRoles
      .filter((item) => (item.scopeType || 'GLOBAL') === 'GLOBAL')
      .map((item) => item.role.name)
    const { token } = await issueSession(request, {
      userId: user.id,
      email: user.email,
      roles,
      sessionVersion: user.sessionVersion,
    })
    await logAudit({ actorUserId: user.id, action: 'STAFF_SSO_LOGIN', resourceType: 'User', resourceId: user.id })
    const home = homeRouteForRoles(roles)
    const response = attachSession(NextResponse.redirect(new URL(home, request.url)), token)
    clearSsoCookies(response)
    return response
  } catch (error) {
    // Internal reasons (configuration, IdP responses, account state) must never
    // be reflected back through the query string.
    logger.error('Staff SSO callback failed', { error: error instanceof Error ? error.message : String(error) })
    login.searchParams.set('error', 'sso_failed')
    const response = NextResponse.redirect(login)
    clearSsoCookies(response)
    return response
  }
}
