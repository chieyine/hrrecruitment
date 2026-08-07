/**
 * Structural check for prisma/schema.prisma.
 *
 * `prisma validate` needs a downloadable query engine, which is not always
 * available in a sandboxed or offline environment. This script performs the
 * subset of validation that actually catches the mistakes made when editing a
 * large schema by hand: a relation field whose target model does not exist, and
 * a relation that is only declared on one side.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const schema = await readFile(resolve('prisma/schema.prisma'), 'utf8')

const SCALARS = new Set([
  'String',
  'Int',
  'BigInt',
  'Float',
  'Decimal',
  'Boolean',
  'DateTime',
  'Json',
  'Bytes',
  'Unsupported',
])

/** Strip comments so `//` notes never look like field declarations. */
function stripComments(block) {
  return block
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trimEnd())
    .join('\n')
}

const models = new Map()
const enums = new Set()

for (const match of schema.matchAll(/^enum\s+(\w+)\s*\{/gm)) enums.add(match[1])

for (const match of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  const [, name, body] = match
  const fields = []
  for (const rawLine of stripComments(body).split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('@@') || line.startsWith('///')) continue
    const fieldMatch = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/)
    if (!fieldMatch) continue
    const [, fieldName, type, list, optional, rest] = fieldMatch
    const relationMatch = rest.match(/@relation\(([^)]*)\)/)
    let relationName = null
    if (relationMatch) {
      const named = relationMatch[1].match(/^\s*"([^"]+)"/)
      if (named) relationName = named[1]
    }
    fields.push({
      name: fieldName,
      type,
      isList: Boolean(list),
      isOptional: Boolean(optional),
      hasRelationAttribute: Boolean(relationMatch),
      hasFields: /\bfields\s*:/.test(rest),
      relationName,
    })
  }
  models.set(name, fields)
}

const errors = []

for (const [modelName, fields] of models) {
  for (const field of fields) {
    if (SCALARS.has(field.type) || enums.has(field.type)) continue
    if (!models.has(field.type)) {
      errors.push(`${modelName}.${field.name}: references unknown model or type "${field.type}"`)
      continue
    }

    // Every relation needs a matching field on the opposite model. Self
    // relations legitimately resolve to the same model, so only require that
    // some counterpart exists.
    const targetFields = models.get(field.type)
    const counterparts = targetFields.filter((candidate) => candidate.type === modelName)
    if (counterparts.length === 0) {
      errors.push(
        `${modelName}.${field.name} -> ${field.type}: no back-relation field of type ${modelName} on ${field.type}`
      )
      continue
    }

    // When a relation is named, exactly that name must appear on the other side.
    if (field.relationName) {
      const named = counterparts.filter((candidate) => candidate.relationName === field.relationName)
      if (named.length === 0) {
        errors.push(
          `${modelName}.${field.name}: relation "${field.relationName}" has no matching @relation("${field.relationName}") on ${field.type}`
        )
      }
    } else if (counterparts.length > 1 && modelName !== field.type) {
      // Multiple unnamed relations between the same pair of models are
      // ambiguous and Prisma will reject them.
      const unnamed = counterparts.filter((candidate) => !candidate.relationName)
      if (unnamed.length > 1) {
        errors.push(
          `${modelName}.${field.name} -> ${field.type}: ${unnamed.length} unnamed relations between these models; each needs a @relation("Name")`
        )
      }
    }
  }
}

// A one-to-one or many-to-one relation must hold its foreign key on exactly one
// side (the side carrying `fields:`).
for (const [modelName, fields] of models) {
  for (const field of fields) {
    if (!models.has(field.type) || field.isList) continue
    const counterparts = models
      .get(field.type)
      .filter(
        (candidate) => candidate.type === modelName && candidate.relationName === field.relationName
      )
    const owning = [field, ...counterparts].filter((item) => item.hasFields)
    if (counterparts.length && owning.length === 0) {
      errors.push(
        `${modelName}.${field.name} <-> ${field.type}: neither side declares @relation(fields: [...], references: [...])`
      )
    }
  }
}

const unique = [...new Set(errors)]
if (unique.length) {
  console.error(`Schema relation check failed with ${unique.length} problem(s):\n`)
  for (const error of unique) console.error(`  - ${error}`)
  process.exit(1)
}

console.log(`Schema relation check passed: ${models.size} models, ${enums.size} enums.`)
