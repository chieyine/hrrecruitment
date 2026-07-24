import { vi } from 'vitest'

// Provide test secrets so token/signing helpers work in unit tests.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_at_least_16_chars_long'
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test_session_secret_value'

// next/headers isn't available outside the Next runtime; stub it so modules
// that transitively import it (auth → authz → validation) can be imported.
vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined }),
}))
