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
  if (roles.length === 1 && roles[0] === 'AUDITOR') return '/recruitment/audit'
  // §22.3 A Budget Holder only ever confirms money, so the funding queue is the
  // whole of their workspace.
  if (roles.length === 1 && roles[0] === 'BUDGET_HOLDER') return '/recruitment/funding'
  // §22.4 A hiring department representative starts on their own requests.
  if (roles.length === 1 && roles[0] === 'HIRING_MANAGER') return '/recruitment/staffing-requests'
  return '/recruitment/dashboard'
}
