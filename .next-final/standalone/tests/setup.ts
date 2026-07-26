import { vi } from 'vitest'

// Provide test secrets so token/signing helpers work in unit tests.
// Every secret the application reads requires at least 32 characters. The old
// 25-character SESSION_SECRET would have thrown inside lib/s3 the moment a test
// touched file storage or signed-download helpers.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_that_is_at_least_32_chars'
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test_session_secret_at_least_32_chars_long'
process.env.STORAGE_ENCRYPTION_KEY = process.env.STORAGE_ENCRYPTION_KEY || 'test_storage_encryption_key_32_chars_min'
process.env.OUTBOX_ENCRYPTION_KEY = process.env.OUTBOX_ENCRYPTION_KEY || 'test_outbox_encryption_key_32_chars_min!'
process.env.APP_URL = process.env.APP_URL || 'http://localhost:3000'

// next/headers isn't available outside the Next runtime; stub it so modules
// that transitively import it (auth → authz → validation) can be imported.
vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined }),
}))
