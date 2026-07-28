'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Pagination controls for the shared list envelope from lib/pagination.
 *
 * Deliberately shows the real total. The applications list previously stopped
 * at 500 rows with nothing on screen to say more existed.
 */
export interface PageMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

const PAGE_SIZES = [25, 50, 100, 200]

export default function Pagination({
  meta,
  onPageChange,
  onPageSizeChange,
  label = 'results',
  busy = false,
}: {
  meta: PageMeta | null
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  label?: string
  busy?: boolean
}) {
  if (!meta || meta.total === 0) return null

  const first = (meta.page - 1) * meta.pageSize + 1
  const last = Math.min(meta.page * meta.pageSize, meta.total)

  // A compact window around the current page rather than every page number.
  const windowStart = Math.max(1, Math.min(meta.page - 2, meta.totalPages - 4))
  const windowEnd = Math.min(meta.totalPages, windowStart + 4)
  const pages: number[] = []
  for (let page = windowStart; page <= windowEnd; page++) pages.push(page)

  return (
    <nav
      aria-label={`${label} pagination`}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/50 px-4 py-3"
    >
      <p className="text-xs text-stone-600" aria-live="polite">
        Showing <strong>{first.toLocaleString('en-GB')}</strong>–<strong>{last.toLocaleString('en-GB')}</strong> of{' '}
        <strong>{meta.total.toLocaleString('en-GB')}</strong> {label}
      </p>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-xs text-stone-600">
            Per page
            <select
              value={meta.pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              disabled={busy}
              className="rounded-lg border border-stone-300 bg-white p-1.5 text-xs"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(meta.page - 1)}
            disabled={busy || meta.page <= 1}
            aria-label="Previous page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 hover:border-brand-300 hover:text-brand-800 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>

          {windowStart > 1 && <span className="px-1 text-xs text-stone-400">…</span>}

          {pages.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              disabled={busy}
              aria-current={page === meta.page ? 'page' : undefined}
              className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold ${
                page === meta.page
                  ? 'bg-brand-800 text-white'
                  : 'border border-stone-300 bg-white text-stone-700 hover:border-brand-300'
              }`}
            >
              {page}
            </button>
          ))}

          {windowEnd < meta.totalPages && <span className="px-1 text-xs text-stone-400">…</span>}

          <button
            type="button"
            onClick={() => onPageChange(meta.page + 1)}
            disabled={busy || !meta.hasMore}
            aria-label="Next page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 hover:border-brand-300 hover:text-brand-800 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </nav>
  )
}
