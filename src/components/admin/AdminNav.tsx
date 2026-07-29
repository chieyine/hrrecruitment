'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type AdminNavGroup = { label: string; items: { href: string; label: string }[] }

export default function AdminNav({ groups, label }: { groups: AdminNavGroup[]; label: string }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Administration sections"
      className="mb-7 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-soft"
    >
      <div className="border-b border-stone-200 bg-stone-50 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">{label}</p>
      </div>
      <div className="flex gap-7 overflow-x-auto px-4 py-4">
        {groups.map((group) => (
          <div key={group.label} className="shrink-0">
            <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-stone-400">{group.label}</p>
            <div className="flex gap-1">
              {group.items.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-lg px-2.5 py-2 text-xs font-semibold ${active ? 'bg-brand-100 text-brand-950' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'}`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}
