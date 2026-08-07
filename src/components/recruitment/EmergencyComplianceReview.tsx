'use client'

import { useState } from 'react'
import { Siren } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

type Review = {
  outcome: string
  findings: string[]
  accelerations: string[]
  controls: Array<{ label?: string; satisfied?: boolean }> | Record<string, boolean>
  timeToOfferHours: number | null
}

export default function EmergencyComplianceReview({ vacancyId }: { vacancyId: string }) {
  const [review, setReview] = useState<Review | null>(null)
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  const load = async () => {
    setBusy(true)
    try {
      const response = await fetch(`/api/recruitment/vacancies/${vacancyId}/emergency-review`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Compliance review could not be assembled')
      setReview(data.review)
    } catch (error) { toast('error', error instanceof Error ? error.message : 'Compliance review could not be assembled') }
    finally { setBusy(false) }
  }

  return (
    <section className="section-panel">
      <div className="section-heading"><div><h2 className="flex items-center gap-2 text-lg font-semibold text-navy-900"><Siren className="h-5 w-5 text-amber-700" /> Emergency compliance review</h2><p className="mt-1 text-sm text-stone-600">Review the approvals, timing, accelerated steps and required controls for this recruitment.</p></div></div>
      <div className="px-5 pb-5 sm:px-6">
        {!review ? <button type="button" className="btn-secondary" disabled={busy} onClick={load}>Run review</button> : <div className="space-y-3 text-sm"><p><strong>Outcome:</strong> {review.outcome.replaceAll('_', ' ').toLowerCase()}</p><p><strong>Time to offer:</strong> {review.timeToOfferHours == null ? 'Not yet available' : `${review.timeToOfferHours} hours`}</p><p><strong>Accelerated steps:</strong> {review.accelerations?.length ? review.accelerations.join(', ') : 'None recorded'}</p>{review.findings?.length ? <ul className="list-disc space-y-1 pl-5 text-rose-800">{review.findings.map((finding) => <li key={finding}>{finding}</li>)}</ul> : <p className="text-emerald-800">No compliance findings.</p>}</div>}
      </div>
    </section>
  )
}
