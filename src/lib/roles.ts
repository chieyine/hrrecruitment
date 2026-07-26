/**
 * Role classification shared by Edge middleware, server routes and client UI.
 *
 * Do not infer staff access from "not CANDIDATE": PUBLIC and REFEREE are valid
 * roles too, but neither belongs in the recruitment workspace.
 */
export const STAFF_ROLE_NAMES = [
  'RECRUITMENT_OFFICER',
  'HR_MANAGER',
  'HIRING_MANAGER',
  'PANEL_MEMBER',
  'APPROVER',
  'COURSE_ADMIN',
  'SYSTEM_ADMIN',
  'AUDITOR',
] as const

const STAFF_ROLES = new Set<string>(STAFF_ROLE_NAMES)

export function hasStaffRole(roles: readonly string[]): boolean {
  return roles.some((role) => STAFF_ROLES.has(role))
}

export function hasCandidateRole(roles: readonly string[]): boolean {
  return roles.includes('CANDIDATE')
}

export function isCandidateOnly(roles: readonly string[]): boolean {
  return roles.length > 0 && hasCandidateRole(roles) && !hasStaffRole(roles)
}
