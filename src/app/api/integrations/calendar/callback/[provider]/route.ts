import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authzResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { exchangeCodeForTokens, isCalendarProvider } from '@/lib/calendar-providers'
import { storeIdentity } from '@/lib/calendar-identity'
import { openSecret } from '@/lib/secret-box'

/**
 * §28.15 OAuth redirect target.
 *
 * The user arrives here from the provider, so this is a browser navigation, not
 * an API call: it always ends in a redirect with a readable status rather than
 * a JSON error the user would never see.
 */

function settled(path: string, status: 'connected' | 'failed', detail?: string) {
  const base = process.env.APP_BASE_URL?.replace(/\/$/, '') || ''
  const url = new URL(`${base}${path}`)
  url.searchParams.set('calendar', status)
  if (detail) url.searchParams.set('reason', detail.slice(0, 200))
  return NextResponse.redirect(url.toString())
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const params = await context.params
  const fallbackPath = '/recruitment/settings'
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const providerError = url.searchParams.get('error_description') || url.searchParams.get('error')

    const provider = params.provider.toUpperCase()
    if (!isCalendarProvider(provider)) return settled(fallbackPath, 'failed', 'Unknown provider')

    // The user declining consent is a normal outcome, not an error to log loudly.
    if (providerError) return settled(fallbackPath, 'failed', providerError)
    if (!code || !state) return settled(fallbackPath, 'failed', 'Missing authorisation response')

    const stored = await prisma.integrationOAuthState.findUnique({ where: { state } })
    if (!stored) return settled(fallbackPath, 'failed', 'This authorisation link is no longer valid')

    // Single-use: consume before doing anything else so a replayed callback
    // cannot mint a second identity.
    const consumed = await prisma.integrationOAuthState.updateMany({
      where: { id: stored.id, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    })
    if (consumed.count !== 1)
      return settled(stored.redirectPath || fallbackPath, 'failed', 'This authorisation link has expired')

    if (stored.provider !== provider)
      return settled(stored.redirectPath || fallbackPath, 'failed', 'Provider mismatch')

    let codeVerifier: string
    try {
      codeVerifier = openSecret(stored.codeVerifierSealed)
    } catch {
      // The encryption key changed between starting and finishing the flow.
      return settled(stored.redirectPath || fallbackPath, 'failed', 'Restart the connection and try again')
    }

    const tokens = await exchangeCodeForTokens({ provider, code, codeVerifier })
    await storeIdentity({
      provider,
      connectionType: stored.connectionType === 'VIDEO_MEETING' ? 'VIDEO_MEETING' : 'CALENDAR',
      userId: stored.userId,
      tokens,
    })

    await logAudit({
      actorUserId: stored.userId,
      action: 'CALENDAR_CONNECTED',
      resourceType: 'IntegrationIdentity',
      resourceId: `${provider}:${stored.userId}`,
      // Scope names are useful evidence; tokens are never logged.
      newValue: { provider, scopes: tokens.scopes, account: tokens.accountEmail },
    })

    return settled(stored.redirectPath || fallbackPath, 'connected')
  } catch (error) {
    logger.error('Calendar OAuth callback failed', {
      provider: params.provider,
      error: error instanceof Error ? error.message : String(error),
    })
    // Never surface a raw provider error into the URL bar beyond a short reason.
    if (error instanceof Error) return settled(fallbackPath, 'failed', error.message)
    return authzResponse(error)
  }
}
