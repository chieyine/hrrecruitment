import { describe, it, expect } from 'vitest'
import { authzResponse, AuthzError } from '@/lib/authz'

/** Shape of the Prisma errors this application actually has to handle. */
function prismaError(code: string) {
  const error = new Error(`Prisma error ${code}`) as Error & { code: string }
  error.code = code
  return error
}

describe('authzResponse', () => {
  it('passes AuthzError status and message through', async () => {
    const response = authzResponse(new AuthzError('Forbidden', 403))
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
  })

  it('maps a unique-constraint violation to 409 rather than 500', async () => {
    const response = authzResponse(prismaError('P2002'))
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: 'A record with these details already exists' })
  })

  it('maps a missing record to 404', async () => {
    expect(authzResponse(prismaError('P2025')).status).toBe(404)
  })

  it('maps a broken foreign key to 400', async () => {
    expect(authzResponse(prismaError('P2003')).status).toBe(400)
  })

  it('never leaks the underlying message for an unexpected error', async () => {
    const response = authzResponse(new Error('connect ECONNREFUSED 10.0.0.5:5432'))
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' })
  })

  it('does not treat an unrelated `code` property as a Prisma code', async () => {
    const error = new Error('boom') as Error & { code: string }
    error.code = 'ECONNRESET'
    expect(authzResponse(error).status).toBe(500)
  })
})
