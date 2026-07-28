import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const source = resolve('prisma/schema.prisma')
const target = resolve('prisma/postgresql/schema.prisma')
const schema = await readFile(source, 'utf8')

// The canonical schema is already PostgreSQL. Historically it was SQLite and
// this script rewrote the provider, so keep accepting either form: the only
// requirement is that the generated copy ends up on `postgresql`.
const providerPattern = /provider\s*=\s*"(sqlite|postgresql)"/
const match = schema.match(providerPattern)
if (!match) {
  throw new Error('Could not locate a sqlite or postgresql datasource provider in prisma/schema.prisma')
}
// Preserve the original formatting when the source is already PostgreSQL so
// the generated file stays byte-identical to the canonical schema.
const postgres = match[1] === 'postgresql' ? schema : schema.replace(providerPattern, 'provider = "postgresql"')

await mkdir(dirname(target), { recursive: true })
await writeFile(
  target,
  `// Generated from ../schema.prisma. Run npm run db:postgres:schema after schema changes.\n${postgres}`
)
console.log(`Generated ${target} (source provider: ${match[1]})`)
