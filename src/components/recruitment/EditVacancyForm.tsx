'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { PageIntro } from '@/components/ui/PageElements'

type Item = { id: string; name: string; code?: string; scorecardType?: string }
type Question = { label: string; fieldType: string; required: boolean; configurationJson?: { options: string[] } }
type RequiredDocument = { documentType: string; required: boolean }

const blank = {
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
  openingAt: '',
  closingAt: '',
  summary: '',
  responsibilities: '',
  essentialQualifications: '',
  desirableQualifications: '',
  desiredExperience: '',
  languageRequirements: '',
  technicalSkills: '',
  behaviouralCompetencies: '',
  safeguardingResponsibilities: '',
  travelRequirement: '',
  screeningScorecardTemplateId: '',
  interviewScorecardTemplateId: '',
  preboardingPackageId: '',
}

export default function EditVacancyForm({ vacancyId }: { vacancyId: string }) {
  const router = useRouter()
  const [form, setForm] = useState(blank)
  const [questions, setQuestions] = useState<Question[]>([])
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([])
  const [options, setOptions] = useState<{
    departments: Item[]
    dutyStations: Item[]
    categories: Item[]
    projects: Item[]
    contractTypes: Item[]
    documentTypes: Item[]
    scorecards: Item[]
    packages: Item[]
  }>({
    departments: [],
    dutyStations: [],
    categories: [],
    projects: [],
    contractTypes: [],
    documentTypes: [],
    scorecards: [],
    packages: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lockVersion, setLockVersion] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch('/api/recruitment/vacancies?reference=1', { signal: controller.signal }),
      fetch(`/api/recruitment/vacancies/${vacancyId}`, { signal: controller.signal }),
    ])
      .then(async ([optionResponse, vacancyResponse]) => {
        const [optionBody, vacancyBody] = await Promise.all([optionResponse.json(), vacancyResponse.json()])
        if (!optionResponse.ok) throw new Error(optionBody.error || 'Unable to load vacancy options.')
        if (!vacancyResponse.ok) throw new Error(vacancyBody.error || 'Unable to load the vacancy.')
        const vacancy = vacancyBody.vacancy
        if (vacancy.status !== 'DRAFT') throw new Error('This vacancy is no longer editable.')
        setOptions({
          departments: optionBody.departments ?? [],
          dutyStations: optionBody.dutyStations ?? [],
          categories: optionBody.categories ?? [],
          projects: optionBody.projects ?? [],
          contractTypes: optionBody.contractTypes ?? [],
          documentTypes: optionBody.documentTypes ?? [],
          scorecards: optionBody.scorecards ?? [],
          packages: optionBody.packages ?? [],
        })
        setLockVersion(vacancy.lockVersion)
        setForm({
          ...blank,
          ...Object.fromEntries(Object.keys(blank).map((key) => [key, vacancy[key] ?? ''])),
          numberOfPositions: String(vacancy.numberOfPositions ?? 1),
          minimumExperienceYears: String(vacancy.minimumExperienceYears ?? 0),
          openingAt: vacancy.openingAt?.slice(0, 10) || '',
          closingAt: vacancy.closingAt?.slice(0, 10) || '',
        })
        setQuestions(
          (vacancy.questions ?? []).map((question: any) => ({
            label: question.label,
            fieldType: question.fieldType,
            required: question.required,
            configurationJson: readOptions(question.configurationJson),
          }))
        )
        setRequiredDocuments(
          (vacancy.requiredDocuments ?? []).map((document: any) => ({
            documentType: document.documentType,
            required: document.required,
          }))
        )
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Unable to load the vacancy.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [vacancyId])

  const update = (key: keyof typeof blank, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/recruitment/vacancies/${vacancyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          projectId: form.projectId || null,
          screeningScorecardTemplateId: form.screeningScorecardTemplateId || null,
          interviewScorecardTemplateId: form.interviewScorecardTemplateId || null,
          preboardingPackageId: form.preboardingPackageId || null,
          questions,
          requiredDocuments,
          lockVersion,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to save the vacancy.')
      router.push(`/recruitment/vacancies/${vacancyId}`)
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the vacancy.')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <main id="main-content" className="flex flex-1 items-center justify-center py-12">
        <p className="text-sm font-semibold text-stone-500">Loading vacancy draft…</p>
      </main>
    )

  return (
    <main id="main-content" className="flex-1 py-7 sm:py-9">
      <div className="page-shell max-w-6xl space-y-6">
        <Link
          href={`/recruitment/vacancies/${vacancyId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" /> Vacancy
        </Link>
        <PageIntro
          eyebrow="Vacancy draft"
          title="Edit vacancy"
          description="Complete the specification and selection setup before submitting it for approval."
        />
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <form onSubmit={save} className="space-y-5">
          <Section title="Role and advert" description="Ownership, contract and publication dates.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Text label="Job title" value={form.title} onChange={(value) => update('title', value)} required />
              <Select
                label="Department"
                value={form.departmentId}
                items={options.departments}
                onChange={(value) => update('departmentId', value)}
                required
              />
              <Select
                label="Category"
                value={form.categoryId}
                items={options.categories}
                onChange={(value) => update('categoryId', value)}
                required
              />
              <Select
                label="Duty station"
                value={form.dutyStationId}
                items={options.dutyStations}
                onChange={(value) => update('dutyStationId', value)}
                required
              />
              <Select
                label="Project (optional)"
                value={form.projectId}
                items={options.projects}
                onChange={(value) => update('projectId', value)}
              />
              <Text
                label="Reports to (optional)"
                value={form.reportingLine}
                onChange={(value) => update('reportingLine', value)}
              />
              <Select
                label="Contract type"
                value={form.contractType}
                items={options.contractTypes}
                valueKey="code"
                onChange={(value) => update('contractType', value)}
                required
              />
              <Text
                label="Contract duration (optional)"
                value={form.contractDuration}
                onChange={(value) => update('contractDuration', value)}
              />
              <Text
                label="Positions"
                type="number"
                value={form.numberOfPositions}
                onChange={(value) => update('numberOfPositions', value)}
                required
              />
              <Text
                label="Minimum experience (years)"
                type="number"
                value={form.minimumExperienceYears}
                onChange={(value) => update('minimumExperienceYears', value)}
                required
              />
              <Text
                label="Opening date"
                type="date"
                value={form.openingAt}
                onChange={(value) => update('openingAt', value)}
                required
              />
              <Text
                label="Closing date"
                type="date"
                value={form.closingAt}
                onChange={(value) => update('closingAt', value)}
                required
              />
            </div>
          </Section>

          <Section title="Role specification" description="This is the wording candidates will read.">
            <div className="space-y-4">
              <Area
                label="Summary"
                value={form.summary}
                onChange={(value) => update('summary', value)}
                required
                rows={4}
              />
              <Area
                label="Responsibilities"
                value={form.responsibilities}
                onChange={(value) => update('responsibilities', value)}
                required
                rows={6}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Area
                  label="Essential requirements"
                  value={form.essentialQualifications}
                  onChange={(value) => update('essentialQualifications', value)}
                  required
                />
                <Area
                  label="Desirable requirements (optional)"
                  value={form.desirableQualifications}
                  onChange={(value) => update('desirableQualifications', value)}
                />
                <Area
                  label="Relevant experience (optional)"
                  value={form.desiredExperience}
                  onChange={(value) => update('desiredExperience', value)}
                />
                <Area
                  label="Languages (optional)"
                  value={form.languageRequirements}
                  onChange={(value) => update('languageRequirements', value)}
                />
                <Area
                  label="Technical skills (optional)"
                  value={form.technicalSkills}
                  onChange={(value) => update('technicalSkills', value)}
                />
                <Area
                  label="Behavioural competencies (optional)"
                  value={form.behaviouralCompetencies}
                  onChange={(value) => update('behaviouralCompetencies', value)}
                />
                <Area
                  label="Safeguarding responsibilities (optional)"
                  value={form.safeguardingResponsibilities}
                  onChange={(value) => update('safeguardingResponsibilities', value)}
                />
                <Area
                  label="Travel requirement (optional)"
                  value={form.travelRequirement}
                  onChange={(value) => update('travelRequirement', value)}
                />
              </div>
            </div>
          </Section>

          <Section
            title="Selection and preboarding"
            description="Choose controlled templates; leave a choice blank if it is not required."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Select
                label="Screening scorecard"
                value={form.screeningScorecardTemplateId}
                items={options.scorecards.filter((item) => item.scorecardType === 'SCREENING')}
                onChange={(value) => update('screeningScorecardTemplateId', value)}
              />
              <Select
                label="Interview scorecard"
                value={form.interviewScorecardTemplateId}
                items={options.scorecards.filter((item) => item.scorecardType !== 'SCREENING')}
                onChange={(value) => update('interviewScorecardTemplateId', value)}
              />
              <Select
                label="Preboarding package"
                value={form.preboardingPackageId}
                items={options.packages}
                onChange={(value) => update('preboardingPackageId', value)}
              />
            </div>
          </Section>

          <Section
            title="Candidate application"
            description="Ask only for information used in screening. Request files through document requirements, not file questions."
          >
            <QuestionEditor questions={questions} onChange={setQuestions} />
            <div className="mt-7 border-t border-stone-200 pt-6">
              <DocumentEditor
                documents={requiredDocuments}
                documentTypes={options.documentTypes}
                onChange={setRequiredDocuments}
              />
            </div>
          </Section>

          <div className="flex justify-end border-t border-stone-200 pt-5">
            <button disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

function readOptions(value: string | null) {
  try {
    const parsed = value ? JSON.parse(value) : null
    return Array.isArray(parsed?.options) ? { options: parsed.options.map(String) } : undefined
  } catch {
    return undefined
  }
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
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

function Text({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <label className="field-label">
      {label}
      <input
        type={type}
        min={type === 'number' ? 0 : undefined}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control"
      />
    </label>
  )
}

function Area({
  label,
  value,
  onChange,
  required,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  rows?: number
}) {
  return (
    <label className="field-label">
      {label}
      <textarea
        required={required}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control"
      />
    </label>
  )
}

function Select({
  label,
  value,
  items,
  onChange,
  required,
  valueKey = 'id',
}: {
  label: string
  value: string
  items: Item[]
  onChange: (value: string) => void
  required?: boolean
  valueKey?: 'id' | 'code'
}) {
  return (
    <label className="field-label">
      {label}
      <select
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control"
      >
        <option value="">{required ? 'Select one' : 'None'}</option>
        {items.map((item) => (
          <option key={item.id} value={valueKey === 'code' ? item.code : item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function QuestionEditor({ questions, onChange }: { questions: Question[]; onChange: (questions: Question[]) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy-900">Application questions</h3>
        <button
          type="button"
          onClick={() => onChange([...questions, { label: '', fieldType: 'LONGTEXT', required: true }])}
          className="btn-secondary"
        >
          <Plus className="h-4 w-4" /> Add question
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {questions.length === 0 && <p className="text-sm text-stone-500">No additional questions.</p>}
        {questions.map((question, index) => (
          <div key={index} className="grid gap-3 border border-stone-200 p-4 md:grid-cols-[1fr_180px_auto]">
            <Text
              label={`Question ${index + 1}`}
              value={question.label}
              onChange={(label) =>
                onChange(questions.map((item, itemIndex) => (itemIndex === index ? { ...item, label } : item)))
              }
              required
            />
            <label className="field-label">
              Answer type
              <select
                value={question.fieldType}
                onChange={(event) =>
                  onChange(
                    questions.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, fieldType: event.target.value, configurationJson: undefined }
                        : item
                    )
                  )
                }
                className="field-control"
              >
                <option value="TEXT">Short text</option>
                <option value="LONGTEXT">Long text</option>
                <option value="NUMBER">Number</option>
                <option value="DATE">Date</option>
                <option value="YESNO">Yes / no</option>
                <option value="SELECT">Select one</option>
                <option value="MULTISELECT">Select many</option>
                <option value="DECLARATION">Declaration</option>
              </select>
            </label>
            <button
              type="button"
              aria-label={`Remove question ${index + 1}`}
              onClick={() => onChange(questions.filter((_, itemIndex) => itemIndex !== index))}
              className="btn-icon self-end text-rose-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {['SELECT', 'MULTISELECT'].includes(question.fieldType) && (
              <label className="field-label md:col-span-2">
                Options, one per line
                <textarea
                  required
                  rows={4}
                  value={question.configurationJson?.options.join('\n') || ''}
                  onChange={(event) =>
                    onChange(
                      questions.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              configurationJson: {
                                options: event.target.value
                                  .split('\n')
                                  .map((option) => option.trim())
                                  .filter(Boolean),
                              },
                            }
                          : item
                      )
                    )
                  }
                  className="field-control"
                />
              </label>
            )}
            <label className="flex items-center gap-2 self-end pb-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(event) =>
                  onChange(
                    questions.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, required: event.target.checked } : item
                    )
                  )
                }
              />{' '}
              Required
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

function DocumentEditor({
  documents,
  documentTypes,
  onChange,
}: {
  documents: RequiredDocument[]
  documentTypes: Item[]
  onChange: (documents: RequiredDocument[]) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy-900">Document requirements</h3>
        <button
          type="button"
          onClick={() => onChange([...documents, { documentType: '', required: true }])}
          className="btn-secondary"
        >
          <Plus className="h-4 w-4" /> Add document
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {documents.length === 0 && <p className="text-sm text-stone-500">No documents requested.</p>}
        {documents.map((document, index) => (
          <div key={index} className="flex flex-wrap items-center gap-3 border border-stone-200 p-4">
            <select
              required
              aria-label={`Document ${index + 1}`}
              value={document.documentType}
              onChange={(event) =>
                onChange(
                  documents.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, documentType: event.target.value } : item
                  )
                )
              }
              className="field-control min-w-64 flex-1"
            >
              <option value="">Select document type</option>
              {documentTypes.map((item) => (
                <option key={item.id} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={document.required}
                onChange={(event) =>
                  onChange(
                    documents.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, required: event.target.checked } : item
                    )
                  )
                }
              />{' '}
              Required
            </label>
            <button
              type="button"
              aria-label={`Remove document ${index + 1}`}
              onClick={() => onChange(documents.filter((_, itemIndex) => itemIndex !== index))}
              className="btn-icon text-rose-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
