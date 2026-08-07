import { prisma } from './prisma'
import { sealSecret, openSecret } from './secret-box'
import { logger } from './logger'
import {
  refreshTokens,
  type CalendarProvider,
  type ProviderTokens,
} from './calendar-providers'

/**
 * Storage and lifecycle for a user's calendar OAuth grant (§28.15).
 *
 * Tokens are sealed with the same AES-256-GCM envelope used for TOTP seeds, so
 * a database dump never yields usable calendar access. Refresh happens lazily
 * on read, which keeps the scheduling paths free of token bookkeeping.
 */

/** Refresh slightly early so a long request cannot expire mid-flight. */
const EXPIRY_MARGIN_MS = 120_000

export async function storeIdentity(input: {
  provider: CalendarProvider
  connectionType: 'CALENDAR' | 'VIDEO_MEETING'
  userId: string
  tokens: ProviderTokens
}) {
  const connection = await prisma.integrationConnection.upsert({
    where: { provider_connectionType: { provider: input.provider, connectionType: input.connectionType } },
    update: { status: 'CONNECTED', lastHealthCheckAt: new Date(), lastHealthStatus: 'OK' },
    create: {
      provider: input.provider,
      connectionType: input.connectionType,
      displayName: input.provider,
      status: 'CONNECTED',
      lastHealthCheckAt: new Date(),
      lastHealthStatus: 'OK',
    },
  })

  return prisma.integrationIdentity.upsert({
    where: { connectionId_userId: { connectionId: connection.id, userId: input.userId } },
    update: {
      providerAccountId: input.tokens.accountId,
      providerEmail: input.tokens.accountEmail,
      scopesJson: JSON.stringify(input.tokens.scopes),
      accessTokenSealed: sealSecret(input.tokens.accessToken),
      refreshTokenSealed: input.tokens.refreshToken ? sealSecret(input.tokens.refreshToken) : null,
      accessTokenExpiresAt: input.tokens.expiresAt,
      status: 'ACTIVE',
      lastError: null,
    },
    create: {
      connectionId: connection.id,
      userId: input.userId,
      providerAccountId: input.tokens.accountId,
      providerEmail: input.tokens.accountEmail,
      scopesJson: JSON.stringify(input.tokens.scopes),
      accessTokenSealed: sealSecret(input.tokens.accessToken),
      refreshTokenSealed: input.tokens.refreshToken ? sealSecret(input.tokens.refreshToken) : null,
      accessTokenExpiresAt: input.tokens.expiresAt,
      status: 'ACTIVE',
    },
    select: { id: true, providerEmail: true, status: true },
  })
}

/**
 * Return a usable access token, refreshing it first if it is close to expiry.
 * Returns null — rather than throwing — when the user simply has no connection,
 * because scheduling must still work without one.
 */
export async function getAccessToken(userId: string, provider: CalendarProvider): Promise<string | null> {
  const identity = await prisma.integrationIdentity.findFirst({
    where: { userId, status: 'ACTIVE', connection: { provider } },
    select: {
      id: true,
      accessTokenSealed: true,
      refreshTokenSealed: true,
      accessTokenExpiresAt: true,
    },
  })
  if (!identity) return null

  const expiresSoon =
    identity.accessTokenExpiresAt !== null &&
    identity.accessTokenExpiresAt.getTime() - Date.now() < EXPIRY_MARGIN_MS

  if (!expiresSoon) {
    try {
      return openSecret(identity.accessTokenSealed)
    } catch (error) {
      // An unopenable token means the encryption key changed. Mark it so an
      // administrator sees the cause instead of a stream of 401s.
      await markIdentityError(identity.id, 'Stored token could not be decrypted; reconnect required')
      logger.error('Calendar token decryption failed', {
        provider,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  if (!identity.refreshTokenSealed) {
    await markIdentityError(identity.id, 'Access token expired and no refresh token is held')
    return null
  }

  try {
    const refreshed = await refreshTokens({ provider, refreshToken: openSecret(identity.refreshTokenSealed) })
    await prisma.integrationIdentity.update({
      where: { id: identity.id },
      data: {
        accessTokenSealed: sealSecret(refreshed.accessToken),
        refreshTokenSealed: refreshed.refreshToken ? sealSecret(refreshed.refreshToken) : identity.refreshTokenSealed,
        accessTokenExpiresAt: refreshed.expiresAt,
        status: 'ACTIVE',
        lastError: null,
        lastSyncAt: new Date(),
      },
    })
    return refreshed.accessToken
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await markIdentityError(identity.id, message)
    logger.error('Calendar token refresh failed', { provider, error: message })
    return null
  }
}

async function markIdentityError(identityId: string, message: string) {
  await prisma.integrationIdentity
    .update({ where: { id: identityId }, data: { status: 'EXPIRED', lastError: message.slice(0, 500) } })
    .catch(() => undefined)
}

export async function listIdentities(userId: string) {
  const identities = await prisma.integrationIdentity.findMany({
    where: { userId },
    select: {
      id: true,
      providerEmail: true,
      status: true,
      lastSyncAt: true,
      lastError: true,
      createdAt: true,
      connection: { select: { provider: true, connectionType: true, displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  // Token material is never included in a listing payload.
  return identities
}

export async function disconnectIdentity(userId: string, identityId: string) {
  const identity = await prisma.integrationIdentity.findFirst({
    where: { id: identityId, userId },
    select: { id: true },
  })
  if (!identity) return null
  return prisma.integrationIdentity.update({
    where: { id: identity.id },
    // Tokens are cleared, not merely flagged: a revoked grant should leave no
    // usable secret behind.
    data: { status: 'REVOKED', accessTokenSealed: sealSecret(''), refreshTokenSealed: null, lastError: null },
    select: { id: true, status: true },
  })
}
