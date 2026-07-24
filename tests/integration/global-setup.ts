import { execSync } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import path from 'path'

/**
 * Creates a fresh database (or temp SQLite db) and applies the Prisma schema
 * before the integration suite runs.
 */
export async function setup() {
  const dbFile = path.resolve(process.cwd(), 'test-integration.db')
  if (existsSync(dbFile)) unlinkSync(dbFile)

  // Use the CI provided DATABASE_URL if available, otherwise default to local SQLite
  const databaseUrl = process.env.DATABASE_URL || `file:${dbFile}`
  process.env.DATABASE_URL = databaseUrl

  console.log(`Applying schema to ${databaseUrl.split(':')[0]} database...`)
  execSync('npx prisma db push --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  })
}

export async function teardown() {
  const dbFile = path.resolve(process.cwd(), 'test-integration.db')
  if (existsSync(dbFile)) unlinkSync(dbFile)
}
