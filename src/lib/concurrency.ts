import { AuthzError } from './errors'

export function expectedVersion(request: Request, body?: Record<string, unknown>): number | null {
  const raw = request.headers.get('if-match')?.replace(/^(W\/)?"|"$/g, '') ?? body?.lockVersion
  if (raw === undefined || raw === null || raw === '') return null
  const version = Number(raw)
  if (!Number.isInteger(version) || version < 1) throw new AuthzError('Invalid record version', 400)
  return version
}

export function staleRecord(): never {
  throw new AuthzError('This record changed after it was loaded. Refresh and retry your update.', 409)
}
