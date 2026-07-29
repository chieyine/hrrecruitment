'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { PageIntro } from '@/components/ui/PageElements'

type ReferenceItem = { id: string; name: string; code?: string }

const initialForm = {
  title: '',
  departmentId: '',
  categoryId: '',
  dutyStationId: '',
  projectId: '',
  contractType: '',
  contractDuration: '',
  reportingLine: '',
  numberOfPositions: '1',
  minimumExperienceYears: '0',
  openingAt: new Date().toISOString().slice(0, 10),
  closingAt: '',
  summary: '',
  responsibilities: '',
  essentialQualifications: '',
}

export default function NewVacancyForm() {
  const router = useRouter()
  const [form, setForm] = useState(initialForm)
  const [departments, setDepartments] = useState<ReferenceItem[]>([])
  const [dutyStations, setDutyStations] = useState<ReferenceItem[]>([])
  const [categories, setCategories] = useState<ReferenceItem[]>([])
  const [projects, setProjects] = useState<ReferenceItem[]>([])
  const [contractTypes, setContractTypes] = useState<ReferenceItem[]>([])
  const [loadingReferences, setLoadingReferences] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/recruitment/vacancies?reference=1', { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load vacancy options.')
        setDepartments(body.departments ?? [])
        setDutyStations(body.dutyStations ?? [])
        setCategories(body.categories ?? [])
        setProjects(body.projects ?? [])
        setContractTypes(body.contractTypes ?? [])
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Unable to load vacancy options.')
      })
      .finally(() => setLoadingReferences(false))
    return () => controller.abort()
  }, [])

  const update = (name: keyof typeof initialForm, value: string) =>
    setForm((current) => ({ ...current, [name]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/recruitment/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          projectId: form.projectId || null,
          contractDuration: form.contractDuration || null,
          reportingLine: form.reportingLine || null,
          questions: [],
          requiredDocuments: [],
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to create the vacancy draft.')
      router.push(`/recruitment/vacancies/${body.vacancyId}`)
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create the vacancy draft.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main id="main-content" className="flex-1 py-7 sm:py-9">
      <div className="page-shell max-w-5xl space-y-6">
        <Link
          href="/recruitment/vacancies"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" /> Vacancies
        </Link>
        <PageIntro
          eyebrow="Vacancies"
          title="Create a vacancy draft"
          description="Start with the role and its essential requirements. Selection setup and application questions can be added after the draft is saved."
        />

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <FormSection title="Role" description="The details staff use to identify and own the vacancy.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Job title">
                <input
                  required
                  value={form.title}
                  onChange={(event) => update('title', event.target.value)}
                  className="field-control"
                />
              </Field>
              <Field label="Department">
                <ReferenceSelect
                  required
                  value={form.departmentId}
                  items={departments}
                  placeholder="Select department"
                  onChange={(value) => update('departmentId', value)}
                />
              </Field>
              <Field label="Vacancy category">
                <ReferenceSelect
                  required
                  value={form.categoryId}
                  items={categories}
                  placeholder="Select category"
                  onChange={(value) => update('categoryId', value)}
                />
              </Field>
              <Field label="Duty station">
                <ReferenceSelect
                  required
                  value={form.dutyStationId}
                  items={dutyStations}
                  placeholder="Select location"
                  onChange={(value) => update('dutyStationId', value)}
                />
              </Field>
              <Field label="Project (optional)">
                <ReferenceSelect
                  value={form.projectId}
                  items={projects}
                  placeholder="No project"
                  onChange={(value) => update('projectId', value)}
                />
              </Field>
              <Field label="Reports to (optional)">
                <input
                  value={form.reportingLine}
                  onChange={(event) => update('reportingLine', event.target.value)}
                  className="field-control"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Contract and advert"
            description="Dates can be changed while the vacancy remains a draft."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Contract type">
                <ReferenceSelect
                  required
                  value={form.contractType}
                  items={contractTypes}
                  itemValue="code"
                  placeholder="Select contract type"
                  onChange={(value) => update('contractType', value)}
                />
              </Field>
              <Field label="Contract duration (optional)">
                <input
                  value={form.contractDuration}
                  onChange={(event) => update('contractDuration', event.target.value)}
                  className="field-control"
                />
              </Field>
              <Field label="Number of positions">
                <input
                  type="number"
                  min="1"
                  required
                  value={form.numberOfPositions}
                  onChange={(event) => update('numberOfPositions', event.target.value)}
                  className="field-control"
                />
              </Field>
              <Field label="Minimum years of experience">
                <input
                  type="number"
                  min="0"
                  required
                  value={form.minimumExperienceYears}
                  onChange={(event) => update('minimumExperienceYears', event.target.value)}
                  className="field-control"
                />
              </Field>
              <Field label="Opening date">
                <input
                  type="date"
                  required
                  value={form.openingAt}
                  onChange={(event) => update('openingAt', event.target.value)}
                  className="field-control"
                />
              </Field>
              <Field label="Closing date">
                <input
                  type="date"
                  required
                  min={form.openingAt}
                  value={form.closingAt}
                  onChange={(event) => update('closingAt', event.target.value)}
                  className="field-control"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Public role specification"
            description="Write only what a candidate needs to understand the work and decide whether to apply."
          >
            <div className="space-y-4">
              <Field label="Role summary">
                <textarea
                  required
                  rows={4}
                  value={form.summary}
                  onChange={(event) => update('summary', event.target.value)}
                  className="field-control"
                />
              </Field>
              <Field label="Key responsibilities">
                <textarea
                  required
                  rows={6}
                  value={form.responsibilities}
                  onChange={(event) => update('responsibilities', event.target.value)}
                  className="field-control"
                />
              </Field>
              <Field label="Essential requirements">
                <textarea
                  required
                  rows={6}
                  value={form.essentialQualifications}
                  onChange={(event) => update('essentialQualifications', event.target.value)}
                  className="field-control"
                />
              </Field>
            </div>
          </FormSection>

          <div className="flex items-center justify-between gap-4 border-t border-stone-200 pt-5">
            <p className="text-xs leading-5 text-stone-500">A FRAD reference is assigned when the draft is saved.</p>
            <button disabled={saving || loadingReferences} className="btn-primary">
              {saving ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        </form>
      </div>
    </main>
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
    <section className="section-panel">
      <div className="section-heading">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
          <p className="mt-1 text-sm text-stone-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field-label">
      {label}
      {children}
    </label>
  )
}

function ReferenceSelect({
  value,
  items,
  placeholder,
  onChange,
  required = false,
  itemValue = 'id',
}: {
  value: string
  items: ReferenceItem[]
  placeholder: string
  onChange: (value: string) => void
  required?: boolean
  itemValue?: 'id' | 'code'
}) {
  return (
    <select
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="field-control"
    >
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.id} value={itemValue === 'code' ? item.code : item.id}>
          {item.name}
        </option>
      ))}
    </select>
  )
}
