import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The timezone every rendered date is expressed in.
 *
 * These helpers run inside server components, so without an explicit zone the
 * output followed whatever the host was set to: a UTC container would render a
 * Lagos closing date a day early. Pin it, and let a deployment override.
 */
export const DISPLAY_TIME_ZONE = process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE || 'Africa/Lagos'
const DISPLAY_LOCALE = process.env.NEXT_PUBLIC_DISPLAY_LOCALE || 'en-GB'

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString(DISPLAY_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: DISPLAY_TIME_ZONE,
  })
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleString(DISPLAY_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: DISPLAY_TIME_ZONE,
  })
}

/**
 * The semantic role of a workflow status.
 *
 * Statuses are classified by *meaning*, not by picking a colour at the call
 * site. Six saturated Tailwind hues (emerald / sky / amber / rose / purple /
 * slate) used to be returned from here, which put five different temperatures
 * of pill on a single screen. Roles map to the warm semantic scales in
 * tailwind.config.js.
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral'

const STATUS_TONES: Record<string, StatusTone> = {
  // Concluded well.
  OPEN: 'success',
  APPROVED: 'success',
  ACCEPTED: 'success',
  OFFER_ACCEPTED: 'success',
  READY_TO_RESUME: 'success',
  RESUMED: 'success',
  PASSED: 'success',
  COMPLETED: 'success',
  CLEAN: 'success',
  CREATED_IN_ERP: 'success',
  TRANSFERRED_TO_ERP: 'success',
  VERIFIED: 'success',
  DELIVERED: 'success',

  // Live and moving through the pipeline.
  SUBMITTED: 'info',
  APPLICATION_RECEIVED: 'info',
  UNDER_REVIEW: 'info',
  LONGLISTED: 'info',
  SHORTLISTED: 'info',
  ASSESSMENT_INVITED: 'info',
  ASSESSMENT_STAGE: 'info',
  ASSESSMENT_COMPLETED: 'info',
  INTERVIEW_INVITED: 'info',
  INTERVIEW_STAGE: 'info',
  INTERVIEW_COMPLETED: 'info',
  REFERENCE_CHECK: 'info',
  PREBOARDING: 'info',
  PREBOARDING_IN_PROGRESS: 'info',
  IN_PROGRESS: 'info',
  PROCESSING: 'info',
  SENT: 'info',

  // Waiting on someone.
  DRAFT: 'warning',
  APPLICATION_DRAFT: 'warning',
  PENDING: 'warning',
  PENDING_APPROVAL: 'warning',
  SCHEDULED: 'warning',
  INVITED: 'warning',
  NOT_STARTED: 'warning',
  AWAITING_REVIEW: 'warning',
  PAUSED: 'warning',
  RESERVE: 'warning',

  // Ended badly, or needs attention.
  REJECTED: 'danger',
  INELIGIBLE: 'danger',
  FAILED: 'danger',
  DECLINED: 'danger',
  OFFER_DECLINED: 'danger',
  CANCELLED: 'danger',
  EXPIRED: 'danger',
  OFFER_EXPIRED: 'danger',
  NOT_SELECTED: 'danger',
  UNSUCCESSFUL: 'danger',
  WITHDRAWN: 'danger',
  INFECTED: 'danger',
  DEAD_LETTER: 'danger',
  BLOCKED: 'danger',
  UNSATISFACTORY: 'danger',

  // A decision point worth drawing the eye to.
  OFFER_SENT: 'brand',
  OFFER_DRAFT: 'brand',
  RECOMMENDED: 'brand',
  READY: 'brand',
}

export function getStatusTone(status: string | null | undefined): StatusTone {
  if (!status) return 'neutral'
  return STATUS_TONES[status.toUpperCase()] ?? 'neutral'
}

/**
 * Full class string for a status pill, including the base `.status-chip`.
 * Callers that already render `.status-chip` themselves can use
 * `getStatusToneClass` for the modifier alone.
 */
export function getStatusBadgeClass(status: string): string {
  return `status-chip status-chip--${getStatusTone(status)}`
}

/** Just the tone modifier, for callers composing their own chip. */
export function getStatusToneClass(status: string | null | undefined): string {
  return `status-chip--${getStatusTone(status)}`
}

/** Background colour for a `.status-dot` matching a status. */
export function getStatusDotClass(status: string | null | undefined): string {
  const tone = getStatusTone(status)
  const map: Record<StatusTone, string> = {
    success: 'bg-success-600',
    warning: 'bg-warning-600',
    danger: 'bg-danger-600',
    info: 'bg-info-500',
    brand: 'bg-brand-600',
    neutral: 'bg-stone-400',
  }
  return map[tone]
}

/** Turn SCREAMING_SNAKE_CASE into readable Sentence case for display. */
export function humanizeStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown'
  return status.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase())
}
