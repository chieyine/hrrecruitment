import { execFileSync } from 'child_process'
import { existsSync, readFileSync, readdirSync, unlinkSync } from 'fs'
import path from 'path'

/**
 * Creates a fresh temp SQLite database and applies the Prisma schema to it
 * before the integration suite runs, then removes it afterwards.
 */
export async function setup() {
  const dbFile = path.resolve(process.cwd(), 'test-integration.db')
  if (existsSync(dbFile)) unlinkSync(dbFile)

  const databaseUrl = `file:${dbFile}`
  process.env.DATABASE_URL = databaseUrl
  // Apply every checked-in migration directly. This avoids Prisma 5's macOS
  // schema-engine/Node 24 startup bug while tests still execute through Prisma.
  const migrationsDir = path.resolve(process.cwd(), 'prisma/migrations')
  const migrations = readdirSync(migrationsDir)
    .map((name) => path.join(migrationsDir, name, 'migration.sql'))
    .filter(existsSync)
    .sort()
  for (const migration of migrations) {
    execFileSync('sqlite3', [dbFile], {
      input: readFileSync(migration),
      stdio: ['pipe', 'inherit', 'inherit'],
    })
  }
}

export async function teardown() {
  const dbFile = path.resolve(process.cwd(), 'test-integration.db')
  if (existsSync(dbFile)) unlinkSync(dbFile)
}
