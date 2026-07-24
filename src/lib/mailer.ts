/**
 * Email transport. Uses nodemailer over SMTP when SMTP_* env vars are set and
 * the package is installed; otherwise development logs delivery metadata only.
 * Production fails closed when SMTP is unavailable.
 */

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>
}

let cachedTransport: any = null
let transportChecked = false

async function getTransport(): Promise<any | null> {
  if (transportChecked) return cachedTransport
  transportChecked = true

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST) {
    cachedTransport = null
    return null
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = await import('nodemailer').then((m: any) => m.default ?? m)
    cachedTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
      secure: SMTP_PORT === '465',
      requireTLS: process.env.NODE_ENV === 'production' && SMTP_PORT !== '465',
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
      socketTimeout: 60_000,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  } catch {
    console.warn('[Mailer] SMTP transport dependency is unavailable.')
    cachedTransport = null
  }
  return cachedTransport
}

export async function sendEmail(message: EmailMessage) {
  const from = process.env.SMTP_FROM || 'FRAD Recruitment <no-reply@frad.org>'
  try {
    const transport = await getTransport()
    if (!transport) {
      if (process.env.NODE_ENV === 'production') {
        return { success: false, delivered: false, error: new Error('SMTP transport is not configured') }
      }
      console.log(`[Mailer:log] To: ${message.to} | Subject: ${message.subject}`)
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
    console.error('[Mailer] send failed:', err)
    return { success: false, error: err }
  }
}
