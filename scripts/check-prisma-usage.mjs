/**
 * Static check that every `select` / `include` key used against a Prisma model
 * actually exists on that model.
 *
 * `prisma generate` cannot always run in a sandboxed or offline environment, so
 * `tsc` will not catch a renamed relation. This walks the top-level select and
 * include blocks of each query and compares their keys against the schema. It
 * is deliberately shallow — nested blocks are skipped rather than guessed at —
 * so it reports no false positives.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const schema = readFileSync('prisma/schema.prisma', 'utf8')

/** model name -> { fields:Set, relations:Map<field, targetModel> } */
const models = new Map()
for (const match of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  const fields = new Set()
  const relations = new Map()
  for (const rawLine of match[2].split('\n')) {
    const line = rawLine.replace(/\/\/.*$/, '').trim()
    if (!line || line.startsWith('@@')) continue
    const field = line.match(/^(\w+)\s+(\w+)(\[\])?/)
    if (!field) continue
    fields.add(field[1])
    relations.set(field[1], field[2])
  }
  models.set(match[1], { fields, relations })
}

/** Prisma client accessors lowercase the first character only. */
const accessorToModel = new Map()
for (const name of models.keys()) accessorToModel.set(name[0].toLowerCase() + name.slice(1), name)

// Aggregate keys are query syntax, not model fields.
const QUERY_KEYS = new Set(['_count', '_sum', '_avg', '_min', '_max', 'select', 'include'])

const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.tsx?$/.test(path)) files.push(path)
  }
}
walk('src')

/** Return the substring of a balanced `{...}` starting at `open`. */
function balanced(source, open) {
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    else if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(open + 1, index)
    }
  }
  return null
}

/**
 * Top-level `key: value` pairs of an object literal body.
 *
 * Returns the key name and the index just after its colon, so a caller can
 * descend into the value only for the keys it cares about. Nested objects,
 * arrays and calls are stepped over rather than parsed.
 */
function topLevelEntries(body) {
  const entries = []
  let depth = 0
  let buffer = ''
  let keyStart = 0
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index]

    if (depth > 0) {
      if (char === '{' || char === '[' || char === '(') depth += 1
      else if (char === '}' || char === ']' || char === ')') depth -= 1
      continue
    }

    if (char === '{' || char === '[' || char === '(') {
      depth += 1
      continue
    }
    if (char === ',') {
      buffer = ''
      keyStart = index + 1
      continue
    }
    if (char === ':') {
      const key = buffer.trim()
      if (/^\w+$/.test(key)) entries.push({ key, valueAt: index + 1, keyStart })
      buffer = ''
      // Skip to the end of this value so its contents are never read as keys.
      let scan = index + 1
      let valueDepth = 0
      for (; scan < body.length; scan += 1) {
        const inner = body[scan]
        if (inner === '{' || inner === '[' || inner === '(') valueDepth += 1
        else if (inner === '}' || inner === ']' || inner === ')') valueDepth -= 1
        else if (inner === ',' && valueDepth === 0) break
      }
      index = scan
      keyStart = index + 1
      continue
    }
    buffer += char
  }
  return entries
}

const problems = []

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(
    /prisma\.(\w+)\.(findMany|findUnique|findFirst|findUniqueOrThrow|findFirstOrThrow|create|update|upsert|count|updateMany|createMany|aggregate|deleteMany|groupBy)\s*\(/g
  )) {
    const accessor = match[1]
    const model = accessorToModel.get(accessor)
    if (!model) {
      problems.push(`${file}: unknown prisma accessor "${accessor}"`)
      continue
    }
    const argsStart = source.indexOf('{', match.index + match[0].length - 1)
    if (argsStart === -1) continue
    const args = balanced(source, argsStart)
    if (!args) continue

    // Only depth-0 `select` / `include` describe fields of *this* model. A
    // nested one belongs to a related model and is out of scope for this check.
    for (const entry of topLevelEntries(args)) {
      if (entry.key !== 'select' && entry.key !== 'include') continue
      const blockStart = args.indexOf('{', entry.valueAt)
      if (blockStart === -1) continue
      // Guard against picking up a brace from a later sibling key.
      if (args.slice(entry.valueAt, blockStart).trim() !== '') continue
      const block = balanced(args, blockStart)
      if (!block) continue
      for (const { key } of topLevelEntries(block)) {
        if (QUERY_KEYS.has(key)) continue
        if (!models.get(model).fields.has(key))
          problems.push(`${file}: ${model}.${key} used in ${entry.key} but is not a field on ${model}`)
      }
    }
  }
}

const unique = [...new Set(problems)]
if (unique.length) {
  console.error(`Prisma usage check failed with ${unique.length} problem(s):\n`)
  for (const problem of unique) console.error(`  - ${problem}`)
  process.exit(1)
}
console.log(`Prisma usage check passed across ${files.length} files.`)
