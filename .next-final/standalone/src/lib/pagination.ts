import { AuthzError } from './errors'

/**
 * One pagination contract for every list endpoint.
 *
 * Before this, list routes either returned everything or capped silently with a
 * bare `take` — the applications list stopped at 500 rows with no indication
 * that more existed. Every paginated endpoint now returns the same envelope so
 * the UI can render one set of controls.
 */

export interface PageRequest {
  page: number
  pageSize: number
  skip: number
  take: number
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 200

export function pageRequest(
  input: URLSearchParams | Request,
  { defaultSize = DEFAULT_PAGE_SIZE, maxSize = MAX_PAGE_SIZE } = {}
): PageRequest {
  const params = input instanceof Request ? new URL(input.url).searchParams : input

  const rawPage = params.get('page')
  const rawSize = params.get('pageSize')

  // Reject nonsense rather than silently coercing it: a client asking for
  // page=-1 has a bug worth surfacing.
  const page = rawPage === null ? 1 : Number(rawPage)
  if (!Number.isInteger(page) || page < 1) throw new AuthzError('page must be a positive whole number', 400)

  const requested = rawSize === null ? defaultSize : Number(rawSize)
  if (!Number.isInteger(requested) || requested < 1) {
    throw new AuthzError('pageSize must be a positive whole number', 400)
  }
  const pageSize = Math.min(requested, maxSize)

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export function paginated<T>(items: T[], total: number, request: PageRequest): Paginated<T> {
  return {
    items,
    page: request.page,
    pageSize: request.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / request.pageSize)),
    hasMore: request.page * request.pageSize < total,
  }
}

/**
 * Named for the shape callers expect: some existing endpoints return their rows
 * under a domain key (`vacancies`, `applications`) rather than `items`, and
 * changing those keys would break the pages consuming them.
 */
export function paginatedAs<K extends string, T>(
  key: K,
  items: T[],
  total: number,
  request: PageRequest
): Record<K, T[]> & Omit<Paginated<T>, 'items'> {
  const { items: _ignored, ...meta } = paginated(items, total, request)
  return { [key]: items, ...meta } as Record<K, T[]> & Omit<Paginated<T>, 'items'>
}
