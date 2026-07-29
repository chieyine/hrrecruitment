import { hasStaffRole, isCandidateOnly } from './roles'

/**
 * One source of truth for the first page a signed-in user sees.
 * General recruitment staff start on the overview; tightly scoped roles start
 * on the only workspace they can use.
 */
export function homeRouteForRoles(roles: readonly string[]): string {
  if (isCandidateOnly(roles)) return '/candidate/dashboard'
  if (roles.includes('SYSTEM_ADMIN')) return '/admin/system-settings'
  if (!hasStaffRole(roles)) return '/careers'
  if (roles.length === 1 && roles[0] === 'PANEL_MEMBER') return '/recruitment/interviews'
  if (roles.length === 1 && roles[0] === 'APPROVER') return '/recruitment/approvals'
  if (roles.length === 1 && roles[0] === 'COURSE_ADMIN') return '/admin/courses'
  if (roles.length === 1 && roles[0] === 'AUDITOR') return '/recruitment/audit'
  return '/recruitment/dashboard'
}
