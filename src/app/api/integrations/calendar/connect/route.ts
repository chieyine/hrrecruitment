import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireStaff, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import {
  CALENDAR_PROVIDERS,
  buildAuthorizeUrl,
  createPkcePair,
  isProviderConfigured,
  providerLabel,
  providerCapabilities,
  configuredProviders,
} from '@/lib/calendar-providers'
import { listIdentities, disconnectIdentity } from '@/lib/calendar-identity'
import { sealSecret } from '@/lib/secret-box'

/** §28.15 Start, list and revoke a calendar / video-meeting connection. */

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('CONNECT'),
    provider: z.enum(CALENDAR_PROVIDERS),
    returnPath: z
      .string()
      .max(500)
      .refine((value) => value.startsWith('/') && !value.startsWith('//'), 'Invalid return path')
      .optional(),
  }),
  z.object({ action: z.literal('DISCONNECT'), identityId: z.string().min(1) }),
])

export async function GET() {
  try {
    const user = await requireStaff()
    return NextResponse.json({
      identities: await listIdentities(user.userId),
      available: configuredProviders().map((provider) => ({
        provider,
        label: providerLabel(provider),
        ...providerCapabilities(provider),
      })),
      // Surfacing what is *not* configured turns a silent absence into an
      // actionable message for the administrator.
      unconfigured: CALENDAR_PROVIDERS.filter((provider) => !isProviderConfigured(provider)),
    })
  } catch (error) {
    return authzResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff()
    const input = await parseBody(request, schema)

    if (input.action === 'DISCONNECT') {
      const result = await disconnectIdentity(user.userId, input.identityId)
      if (!result) throw new AuthzError('Connection not found', 404)
      await logAudit({
        actorUserId: user.userId,
        action: 'CALENDAR_DISCONNECTED',
        resourceType: 'IntegrationIdentity',
        resourceId: input.identityId,
      })
      return NextResponse.json({ success: true })
    }

    if (!isProviderConfigured(input.provider))
      throw new AuthzError(`${providerLabel(input.provider)} has not been configured by an administrator`, 409)

    const { verifier, challenge } = createPkcePair()
    const state = randomBytes(24).toString('base64url')

    // State is single-use and short-lived; an old row must never authorise a
    // later callback.
    await prisma.integrationOAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } })
    await prisma.integrationOAuthState.create({
      data: {
        state,
        userId: user.userId,
        provider: input.provider,
        connectionType: input.provider === 'ZOOM' ? 'VIDEO_MEETING' : 'CALENDAR',
        codeVerifierSealed: sealSecret(verifier),
        redirectPath: input.returnPath || '/recruitment/settings',
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    })

    return NextResponse.json({
      success: true,
      authorizeUrl: buildAuthorizeUrl({ provider: input.provider, state, codeChallenge: challenge }),
    })
  } catch (error) {
    return authzResponse(error)
  }
}
