const APPROVAL_ROLES_BY_RESOURCE: Record<string, readonly string[]> = {
  VACANCY: ['HR_MANAGER'],
  SELECTION: ['HIRING_MANAGER', 'HR_MANAGER', 'APPROVER'],
  OFFER: ['HR_MANAGER', 'APPROVER'],
  // §5.2 A staffing request is reviewed by HR and, where policy requires it,
  // escalated to the executive approver.
  STAFFING_REQUEST: ['HR_MANAGER', 'APPROVER'],
  // §19.1 Only the HR Manager releases a candidate to the ERP.
  ERP_TRANSFER: ['HR_MANAGER'],
  // §11.7 Changing a locked longlisting rule is an HR Manager decision.
  LONGLIST_RULE_CHANGE: ['HR_MANAGER'],
  // §11.6 Overriding an automated longlisting outcome, where configured.
  LONGLIST_OVERRIDE: ['HR_MANAGER'],
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

/**
 * §3.7 Funding authority sits with the Budget Holder — the person with authority
 * over the project, grant, department or budget line. Finance is deliberately not
 * a business approver here, and an HR role must never self-confirm the money for
 * a vacancy it is also recruiting.
 */
export function canConfirmFunding(roles: readonly string[]) {
  return !isTechnicalAccount(roles) && roles.includes('BUDGET_HOLDER')
}

/**
 * §3.6 The hiring department representative raises staffing requests and takes
 * part in assessment, but issues nothing and approves no money.
 */
export function canRaiseStaffingRequest(roles: readonly string[]) {
  return (
    !isTechnicalAccount(roles) &&
    roles.some((role) => role === 'HIRING_MANAGER' || role === 'RECRUITMENT_OFFICER' || role === 'HR_MANAGER')
  )
}

/**
 * §16 Confidential due-diligence findings are restricted. Ordinary panel members
 * and hiring department representatives must never reach them.
 */
export function canReadRestrictedFindings(roles: readonly string[]) {
  return !isTechnicalAccount(roles) && roles.some((role) => role === 'HR_MANAGER' || role === 'RECRUITMENT_OFFICER')
}
