'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Save } from 'lucide-react'
import { PageIntro } from '@/components/ui/PageElements'

const emptyForm = {
  legalFirstName: '',
  middleName: '',
  lastName: '',
  preferredName: '',
  countryOfResidence: '',
  state: '',
  city: '',
  primaryPhone: '',
  alternatePhone: '',
  willingnessToRelocate: false,
  earliestStartDate: '',
}

export default function PersonalDetailsPage() {
  const [formData, setFormData] = useState(emptyForm)
  const [preferredLocationsText, setPreferredLocationsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/candidate/profile', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load your profile.')
        if (!data.profile) return
        setFormData({
          legalFirstName: data.profile.legalFirstName || '',
          middleName: data.profile.middleName || '',
          lastName: data.profile.lastName || '',
          preferredName: data.profile.preferredName || '',
          countryOfResidence: data.profile.countryOfResidence || '',
          state: data.profile.state || '',
          city: data.profile.city || '',
          primaryPhone: data.profile.primaryPhone || '',
          alternatePhone: data.profile.alternatePhone || '',
          willingnessToRelocate: Boolean(data.profile.willingnessToRelocate),
          earliestStartDate: data.profile.earliestStartDate
            ? new Date(data.profile.earliestStartDate).toISOString().slice(0, 10)
            : '',
        })
        try {
          const locations = JSON.parse(data.profile.preferredDutyLocationsJson || '[]')
          setPreferredLocationsText(Array.isArray(locations) ? locations.join(', ') : '')
        } catch {
          setPreferredLocationsText('')
        }
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Unable to load your profile.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setProfileLoading(false)
      })
    return () => controller.abort()
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/candidate/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          alternatePhone: formData.alternatePhone || null,
          earliestStartDate: formData.earliestStartDate || null,
          preferredDutyLocations: preferredLocationsText
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to save your details.')
      setMessage('Changes saved.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save your details.')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof typeof emptyForm, value: string | boolean) =>
    setFormData((current) => ({ ...current, [field]: value }))

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-5xl space-y-6">
          <Link
            href="/candidate/profile"
            className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" /> Profile
          </Link>

          <PageIntro
            eyebrow="Your profile"
            title="Personal details"
            description="Keep your name, phone number, current location and availability accurate."
          />

          {message && (
            <div
              role="status"
              className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
            >
              <CheckCircle2 className="h-5 w-5" /> {message}
            </div>
          )}
          {error && (
            <div role="alert" className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </div>
          )}

          {profileLoading ? (
            <div role="status" className="section-panel p-10 text-center text-sm text-stone-500">
              Loading your profile…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <FormSection title="Name" description="Use the name shown on your identity documents.">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Legal first name">
                    <input
                      required
                      autoComplete="given-name"
                      value={formData.legalFirstName}
                      onChange={(event) => update('legalFirstName', event.target.value)}
                      className="field-control"
                    />
                  </Field>
                  <Field label="Middle name (optional)">
                    <input
                      autoComplete="additional-name"
                      value={formData.middleName}
                      onChange={(event) => update('middleName', event.target.value)}
                      className="field-control"
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      required
                      autoComplete="family-name"
                      value={formData.lastName}
                      onChange={(event) => update('lastName', event.target.value)}
                      className="field-control"
                    />
                  </Field>
                  <Field label="Preferred name (optional)">
                    <input
                      value={formData.preferredName}
                      onChange={(event) => update('preferredName', event.target.value)}
                      className="field-control"
                    />
                  </Field>
                </div>
              </FormSection>

              <FormSection title="Contact" description="Recruitment updates are also sent to your account email.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Primary phone number">
                    <input
                      type="tel"
                      required
                      autoComplete="tel"
                      value={formData.primaryPhone}
                      onChange={(event) => update('primaryPhone', event.target.value)}
                      placeholder="+234 800 000 0000"
                      className="field-control"
                    />
                  </Field>
                  <Field label="Alternative phone number (optional)">
                    <input
                      type="tel"
                      value={formData.alternatePhone}
                      onChange={(event) => update('alternatePhone', event.target.value)}
                      className="field-control"
                    />
                  </Field>
                </div>
              </FormSection>

              <FormSection
                title="Current location"
                description="A broad location is enough during recruitment. FRAD will request a full address later if it is needed."
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Country of residence">
                    <input
                      required
                      autoComplete="country-name"
                      value={formData.countryOfResidence}
                      onChange={(event) => update('countryOfResidence', event.target.value)}
                      className="field-control"
                    />
                  </Field>
                  <Field label="State or region (optional)">
                    <input
                      autoComplete="address-level1"
                      value={formData.state}
                      onChange={(event) => update('state', event.target.value)}
                      className="field-control"
                    />
                  </Field>
                  <Field label="City or town">
                    <input
                      required
                      autoComplete="address-level2"
                      value={formData.city}
                      onChange={(event) => update('city', event.target.value)}
                      className="field-control"
                    />
                  </Field>
                </div>
              </FormSection>

              <FormSection title="Availability" description="These preferences can be changed for a specific offer.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Earliest available start date (optional)">
                    <input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={formData.earliestStartDate}
                      onChange={(event) => update('earliestStartDate', event.target.value)}
                      className="field-control"
                    />
                  </Field>
                  <Field label="Preferred duty locations (optional)">
                    <input
                      value={preferredLocationsText}
                      onChange={(event) => setPreferredLocationsText(event.target.value)}
                      placeholder="Abuja, Maiduguri, Yola"
                      className="field-control"
                    />
                    <span className="field-help">Separate locations with commas.</span>
                  </Field>
                </div>
                <label className="mt-4 flex items-start gap-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={formData.willingnessToRelocate}
                    onChange={(event) => update('willingnessToRelocate', event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-brand-700"
                  />
                  I am open to relocating for a role.
                </label>
              </FormSection>

              <div className="flex justify-end">
                <button type="submit" disabled={saving} className="btn-primary">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="section-panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
      <p className="mt-1 text-sm text-stone-600">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
