import { createHash, randomBytes, timingSafeEqual } from 'crypto'

export type OidcConfiguration = { authorization_endpoint: string; token_endpoint: string; jwks_uri: string; issuer: string }

export function oidcEnvironment() {
  const issuer = process.env.OIDC_ISSUER?.replace(/\/$/, '')
  const clientId = process.env.OIDC_CLIENT_ID
  const clientSecret = process.env.OIDC_CLIENT_SECRET
  const appUrl = process.env.APP_URL
  if (!issuer || !clientId || !clientSecret || !appUrl) throw new Error('Staff SSO is not configured')
  if (process.env.NODE_ENV === 'production' && new URL(issuer).protocol !== 'https:') throw new Error('OIDC issuer must use HTTPS in production')
  return { issuer, clientId, clientSecret, redirectUri: `${appUrl}/api/auth/sso/callback` }
}

export async function oidcConfiguration(issuer: string): Promise<OidcConfiguration> {
  const response = await fetch(`${issuer}/.well-known/openid-configuration`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not load identity-provider configuration')
  const configuration = await response.json() as OidcConfiguration
  if (configuration.issuer.replace(/\/$/,'') !== issuer.replace(/\/$/,'')) throw new Error('Identity-provider issuer mismatch')
  if (process.env.NODE_ENV === 'production') {
    for (const endpoint of [configuration.authorization_endpoint, configuration.token_endpoint, configuration.jwks_uri]) {
      if (new URL(endpoint).protocol !== 'https:') throw new Error('OIDC endpoints must use HTTPS in production')
    }
  }
  return configuration
}

export function pkce() {
  const verifier = randomBytes(32).toString('base64url')
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') }
}

export function secureEqual(left?: string | null, right?: string | null) {
  if (!left || !right) return false
  const a=Buffer.from(left),b=Buffer.from(right)
  return a.length===b.length&&timingSafeEqual(a,b)
}
