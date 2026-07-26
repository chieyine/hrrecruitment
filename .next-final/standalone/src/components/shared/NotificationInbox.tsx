'use client'

import { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'

export default function NotificationInbox() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [error, setError] = useState('')
  const load = () => fetch('/api/notifications').then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setNotifications(data.notifications || []) }).catch((reason) => setError(reason.message || 'Unable to load notifications'))
  useEffect(() => { void load() }, [])
  const markRead = async (id?: string) => { await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { id } : { all: true }) }); load() }
  const unread = notifications.filter((notification) => notification.status === 'UNREAD').length
  return <section aria-labelledby="notifications-heading" className="section-panel">
    <div className="section-heading"><div><h2 id="notifications-heading" className="flex items-center gap-2 text-lg font-bold text-slate-950"><Bell className="h-5 w-5 text-blue-700" /> Your updates {unread > 0 && <span className="status-chip bg-blue-100 text-blue-800">{unread} new</span>}</h2><p className="mt-1 text-sm text-slate-600">Application receipts, requests and decisions appear here.</p></div>{unread > 0 && <button type="button" onClick={() => markRead()} className="text-sm font-semibold text-blue-700 hover:underline">Mark all as read</button>}</div>
    {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : notifications.length === 0 ? <div className="empty-state"><p className="font-semibold text-slate-800">Nothing new</p><p className="mt-1 text-sm text-slate-600">We will post important application updates here.</p></div> : <ul className="divide-y divide-slate-200">{notifications.slice(0, 8).map((notification) => <li key={notification.id} className={`py-4 first:pt-0 last:pb-0 ${notification.status === 'UNREAD' ? '' : 'opacity-75'}`}><div className="flex justify-between gap-4"><div><div className="flex items-center gap-2"><p className="font-semibold text-slate-950">{notification.title}</p>{notification.status === 'UNREAD' && <span className="h-2 w-2 rounded-full bg-blue-600" aria-label="Unread" />}</div><p className="mt-1 text-sm leading-6 text-slate-600">{notification.body}</p><time className="mt-2 block text-xs text-slate-500">{new Date(notification.sentAt).toLocaleString()}</time></div>{notification.status === 'UNREAD' && <button type="button" title="Mark as read" aria-label={`Mark ${notification.title} read`} onClick={() => markRead(notification.id)} className="self-start rounded-lg border border-slate-200 p-2 text-blue-700 hover:bg-blue-50"><Check className="h-4 w-4" /></button>}</div></li>)}</ul>}
  </section>
}
