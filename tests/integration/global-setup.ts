/* eslint-disable no-console -- this module is the intended console sink */
import { execSync } from 'child_process'

/**
 * Applies the PostgreSQL schema to the explicitly configured integration
 * database. The application schema is PostgreSQL-only; pretending a `file:`
 * SQLite URL is a fallback made both local runs and CI fail before collection.
 */
export async function setup() {
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
  if (!databaseUrl || !/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
    throw new Error(
      'Integration tests require TEST_DATABASE_URL or DATABASE_URL pointing to a disposable PostgreSQL database'
    )
  }
  process.env.DATABASE_URL = databaseUrl

  console.log('Applying schema to the configured PostgreSQL integration database...')
  execSync('npx prisma db push --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  })
}
