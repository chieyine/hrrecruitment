import { execFileSync, spawn } from 'node:child_process'
import { existsSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const databasePath = resolve(root, 'prisma/e2e.db')
for (const path of [databasePath, `${databasePath}-journal`, `${databasePath}-shm`, `${databasePath}-wal`]) {
  if (existsSync(path)) unlinkSync(path)
}

const environment = {
  ...process.env,
  DATABASE_URL: 'file:./e2e.db',
  NEXT_DIST_DIR: '.next-e2e',
  NODE_ENV: 'test',
  SEED_PASSWORD: process.env.E2E_TEST_PASSWORD || 'FRAD-E2E-Only-2026!',
}

// Build the disposable SQLite schema directly from the checked Prisma model.
// Migration deployment is verified separately by the integration/CI migration
// gate; avoiding migrate deploy here keeps browser setup deterministic on
// machines where Prisma's SQLite schema-engine cannot create a new file.
const schemaSql = execFileSync('npx', ['prisma', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], {
  cwd: root,
  env: environment,
})
execFileSync('sqlite3', [databasePath], { cwd: root, env: environment, input: schemaSql, stdio: ['pipe', 'inherit', 'inherit'] })
execFileSync('npm', ['run', 'db:seed'], { cwd: root, env: environment, stdio: 'inherit' })

const serverEnvironment = { ...environment }
delete serverEnvironment.NODE_ENV
execFileSync('npm', ['run', 'build'], { cwd: root, env: serverEnvironment, stdio: 'inherit' })
const server = spawn('npm', ['start', '--', '--hostname', '127.0.0.1', '--port', '3107'], { cwd: root, env: serverEnvironment, stdio: 'inherit' })

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal))
}
server.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
