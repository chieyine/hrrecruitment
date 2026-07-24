import { createHash } from 'node:crypto'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

const root = process.cwd()
const outputName = 'COMPLETE_FILE_AUDIT.md'
const excludedDirectories = new Set([
  '.next',
  '.next-e2e',
  '.git',
  'node_modules',
  'playwright-report',
  'test-results',
  'uploads',
])
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.prisma', '.sql', '.sh', '.yml', '.yaml', '.json', '.md', '.png', '.css', '.toml'])
const explicitFiles = new Set(['Dockerfile', '.dockerignore', '.gitignore', '.env.example', '.env.production.example'])

async function walk(directory) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.fuse_hidden')) continue
    const absolute = resolve(directory, entry.name)
    const path = relative(root, absolute)
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) found.push(...await walk(absolute))
      continue
    }
    const extension = entry.name.includes('.') ? `.${entry.name.split('.').pop()}` : ''
    if ((extensions.has(extension) || explicitFiles.has(entry.name)) && entry.name !== outputName) found.push(path)
  }
  return found
}

function layer(path) {
  if (path.startsWith('src/app/api/')) return 'API route'
  if (path.startsWith('src/app/')) return 'Page/layout'
  if (path.startsWith('src/components/')) return 'UI component'
  if (path.startsWith('src/lib/')) return 'Domain/infrastructure'
  if (path.startsWith('prisma/migrations/')) return 'SQLite migration'
  if (path.startsWith('prisma/postgresql/migrations/')) return 'PostgreSQL migration'
  if (path.startsWith('prisma/')) return 'Database'
  if (path.startsWith('tests/')) return 'Test'
  if (path.startsWith('scripts/')) return 'Operations script'
  if (path.startsWith('public/')) return 'Public asset'
  if (path.startsWith('docs/') || path.endsWith('.md')) return 'Documentation'
  return 'Configuration'
}

function evidence(path) {
  if (path.endsWith('.sql')) return 'Fresh migration suite; upgrade copy check'
  if (path.endsWith('.png')) return 'Visual asset review'
  if (path.startsWith('tests/e2e/')) return 'Executed by Playwright browser suite'
  if (path.startsWith('tests/')) return 'Executed by unit/integration suite'
  if (/\.(ts|tsx|js|mjs)$/.test(path)) return 'TypeScript/build or runtime script review'
  if (path.includes('schema.prisma')) return 'Prisma format/generate/validate'
  return 'Configuration/documentation review'
}

const files = (await walk(root)).sort()
const rows = []
for (const path of files) {
  const absolute = resolve(root, path)
  const bytes = await readFile(absolute)
  const info = await stat(absolute)
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
  rows.push(`| \`${path.replaceAll('|', '\\|')}\` | ${layer(path)} | ${info.size} | \`${hash}\` | Inventoried | ${evidence(path)} |`)
}

const content = `# Complete first-party file inventory

Generated inventory of the first-party repository state on ${new Date().toISOString()}.

## Outcome

- First-party files inventoried: **${files.length}**.
- Every row contains a hash of the exact file state.

This command is an inventory generator. It intentionally does **not** label files
as reviewed and does not claim that tests, builds, migrations, accessibility
checks, or release gates passed. Record executed verification and human review
evidence separately; an inventory script cannot self-certify those results.

## File inventory

| File | Layer | Bytes | SHA-256 (12) | Inventory status | Applicable verification |
|---|---:|---:|---:|---|---|
${rows.join('\n')}
`

await writeFile(resolve(root, outputName), content)
console.log(`Generated ${outputName} with ${files.length} inventoried files.`)
