/**
 * Email transport. Uses nodemailer over SMTP when SMTP_* env vars are set and
 * the package is installed; otherwise development logs delivery metadata only.
 * Production fails closed when SMTP is unavailable.
 */

import { logger } from './logger'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>
}

let cachedTransport: any = null
let transportChecked = false

function smtpTimeout(name: string, fallback: number): number {
  const configured = Number(process.env[name])
  return Number.isFinite(configured) && configured >= 1_000 && configured <= 120_000 ? configured : fallback
}

async function getTransport(): Promise<any | null> {
  if (transportChecked) return cachedTransport
  transportChecked = true

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST) {
    cachedTransport = null
    return null
  }
  try {
    const nodemailer = await import('nodemailer').then((m: any) => m.default ?? m)
    cachedTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
      secure: SMTP_PORT === '465',
      requireTLS: process.env.NODE_ENV === 'production' && SMTP_PORT !== '465',
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      // The scheduler has a one-minute execution budget. A dead SMTP endpoint
      // must not hold one message open for that entire window.
      connectionTimeout: smtpTimeout('SMTP_CONNECTION_TIMEOUT_MS', 10_000),
      greetingTimeout: smtpTimeout('SMTP_GREETING_TIMEOUT_MS', 10_000),
      socketTimeout: smtpTimeout('SMTP_SOCKET_TIMEOUT_MS', 15_000),
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  } catch {
    logger.warn('SMTP transport dependency is unavailable')
    cachedTransport = null
  }
  return cachedTransport
}

export async function sendEmail(message: EmailMessage) {
  const from = process.env.SMTP_FROM || 'FRAD Recruitment <no-reply@fradfoundation.org>'
  try {
    const transport = await getTransport()
    if (!transport) {
      if (process.env.NODE_ENV === 'production') {
        return { success: false, delivered: false, error: new Error('SMTP transport is not configured') }
      }
      logger.info('Email logged instead of delivered (no SMTP configured)', {
        to: message.to,
        subject: message.subject,
      })
      return { success: true, delivered: false, messageId: `log_${Date.now()}` }
    }
    const info = await transport.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text || message.html.replace(/<[^>]+>/g, ' '),
      attachments: message.attachments,
    })
    return { success: true, delivered: true, messageId: info.messageId }
  } catch (err) {
    logger.error('Email delivery failed', { to: message.to, error: err instanceof Error ? err.message : String(err) })
    return { success: false, error: err }
  }
}
