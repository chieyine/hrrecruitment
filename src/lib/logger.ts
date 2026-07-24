/**
 * Tiny structured logger. Emits single-line JSON so logs are greppable and can
 * be ingested by any log platform. Swap the sink for your provider as needed.
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: safe(meta) } : {}),
  }
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

function safe(meta: Record<string, unknown>) {
  try {
    const visit = (value: unknown, key = '', depth = 0): unknown => {
      if (/pass|secret|token|authorization|cookie|signature|accountnumber|bank|medical|nin|passport/i.test(key)) return '[redacted]'
      if (depth > 5) return '[truncated]'
      if (Array.isArray(value)) return value.slice(0, 50).map((item) => visit(item, key, depth + 1))
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [childKey, visit(child, childKey, depth + 1)]))
      if (typeof value === 'string' && value.length > 2000) return `${value.slice(0, 2000)}…`
      return value
    }
    return visit(meta) as Record<string, unknown>
  } catch {
    return {}
  }
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => emit('debug', m, meta),
  info: (m: string, meta?: Record<string, unknown>) => emit('info', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit('error', m, meta),
}
