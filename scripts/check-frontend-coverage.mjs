import fs from 'node:fs'
import path from 'node:path'

const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(file) : [file]
  })

const routeFiles = walk('src/app/api').filter((file) => file.endsWith('/route.ts')).sort()
const frontendFiles = walk('src')
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .filter((file) => !file.includes('/api/') && file !== 'src/proxy.ts')
const frontend = frontendFiles.map((file) => ({ file, source: fs.readFileSync(file, 'utf8') }))

const infrastructureExceptions = new Map([
  ['/api/cron/process-schedules', 'authenticated scheduler/operations trigger'],
  ['/api/health', 'deployment health and readiness probe'],
])

// These capabilities have a frontend, but the page renders the same data
// server-side or constructs a variable final action segment.
const explicitConsumers = new Map([
  ['/api/public/vacancies/[reference]', ['src/app/careers/[reference]/page.tsx']],
  ['/api/recruitment/referees/[id]/send-reminder', ['src/components/admin/ReferenceManager.tsx']],
])

const normalize = (value) =>
  value
    .split('?')[0]
    .replace(/\[[^\]]+\]/g, '[]')
    .replace(/\$\{[^}]+\}/g, '[]')
    .replace(/\/$/, '')

const endpointReferences = []
for (const item of frontend) {
  for (const match of item.source.matchAll(/\/api\/[A-Za-z0-9_./?=&${}\[\]-]+/g)) {
    endpointReferences.push({ file: item.file, endpoint: normalize(match[0]) })
  }
}

const rows = []
const missing = []
for (const routeFile of routeFiles) {
  const source = fs.readFileSync(routeFile, 'utf8')
  const methods = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)].map((match) => match[1])
  const endpoint = `/${routeFile.replace(/^src\/app\//, '').replace(/\/route\.ts$/, '')}`
  const consumers = [
    ...new Set([
      ...endpointReferences.filter((item) => item.endpoint === normalize(endpoint)).map((item) => item.file),
      ...(explicitConsumers.get(endpoint) ?? []),
    ]),
  ]
  const exception = infrastructureExceptions.get(endpoint)
  const status = consumers.length ? 'FRONTEND' : exception ? 'INFRASTRUCTURE' : 'MISSING'
  rows.push({ endpoint, methods: methods.join(','), status, consumers: consumers.join(', ') || exception || '' })
  if (status === 'MISSING') missing.push(endpoint)
}

for (const row of rows) {
  process.stdout.write(`${row.status.padEnd(14)} ${row.methods.padEnd(22)} ${row.endpoint}${row.consumers ? ` -> ${row.consumers}` : ''}\n`)
}

if (missing.length) {
  process.stderr.write(`\n${missing.length} operational API route(s) have no frontend consumer or approved infrastructure classification.\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`\nCoverage passed: ${rows.length} API routes classified; ${infrastructureExceptions.size} infrastructure-only.\n`)
}
