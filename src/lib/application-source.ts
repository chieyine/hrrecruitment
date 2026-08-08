export const APPLICATION_SOURCE_COOKIE = 'frad_application_source'

const SOURCE_ALIASES: Record<string, string> = {
  direct: 'DIRECT',
  careers: 'CAREERS_SITE',
  careers_site: 'CAREERS_SITE',
  linkedin: 'LINKEDIN',
  indeed: 'JOB_BOARD',
  job_board: 'JOB_BOARD',
  referral: 'REFERRAL',
  employee_referral: 'REFERRAL',
  facebook: 'SOCIAL',
  instagram: 'SOCIAL',
  twitter: 'SOCIAL',
  x: 'SOCIAL',
  social: 'SOCIAL',
  partner: 'PARTNER',
  event: 'EVENT',
}

export function normalizeApplicationSource(value: string | null | undefined) {
  if (!value) return 'DIRECT'
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return SOURCE_ALIASES[normalized] || 'OTHER'
}

export function applicationSourceFromCookieHeader(header: string | null) {
  if (!header) return 'DIRECT'
  const value = header
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${APPLICATION_SOURCE_COOKIE}=`))
    ?.split('=')
    .slice(1)
    .join('=')
  if (!value) return 'DIRECT'
  try {
    return normalizeApplicationSource(decodeURIComponent(value))
  } catch {
    // A malformed client-controlled cookie must not prevent an application
    // from being saved. Treat it as unattributed instead.
    return 'OTHER'
  }
}
