'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type AdminNavGroup = { label: string; items: { href: string; label: string }[] }

export default function AdminNav({ groups }: { groups: AdminNavGroup[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Administration sections" className="mb-7 border-y border-stone-200 bg-white">
      <div className="flex gap-6 overflow-x-auto px-4 py-3">
        {groups.map((group) => (
          <div key={group.label} className="shrink-0">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">{group.label}</p>
            <div className="flex gap-4">
              {group.items.map((item) => {
                const active = pathname === item.href
                return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`border-b-2 pb-1 text-xs font-semibold ${active ? 'border-brand-700 text-stone-950' : 'border-transparent text-stone-600 hover:border-brand-300 hover:text-stone-950'}`}>{item.label}</Link>
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}
