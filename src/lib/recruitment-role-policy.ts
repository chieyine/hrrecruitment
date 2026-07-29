const APPROVAL_ROLES_BY_RESOURCE: Record<string, readonly string[]> = {
  VACANCY: ['HR_MANAGER'],
  SELECTION: ['HIRING_MANAGER', 'HR_MANAGER', 'APPROVER'],
  OFFER: ['HR_MANAGER', 'APPROVER'],
}

function isTechnicalAccount(roles: readonly string[]) {
  return roles.includes('SYSTEM_ADMIN')
}

/** Day-to-day recruitment case and queue work. */
export function canRunRecruitmentOperations(roles: readonly string[]) {
  return !isTechnicalAccount(roles) && roles.some((role) => role === 'RECRUITMENT_OFFICER' || role === 'HR_MANAGER')
}

/** Decisions, exceptions and waivers reserved for the accountable HR manager. */
export function canMakeHrManagerDecision(roles: readonly string[]) {
  return !isTechnicalAccount(roles) && roles.includes('HR_MANAGER')
}

/** Resource-specific approval authority; assignment checks are enforced separately. */
export function canApproveRecruitmentResource(roles: readonly string[], resourceType: string) {
  if (isTechnicalAccount(roles)) return false
  const allowedRoles = APPROVAL_ROLES_BY_RESOURCE[resourceType] || ['HR_MANAGER', 'APPROVER']
  return roles.some((role) => allowedRoles.includes(role))
}
