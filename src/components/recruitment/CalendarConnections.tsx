'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Link2Off } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

type Identity = {
  id: string
  providerEmail: string | null
  status: string
  connection: { provider: string; displayName: string }
}
type Provider = { provider: string; label: string; supportsFreeBusy: boolean; supportsMeetings: boolean }

export default function CalendarConnections() {
  const [identities, setIdentities] = useState<Identity[]>([])
  const [available, setAvailable] = useState<Provider[]>([])
  const [unconfigured, setUnconfigured] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    const response = await fetch('/api/integrations/calendar/connect')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Could not load calendar connections')
    setIdentities(data.identities || [])
    setAvailable(data.available || [])
    setUnconfigured(data.unconfigured || [])
  }, [])

  useEffect(() => {
    void load().catch((error) => toast('error', error.message))
  }, [load, toast])

  const call = async (body: unknown) => {
    setBusy(true)
    try {
      const response = await fetch('/api/integrations/calendar/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The calendar action failed')
      // The provider returns through /api/integrations/calendar/callback/[provider] after consent.
      if (data.authorizeUrl) window.location.assign(data.authorizeUrl)
      else await load()
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'The calendar action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section-panel">
      <div className="section-heading">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">Calendar and meeting connections</h2>
          <p className="mt-1 text-sm text-stone-600">Connect free/busy calendars and meeting providers for interview scheduling.</p>
        </div>
      </div>
      <div className="space-y-3 px-5 pb-5 sm:px-6">
        {identities.map((identity) => (
          <div key={identity.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 p-3 text-sm">
            <span><strong>{identity.connection.displayName}</strong><span className="block text-xs text-stone-500">{identity.providerEmail || identity.status}</span></span>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => call({ action: 'DISCONNECT', identityId: identity.id })}>
              <Link2Off className="h-4 w-4" /> Disconnect
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {available.map((provider) => (
            <button key={provider.provider} type="button" className="btn-secondary" disabled={busy || identities.some((item) => item.connection.provider === provider.provider && item.status === 'ACTIVE')} onClick={() => call({ action: 'CONNECT', provider: provider.provider, returnPath: '/recruitment/settings' })}>
              <CalendarDays className="h-4 w-4" /> Connect {provider.label}
            </button>
          ))}
        </div>
        {unconfigured.length > 0 && <p className="text-xs text-stone-500">Unavailable until configured: {unconfigured.join(', ').replaceAll('_', ' ').toLowerCase()}.</p>}
      </div>
    </section>
  )
}
