export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-stone-200/80 ${className}`} />
}

/** Standard page-body placeholder: a header bar plus three card rows. */
export function PageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading content">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
