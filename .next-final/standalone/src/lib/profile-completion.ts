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
    ['First name', Boolean(profile.legalFirstName?.trim())],
    ['Last name', Boolean(profile.lastName?.trim())],
    ['Phone number', Boolean(profile.primaryPhone?.trim())],
    ['Nationality', Boolean(profile.nationality?.trim())],
    ['Country of residence', Boolean(profile.countryOfResidence?.trim())],
    ['State', Boolean(profile.state?.trim())],
    ['City or town', Boolean(profile.city?.trim())],
    ['Address', Boolean(profile.address?.trim())],
    ['Preferred contact method', Boolean(profile.preferredContactMethod?.trim())],
    ['Earliest start date', Boolean(profile.earliestStartDate)],
    ['Education record', Boolean(profile.education?.length)],
    ['Employment record', Boolean(profile.employment?.length)],
    ['Reusable document', Boolean(profile.documents?.length)],
    ['Skills', Boolean(profile.skills?.length)],
    ['Languages', Boolean(profile.languages?.length)],
    ['Preferred duty locations', Boolean(profile.preferredDutyLocationsJson && profile.preferredDutyLocationsJson !== '[]')],
  ] as const
  const complete = checks.filter(([, done]) => done).length
  return {
    percentage: Math.round((complete / checks.length) * 100),
    missing: checks.filter(([, done]) => !done).map(([label]) => label),
  }
}
