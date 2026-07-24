import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const source = resolve('prisma/schema.prisma')
const target = resolve('prisma/postgresql/schema.prisma')
const schema = await readFile(source, 'utf8')
const postgres = schema.replace('provider = "sqlite"', 'provider = "postgresql"')
if (postgres === schema) throw new Error('Could not locate the SQLite datasource provider')
await mkdir(dirname(target), { recursive: true })
await writeFile(target, `// Generated from ../schema.prisma. Run npm run db:postgres:schema after schema changes.\n${postgres}`)
console.log(`Generated ${target}`)
