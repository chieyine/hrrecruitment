import { AuthzError } from './authz'

/** Recruitment ownership ends at ERP transfer. Only the explicit archive
 * transition may touch a transferred file afterwards. */
export function requireOpenRecruitmentFile(status: string) {
  if (status === 'TRANSFERRED_TO_ERP' || status === 'ARCHIVED')
    throw new AuthzError('This recruitment file is read-only after ERP transfer', 409)
}
