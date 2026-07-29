type ProfileForCompletion = {
  legalFirstName?: string | null
  lastName?: string | null
  primaryPhone?: string | null
  nationality?: string | null
  countryOfResidence?: string | null
  state?: string | null
  city?: string | null
  address?: string | null
  preferredContactMethod?: string | null
  earliestStartDate?: Date | string | null
  education?: unknown[]
  employment?: unknown[]
  documents?: unknown[]
  licences?: unknown[]
  certifications?: unknown[]
  skills?: unknown[]
  languages?: unknown[]
  preferredDutyLocationsJson?: string | null
}

export function profileCompletion(profile: ProfileForCompletion | null | undefined) {
  if (!profile) return { percentage: 0, missing: ['Create your candidate profile'] }
  const checks = [
    ['Legal name', Boolean(profile.legalFirstName?.trim() && profile.lastName?.trim())],
    ['Phone number', Boolean(profile.primaryPhone?.trim())],
    ['Current location', Boolean(profile.countryOfResidence?.trim() && profile.city?.trim())],
    ['Education or employment history', Boolean(profile.education?.length || profile.employment?.length)],
    ['Reusable document', Boolean(profile.documents?.length)],
  ] as const
  const complete = checks.filter(([, done]) => done).length
  return {
    percentage: Math.round((complete / checks.length) * 100),
    missing: checks.filter(([, done]) => !done).map(([label]) => label),
  }
}
