import { describe, it, expect } from 'vitest'
import { pageRequest, paginated, paginatedAs, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/pagination'
import { AuthzError } from '@/lib/errors'

const params = (query: string) => new URLSearchParams(query)

describe('pageRequest', () => {
  it('defaults to the first page at the default size', () => {
    expect(pageRequest(params(''))).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
    })
  })

  it('computes skip from page and size', () => {
    expect(pageRequest(params('page=3&pageSize=20'))).toMatchObject({ page: 3, pageSize: 20, skip: 40, take: 20 })
  })

  it('clamps an oversized pageSize instead of trusting the client', () => {
    expect(pageRequest(params('pageSize=100000')).pageSize).toBe(MAX_PAGE_SIZE)
  })

  it('honours a caller-supplied maximum', () => {
    expect(pageRequest(params('pageSize=500'), { maxSize: 50 }).pageSize).toBe(50)
  })

  it('rejects nonsense rather than coercing it', () => {
    for (const query of ['page=0', 'page=-1', 'page=abc', 'page=1.5', 'pageSize=0', 'pageSize=-5', 'pageSize=x']) {
      expect(() => pageRequest(params(query)), query).toThrow(AuthzError)
    }
  })

  it('reads the query string straight off a Request', () => {
    const request = new Request('https://example.org/api/list?page=2&pageSize=10')
    expect(pageRequest(request)).toMatchObject({ page: 2, pageSize: 10, skip: 10 })
  })
})

describe('paginated', () => {
  it('reports totals and whether more pages exist', () => {
    const request = pageRequest(params('page=1&pageSize=10'))
    expect(paginated(['a', 'b'], 25, request)).toEqual({
      items: ['a', 'b'],
      page: 1,
      pageSize: 10,
      total: 25,
      totalPages: 3,
      hasMore: true,
    })
  })

  it('knows the last page has no more', () => {
    const request = pageRequest(params('page=3&pageSize=10'))
    expect(paginated(['x'], 25, request).hasMore).toBe(false)
  })

  it('always reports at least one page, even when empty', () => {
    const request = pageRequest(params(''))
    expect(paginated([], 0, request)).toMatchObject({ total: 0, totalPages: 1, hasMore: false })
  })
})

describe('paginatedAs', () => {
  it('puts the rows under a domain key and keeps the metadata', () => {
    const request = pageRequest(params('page=2&pageSize=5'))
    const result = paginatedAs('applications', [{ id: 'a' }], 11, request)
    expect(result.applications).toEqual([{ id: 'a' }])
    expect(result).toMatchObject({ page: 2, pageSize: 5, total: 11, totalPages: 3, hasMore: true })
    // The generic `items` key must not leak alongside the domain key.
    expect(result).not.toHaveProperty('items')
  })
})
