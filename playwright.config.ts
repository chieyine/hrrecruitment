import { defineConfig, devices } from '@playwright/test'

// Use one canonical loopback hostname throughout browser navigation, cookies,
// APIRequestContext calls, and middleware redirects.
// The E2E server binds 127.0.0.1. Using `localhost` here resolved to ::1 first
// on dual-stack machines and produced intermittent connection refusals.
const e2eBaseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:3107'
const localRun = !process.env.E2E_BASE_URL
const testPassword = process.env.E2E_TEST_PASSWORD || 'FRAD-E2E-Only-2026!'
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/frad_e2e'
const localEnvironment = {
  // Prisma schema commands prefer DIRECT_URL when it is configured. Override
  // both values so a local .env cannot redirect destructive E2E setup to a
  // developer or production-like database.
  DATABASE_URL: testDatabaseUrl,
  DIRECT_URL: testDatabaseUrl,
  APP_URL: e2eBaseUrl,
  JWT_SECRET: 'e2e-jwt-secret-that-is-at-least-32-characters',
  SESSION_SECRET: 'e2e-session-secret-that-is-at-least-32-characters',
  STORAGE_ENCRYPTION_KEY: 'e2e-storage-key-that-is-at-least-32-characters',
  OUTBOX_ENCRYPTION_KEY: 'e2e-outbox-key-that-is-at-least-32-characters',
  CRON_SECRET: 'e2e-cron-secret-that-is-at-least-32-characters',
  SEED_PASSWORD: testPassword,
  E2E_TEST_PASSWORD: testPassword,
  STORAGE_LOCAL_PATH: '.storage/e2e',
  VIRUS_SCAN_DRIVER: 'development',
  // E2E delivery must never inherit a developer machine's real SMTP target.
  // The application then uses its deterministic non-production log transport.
  SMTP_HOST: '',
  SMTP_PORT: '',
  SMTP_USER: '',
  SMTP_PASS: '',
}

if (localRun) Object.assign(process.env, localEnvironment)

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: e2eBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /mobile-smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Stateful workflow tests run once on desktop. Re-running all of them on
      // the same seeded database made the mobile pass inherit changed records,
      // retry for 40+ minutes, and hit GitHub's job timeout. Mobile retains a
      // focused responsive/access smoke suite with independent browser state.
      name: 'mobile-chromium',
      testMatch: /mobile-smoke\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: localRun
    ? {
        command: 'node scripts/start-e2e.mjs',
        url: e2eBaseUrl,
        reuseExistingServer: false,
        // A clean production build, schema setup, and seed can take more than
        // ten minutes on a modest laptop. The old six-minute cap killed a
        // healthy bootstrap before Playwright could start.
        timeout: 1_200_000,
        env: localEnvironment,
      }
    : undefined,
})
