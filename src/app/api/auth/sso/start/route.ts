import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { oidcEnvironment, oidcConfiguration, pkce } from '@/lib/oidc'
import { logger } from '@/lib/logger'
import { shouldUseSecureCookies } from '@/lib/session'

export async function GET() {
  try {
    const environment = oidcEnvironment()
    const configuration = await oidcConfiguration(environment.issuer)
    const state = randomBytes(24).toString('base64url')
    const nonce = randomBytes(24).toString('base64url')
    const { verifier, challenge } = pkce()
    const url = new URL(configuration.authorization_endpoint)
    url.searchParams.set('client_id', environment.clientId)
    url.searchParams.set('redirect_uri', environment.redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid email profile')
    url.searchParams.set('state', state)
    url.searchParams.set('nonce', nonce)
    url.searchParams.set('code_challenge', challenge)
    url.searchParams.set('code_challenge_method', 'S256')
    url.searchParams.set('prompt', 'select_account')
    const response = NextResponse.redirect(url)
    const options = {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: 'lax' as const,
      path: '/api/auth/sso',
      maxAge: 600,
    }
    response.cookies.set('frad_sso_state', state, options)
    response.cookies.set('frad_sso_verifier', verifier, options)
    response.cookies.set('frad_sso_nonce', nonce, options)
    return response
  } catch (error) {
    // Configuration and discovery failures must not be echoed to the browser.
    logger.error('SSO start failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Staff single sign-on is unavailable' }, { status: 503 })
  }
}
