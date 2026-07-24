'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'

export default function CandidateComplaintsPage() {
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/complaints').then((response) => response.json()).then((body) => setCases(body.cases || [])).finally(() => setLoading(false)) }, [])
  return <div className="flex min-h-screen flex-col bg-slate-50"><Header/><main id="main-content" className="flex-1 py-10"><div className="mx-auto max-w-4xl space-y-5 px-4"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-extrabold">My complaints and concerns</h1><p className="text-sm text-slate-600">Track formal submissions and visible case updates.</p></div><Link href="/complaints" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">New submission</Link></div>{loading?<p>Loading…</p>:cases.length===0?<p className="rounded-2xl border bg-white p-8 text-center text-slate-500">No submissions.</p>:cases.map((item)=><article key={item.id} className="rounded-2xl border bg-white p-5"><div className="flex justify-between gap-3"><div><p className="font-mono text-xs font-bold text-blue-700">{item.referenceNumber}</p><h2 className="font-bold">{item.subject}</h2></div><span className="text-xs font-bold">{item.status.replace(/_/g,' ')}</span></div>{item.resolution&&<p className="mt-3 rounded bg-emerald-50 p-3 text-sm">{item.resolution}</p>}{item.comments?.map((comment:any)=><p key={comment.id} className="mt-2 rounded bg-blue-50 p-3 text-sm">{comment.body}<span className="block text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString()}</span></p>)}</article>)}</div></main><Footer/></div>
}
