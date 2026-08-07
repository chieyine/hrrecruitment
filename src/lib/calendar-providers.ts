import { createHash, randomBytes } from 'crypto'

/**
 * Calendar and video-meeting providers (End_to_End.md §28.15).
 *
 * Provider-specific knowledge — endpoints, scopes, request and response shapes —
 * lives here behind one interface, so the routes that schedule interviews never
 * branch on which provider a user connected.
 *
 * Credentials come from the environment. A provider with no client ID
 * configured reports itself unavailable rather than failing at redirect time.
 */

export const CALENDAR_PROVIDERS = ['MICROSOFT', 'GOOGLE', 'ZOOM'] as const
export type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number]

export interface ProviderTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string[]
  accountId: string
  accountEmail: string | null
}

export interface MeetingRequest {
  subject: string
  description: string
  startAt: Date
  endAt: Date
  timeZone: string
  attendeeEmails: string[]
}

export interface MeetingResult {
  providerEventId: string
  joinUrl: string | null
  htmlLink: string | null
}

export interface BusyWindow {
  startAt: Date
  endAt: Date
}

interface ProviderConfig {
  label: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string[]
  clientIdEnv: string
  clientSecretEnv: string
  /** Zoom issues meetings but is not queried for free/busy. */
  supportsFreeBusy: boolean
  supportsMeetingLink: boolean
}

const CONFIG: Record<CalendarProvider, ProviderConfig> = {
  MICROSOFT: {
    label: 'Microsoft Outlook and Teams',
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['offline_access', 'openid', 'email', 'Calendars.ReadWrite', 'OnlineMeetings.ReadWrite'],
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
    supportsFreeBusy: true,
    supportsMeetingLink: true,
  },
  GOOGLE: {
    label: 'Google Calendar and Meet',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.freebusy'],
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    supportsFreeBusy: true,
    supportsMeetingLink: true,
  },
  ZOOM: {
    label: 'Zoom',
    authorizeUrl: 'https://zoom.us/oauth/authorize',
    tokenUrl: 'https://zoom.us/oauth/token',
    scopes: ['meeting:write', 'user:read'],
    clientIdEnv: 'ZOOM_CLIENT_ID',
    clientSecretEnv: 'ZOOM_CLIENT_SECRET',
    supportsFreeBusy: false,
    supportsMeetingLink: true,
  },
}

export function isCalendarProvider(value: string): value is CalendarProvider {
  return (CALENDAR_PROVIDERS as readonly string[]).includes(value)
}

export function providerLabel(provider: CalendarProvider) {
  return CONFIG[provider].label
}

export function providerCapabilities(provider: CalendarProvider) {
  const config = CONFIG[provider]
  return { supportsFreeBusy: config.supportsFreeBusy, supportsMeetingLink: config.supportsMeetingLink }
}

function credentials(provider: CalendarProvider) {
  const config = CONFIG[provider]
  const clientId = process.env[config.clientIdEnv]
  const clientSecret = process.env[config.clientSecretEnv]
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

/** A provider is only offered once an administrator has configured its app. */
export function isProviderConfigured(provider: CalendarProvider) {
  return credentials(provider) !== null
}

export function configuredProviders(): CalendarProvider[] {
  return CALENDAR_PROVIDERS.filter(isProviderConfigured)
}

function redirectUri(provider: CalendarProvider) {
  const base = process.env.APP_BASE_URL?.replace(/\/$/, '')
  if (!base) throw new Error('APP_BASE_URL must be configured to complete an OAuth redirect')
  return `${base}/api/integrations/calendar/callback/${provider.toLowerCase()}`
}

/** PKCE verifier/challenge. Public clients and confidential clients both benefit. */
export function createPkcePair() {
  const verifier = randomBytes(48).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function buildAuthorizeUrl(input: {
  provider: CalendarProvider
  state: string
  codeChallenge: string
}) {
  const config = CONFIG[input.provider]
  const creds = credentials(input.provider)
  if (!creds) throw new Error(`${config.label} is not configured`)

  const url = new URL(config.authorizeUrl)
  url.searchParams.set('client_id', creds.clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', redirectUri(input.provider))
  url.searchParams.set('state', input.state)
  url.searchParams.set('code_challenge', input.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  if (input.provider !== 'ZOOM') url.searchParams.set('scope', config.scopes.join(' '))
  // Google only returns a refresh token when consent is forced and offline
  // access is requested explicitly.
  if (input.provider === 'GOOGLE') {
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
  }
  return url.toString()
}

async function postForm(url: string, body: URLSearchParams, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', ...headers },
    body,
  })
  const text = await response.text()
  let payload: any = {}
  try {
    payload = JSON.parse(text)
  } catch {
    payload = { raw: text }
  }
  if (!response.ok) {
    // Provider error descriptions are safe to surface to an administrator and
    // are the difference between a fixable and an unfixable integration.
    throw new Error(payload.error_description || payload.error || `Token request failed (${response.status})`)
  }
  return payload
}

function basicAuthHeader(provider: CalendarProvider) {
  const creds = credentials(provider)!
  return { Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}` }
}

function decodeIdTokenEmail(idToken: string | undefined): string | null {
  if (!idToken) return null
  try {
    // The id_token is only read for a display email. It is not used for
    // authentication, so a signature check is not required here.
    const [, payload] = idToken.split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return decoded.email || decoded.preferred_username || null
  } catch {
    return null
  }
}

export async function exchangeCodeForTokens(input: {
  provider: CalendarProvider
  code: string
  codeVerifier: string
}): Promise<ProviderTokens> {
  const creds = credentials(input.provider)
  if (!creds) throw new Error('Provider is not configured')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: redirectUri(input.provider),
    code_verifier: input.codeVerifier,
  })

  // Zoom authenticates the client with HTTP Basic; the others accept form fields.
  const headers = input.provider === 'ZOOM' ? basicAuthHeader(input.provider) : {}
  if (input.provider !== 'ZOOM') {
    body.set('client_id', creds.clientId)
    body.set('client_secret', creds.clientSecret)
  }

  const payload = await postForm(CONFIG[input.provider].tokenUrl, body, headers)
  const accountEmail = decodeIdTokenEmail(payload.id_token)

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: payload.expires_in ? new Date(Date.now() + Number(payload.expires_in) * 1000) : null,
    scopes: String(payload.scope || CONFIG[input.provider].scopes.join(' ')).split(/[\s,]+/).filter(Boolean),
    accountId: payload.account_id || accountEmail || 'unknown',
    accountEmail,
  }
}

export async function refreshTokens(input: {
  provider: CalendarProvider
  refreshToken: string
}): Promise<ProviderTokens> {
  const creds = credentials(input.provider)
  if (!creds) throw new Error('Provider is not configured')

  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: input.refreshToken })
  const headers = input.provider === 'ZOOM' ? basicAuthHeader(input.provider) : {}
  if (input.provider !== 'ZOOM') {
    body.set('client_id', creds.clientId)
    body.set('client_secret', creds.clientSecret)
  }

  const payload = await postForm(CONFIG[input.provider].tokenUrl, body, headers)
  return {
    accessToken: payload.access_token,
    // Providers that rotate refresh tokens return a new one; those that do not
    // expect the original to be reused.
    refreshToken: payload.refresh_token ?? input.refreshToken,
    expiresAt: payload.expires_in ? new Date(Date.now() + Number(payload.expires_in) * 1000) : null,
    scopes: String(payload.scope || '').split(/[\s,]+/).filter(Boolean),
    accountId: payload.account_id || 'unknown',
    accountEmail: null,
  }
}

async function callJson(url: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}
  if (!response.ok) throw new Error(payload.error?.message || payload.message || `Request failed (${response.status})`)
  return payload
}

/** §28.15 Panel availability, read from the connected calendar. */
export async function fetchBusyWindows(input: {
  provider: CalendarProvider
  accessToken: string
  from: Date
  to: Date
}): Promise<BusyWindow[]> {
  if (!CONFIG[input.provider].supportsFreeBusy) return []

  if (input.provider === 'GOOGLE') {
    const payload = await callJson('https://www.googleapis.com/calendar/v3/freeBusy', input.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        timeMin: input.from.toISOString(),
        timeMax: input.to.toISOString(),
        items: [{ id: 'primary' }],
      }),
    })
    const busy = payload.calendars?.primary?.busy ?? []
    return busy.map((slot: any) => ({ startAt: new Date(slot.start), endAt: new Date(slot.end) }))
  }

  const payload = await callJson('https://graph.microsoft.com/v1.0/me/calendar/getSchedule', input.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      schedules: ['me'],
      startTime: { dateTime: input.from.toISOString(), timeZone: 'UTC' },
      endTime: { dateTime: input.to.toISOString(), timeZone: 'UTC' },
      availabilityViewInterval: 30,
    }),
  })
  const items = payload.value?.[0]?.scheduleItems ?? []
  return items.map((item: any) => ({
    startAt: new Date(item.start.dateTime + 'Z'),
    endAt: new Date(item.end.dateTime + 'Z'),
  }))
}

/** §28.15 Create the interview event and, where supported, its meeting link. */
export async function createMeeting(input: {
  provider: CalendarProvider
  accessToken: string
  meeting: MeetingRequest
}): Promise<MeetingResult> {
  const { meeting } = input

  if (input.provider === 'GOOGLE') {
    const payload = await callJson(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      input.accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          summary: meeting.subject,
          description: meeting.description,
          start: { dateTime: meeting.startAt.toISOString(), timeZone: meeting.timeZone },
          end: { dateTime: meeting.endAt.toISOString(), timeZone: meeting.timeZone },
          attendees: meeting.attendeeEmails.map((email) => ({ email })),
          conferenceData: {
            createRequest: { requestId: randomBytes(8).toString('hex'), conferenceSolutionKey: { type: 'hangoutsMeet' } },
          },
        }),
      }
    )
    return {
      providerEventId: payload.id,
      joinUrl: payload.hangoutLink ?? payload.conferenceData?.entryPoints?.[0]?.uri ?? null,
      htmlLink: payload.htmlLink ?? null,
    }
  }

  if (input.provider === 'MICROSOFT') {
    const payload = await callJson('https://graph.microsoft.com/v1.0/me/events', input.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        subject: meeting.subject,
        body: { contentType: 'text', content: meeting.description },
        start: { dateTime: meeting.startAt.toISOString(), timeZone: meeting.timeZone },
        end: { dateTime: meeting.endAt.toISOString(), timeZone: meeting.timeZone },
        attendees: meeting.attendeeEmails.map((email) => ({
          emailAddress: { address: email },
          type: 'required',
        })),
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness',
      }),
    })
    return {
      providerEventId: payload.id,
      joinUrl: payload.onlineMeeting?.joinUrl ?? null,
      htmlLink: payload.webLink ?? null,
    }
  }

  const payload = await callJson('https://api.zoom.us/v2/users/me/meetings', input.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      topic: meeting.subject,
      type: 2,
      start_time: meeting.startAt.toISOString(),
      duration: Math.max(15, Math.round((meeting.endAt.getTime() - meeting.startAt.getTime()) / 60_000)),
      timezone: meeting.timeZone,
      agenda: meeting.description,
      settings: { waiting_room: true, join_before_host: false },
    }),
  })
  return { providerEventId: String(payload.id), joinUrl: payload.join_url ?? null, htmlLink: null }
}

export async function cancelMeeting(input: {
  provider: CalendarProvider
  accessToken: string
  providerEventId: string
}) {
  if (input.provider === 'GOOGLE')
    return callJson(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(input.providerEventId)}?sendUpdates=all`,
      input.accessToken,
      { method: 'DELETE' }
    ).catch(() => null)
  if (input.provider === 'MICROSOFT')
    return callJson(
      `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(input.providerEventId)}`,
      input.accessToken,
      { method: 'DELETE' }
    ).catch(() => null)
  return callJson(`https://api.zoom.us/v2/meetings/${encodeURIComponent(input.providerEventId)}`, input.accessToken, {
    method: 'DELETE',
  }).catch(() => null)
}
