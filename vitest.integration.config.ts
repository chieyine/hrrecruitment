import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Integration tests hit a real (temp) SQLite database via Prisma. Run on a
 * machine where the Prisma engine is available for your platform:
 *   npm run test:integration
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    env: {
      DATABASE_URL: `file:${path.resolve(__dirname, 'test-integration.db')}`,
    },
    // DB work is serial and can be slower than unit tests.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
