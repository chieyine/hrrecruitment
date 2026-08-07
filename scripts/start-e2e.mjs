import { execFileSync, spawn } from 'node:child_process'
import { resolve } from 'node:path'

const root = process.cwd()

const environment = {
  ...process.env,
  NEXT_DIST_DIR: '.next-e2e',
  NODE_ENV: 'test',
  SEED_PASSWORD: process.env.E2E_TEST_PASSWORD || 'FRAD-E2E-Only-2026!',
}

// Ensure the PostgreSQL schema is pushed and seeded for E2E tests
execFileSync('npx', ['prisma', 'db', 'push', '--accept-data-loss'], { cwd: root, env: environment, stdio: 'inherit' })
execFileSync('npm', ['run', 'db:seed'], { cwd: root, env: environment, stdio: 'inherit' })

const serverEnvironment = { ...environment }
delete serverEnvironment.NODE_ENV
// The disposable E2E database is already initialised above with `db push`.
// Calling the production `npm run build` wrapper here also runs migrate deploy,
// which attempts to baseline the populated test database and fails with P3005.
execFileSync('npx', ['prisma', 'generate'], { cwd: root, env: serverEnvironment, stdio: 'inherit' })
execFileSync('npx', ['next', 'build', '--webpack'], { cwd: root, env: serverEnvironment, stdio: 'inherit' })
const server = spawn('npm', ['start', '--', '--hostname', '127.0.0.1', '--port', '3107'], {
  cwd: root,
  env: serverEnvironment,
  stdio: 'inherit',
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal))
}
server.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
