'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquareWarning } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { formatDate } from '@/lib/utils'

type CaseComment = { id: string; body: string; createdAt: string }
type CandidateCase = {
  id: string
  referenceNumber: string
  category: string
  subject: string
  status: string
  resolution: string | null
  createdAt: string
  updatedAt: string
  comments: CaseComment[]
}

export default function CandidateComplaintsPage() {
  const [cases, setCases] = useState<CandidateCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/complaints', { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'We could not load your submissions.')
        setCases(body.cases || [])
      })
      .catch((reason) => {
        if (controller.signal.aborted) return
        setError(reason instanceof Error ? reason.message : 'We could not load your submissions.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header />
      <main id="main-content" className="flex-1 py-8">
        <div className="mx-auto max-w-5xl space-y-7 px-4 sm:px-6 lg:px-8">
          <PageIntro
            eyebrow="Candidate account"
            title="My concerns"
            description="Keep track of a concern, appeal or complaint you have sent to FRAD."
            actions={
              <Link href="/complaints" className="btn-primary">
                Send a new concern
              </Link>
            }
          />

          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </p>
          )}
          {loading ? (
            <div className="section-panel p-10 text-center text-sm text-stone-500" role="status">
              Loading your submissions…
            </div>
          ) : cases.length === 0 ? (
            <EmptyState
              icon={MessageSquareWarning}
              title="You have not sent a concern"
              description="If something about recruitment does not feel right, you can contact FRAD confidentially."
              action={{ href: '/complaints', label: 'Send a concern' }}
            />
          ) : (
            <div className="space-y-4">
              {cases.map((item) => (
                <article key={item.id} className="section-panel">
                  <div className="flex flex-col justify-between gap-3 border-b border-stone-200 px-5 py-4 sm:flex-row sm:items-start sm:px-6">
                    <div>
                      <p className="font-mono text-[10px] font-bold text-brand-700">{item.referenceNumber}</p>
                      <h2 className="mt-1 text-base font-semibold text-navy-900">{item.subject}</h2>
                      <p className="mt-1 text-xs text-stone-500">
                        Sent {formatDate(item.createdAt)} · {item.category.replaceAll('_', ' ').toLowerCase()}
                      </p>
                    </div>
                    <span className="status-chip border-stone-200 bg-stone-50 text-stone-700">
                      {item.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  {(item.resolution || item.comments.length > 0) && (
                    <div className="space-y-3 px-5 py-4 sm:px-6">
                      {item.resolution && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[.1em] text-emerald-800">Outcome</p>
                          <p className="mt-1 text-sm leading-6 text-emerald-950">{item.resolution}</p>
                        </div>
                      )}
                      {item.comments.map((comment) => (
                        <div key={comment.id} className="rounded-xl bg-brand-50 p-4 text-sm leading-6 text-brand-950">
                          {comment.body}
                          <span className="mt-1 block text-[11px] text-brand-700">{formatDate(comment.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
