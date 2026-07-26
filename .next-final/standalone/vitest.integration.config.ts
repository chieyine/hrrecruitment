import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Integration tests hit a disposable PostgreSQL database via Prisma. Set
 * TEST_DATABASE_URL (preferred) or DATABASE_URL before running:
 *   npm run test:integration
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    // DB work is serial and can be slower than unit tests.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
