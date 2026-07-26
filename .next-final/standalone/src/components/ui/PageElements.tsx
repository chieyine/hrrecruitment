import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="page-intro flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-700">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-summary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="empty-state">
      {Icon && <Icon className="mx-auto h-8 w-8 text-stone-400" />}
      <h2 className="mt-3 text-base font-bold text-stone-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">{description}</p>
      {action && <Link href={action.href} className="btn-primary mt-5">{action.label}</Link>}
    </div>
  )
}

export function HelpCallout({
  title = 'Need help?',
  children,
  href = '/candidate/messages',
  linkLabel = 'Message the recruitment team',
}: {
  title?: string
  children: React.ReactNode
  href?: string
  linkLabel?: string
}) {
  return (
    <aside className="border-l-4 border-brand-600 bg-brand-50 px-5 py-4">
      <h2 className="text-sm font-bold text-stone-900">{title}</h2>
      <div className="mt-1 text-sm leading-6 text-stone-600">{children}</div>
      <Link href={href} className="mt-3 inline-flex text-sm font-semibold text-brand-800 underline decoration-brand-300 underline-offset-4 hover:decoration-brand-700">
        {linkLabel}
      </Link>
    </aside>
  )
}

export function SaveIndicator({ status }: { status: string }) {
  if (!status) return null
  const failure = /could not|failed|error/i.test(status)
  return (
    <p role="status" className={`text-xs font-medium ${failure ? 'text-rose-700' : 'text-stone-500'}`}>
      {status}
    </p>
  )
}
