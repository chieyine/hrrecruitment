'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'

export default function EditVacancyPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const router = useRouter()

  const [departments, setDepartments] = useState<any[]>([])
  const [dutyStations, setDutyStations] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [scorecards, setScorecards] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [contractTypes, setContractTypes] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [documentTypes, setDocumentTypes] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [vacancyStatus, setVacancyStatus] = useState('DRAFT')
  const [questions, setQuestions] = useState<Array<{ label: string; fieldType: string; required: boolean; configurationJson?: { options: string[] }; conditionJson?: { dependsOnIndex: number; operator: 'EQUALS'|'NOT_EQUALS'|'CONTAINS'; value: string } }>>([])
  const [requiredDocuments, setRequiredDocuments] = useState<Array<{ documentType: string; required: boolean }>>([])

  const [form, setForm] = useState(() => ({
    title: '',
    departmentId: '',
    categoryId: '',
    dutyStationId: '',
    contractType: 'FIXED_TERM',
    contractDuration: '',
    projectId: '',
    reportingLine: '',
    numberOfPositions: '1',
    minimumExperienceYears: '0',
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
    openingAt: '',
    closingAt: '',
  }))

  useEffect(() => {
    Promise.all([
      fetch('/api/recruitment/vacancies').then(res => res.json()),
      fetch(`/api/recruitment/vacancies/${params.id}`).then(res => res.json())
    ])
      .then(([optionsData, vacancyData]) => {
        setDepartments(optionsData.departments || [])
        setDutyStations(optionsData.dutyStations || [])
        setCategories(optionsData.categories || [])
        setProjects(optionsData.projects || [])
        setScorecards(optionsData.scorecards || [])
        setPackages(optionsData.packages || [])
        setContractTypes(optionsData.contractTypes || [])
        setDocumentTypes(optionsData.documentTypes || [])

        if (vacancyData.vacancy) {
          const v = vacancyData.vacancy
          setVacancyStatus(v.status)
          setForm({
            title: v.title || '',
            departmentId: v.departmentId || '',
            categoryId: v.categoryId || '',
            dutyStationId: v.dutyStationId || '',
            contractType: v.contractType || 'FIXED_TERM',
            contractDuration: v.contractDuration || '',
            projectId: v.projectId || '',
            reportingLine: v.reportingLine || '',
            numberOfPositions: v.numberOfPositions?.toString() || '1',
            minimumExperienceYears: v.minimumExperienceYears?.toString() || '0',
            summary: v.summary || '',
            responsibilities: v.responsibilities || '',
            essentialQualifications: v.essentialQualifications || '',
            desirableQualifications: v.desirableQualifications || '',
            desiredExperience: v.desiredExperience || '',
            languageRequirements: v.languageRequirements || '',
            technicalSkills: v.technicalSkills || '',
            behaviouralCompetencies: v.behaviouralCompetencies || '',
            safeguardingResponsibilities: v.safeguardingResponsibilities || '',
            travelRequirement: v.travelRequirement || '',
            screeningScorecardTemplateId: v.screeningScorecardTemplateId || '',
            interviewScorecardTemplateId: v.interviewScorecardTemplateId || '',
            preboardingPackageId: v.preboardingPackageId || '',
            openingAt: v.openingAt ? v.openingAt.slice(0, 10) : '',
            closingAt: v.closingAt ? v.closingAt.slice(0, 10) : '',
          })
          
          if (v.questions) {
            setQuestions(v.questions.sort((a: any, b: any) => a.displayOrder - b.displayOrder).map((q: any) => ({
              label: q.label,
              fieldType: q.fieldType,
              required: q.required,
              configurationJson: q.configurationJson ? JSON.parse(q.configurationJson) : undefined,
              conditionJson: q.conditionJson ? JSON.parse(q.conditionJson) : undefined,
            })))
          }
          if (v.requiredDocuments) {
            setRequiredDocuments(v.requiredDocuments.map((d: any) => ({
              documentType: d.documentType,
              required: d.required
            })))
          }
        }
      })
      .catch(() => setError('Could not load vacancy details.'))
      .finally(() => setLoading(false))
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const res = await fetch(`/api/recruitment/vacancies/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, questions, requiredDocuments }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update vacancy')
        setSaving(false)
        return
      }

      router.push(`/recruitment/vacancies/${params.id}`)
      router.refresh()
    } catch {
      setError('An error occurred while updating the vacancy.')
      setSaving(false)
    }
  }

  const canEditFormBuilder = ['DRAFT', 'PENDING_APPROVAL'].includes(vacancyStatus)

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center py-10">
          <p className="text-slate-500 text-sm font-semibold">Loading vacancy...</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href={`/recruitment/vacancies/${params.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Vacancy Details
          </Link>

          <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                HR Vacancy Edit
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
                Edit Vacancy
              </h1>
              {!canEditFormBuilder && (
                <p className="text-xs text-amber-600 font-bold mt-2 bg-amber-50 p-2 rounded-lg inline-block border border-amber-200">
                  Application questions and document requirements cannot be edited after publication.
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-800">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Senior Health Officer"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    required
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Job Category</label>
                  <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none">
                    <option value="">Select Category</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Duty Station
                  </label>
                  <select
                    required
                    value={form.dutyStationId}
                    onChange={(e) => setForm({ ...form, dutyStationId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none bg-white"
                  >
                    <option value="">Select Duty Station</option>
                    {dutyStations.map((ds) => (
                      <option key={ds.id} value={ds.id}>{ds.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Contract Type
                  </label>
                  <select
                    value={form.contractType}
                    onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none bg-white"
                  >
                    {contractTypes.map((contractType) => (
                      <option key={contractType.id} value={contractType.code}>{contractType.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Positions Available
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.numberOfPositions}
                    onChange={(e) => setForm({ ...form, numberOfPositions: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Min Years Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minimumExperienceYears}
                    onChange={(e) => setForm({ ...form, minimumExperienceYears: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Opening Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.openingAt}
                    onChange={(e) => setForm({ ...form, openingAt: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Closing Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.closingAt}
                    onChange={(e) => setForm({ ...form, closingAt: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Job Summary
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="High-level overview of the role..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Project<select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs"><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Reporting line<input value={form.reportingLine} onChange={(event) => setForm({ ...form, reportingLine: event.target.value })} placeholder="For example: Head of Programmes" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs" /></label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ['desiredExperience', 'Desired experience'],
                  ['languageRequirements', 'Language requirements'],
                  ['technicalSkills', 'Technical skills'],
                  ['behaviouralCompetencies', 'Behavioural competencies'],
                  ['safeguardingResponsibilities', 'Safeguarding responsibilities'],
                  ['travelRequirement', 'Travel requirement'],
                ].map(([key, label]) => <label key={key} className="block text-xs font-bold uppercase tracking-wider text-slate-700">{label}<textarea rows={3} value={(form as any)[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs normal-case font-normal" /></label>)}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Screening scorecard<select value={form.screeningScorecardTemplateId} onChange={(event) => setForm({ ...form, screeningScorecardTemplateId: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs"><option value="">Use default</option>{scorecards.filter((item) => item.scorecardType === 'SCREENING').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Interview scorecard<select value={form.interviewScorecardTemplateId} onChange={(event) => setForm({ ...form, interviewScorecardTemplateId: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs"><option value="">Choose later</option>{scorecards.filter((item) => item.scorecardType !== 'SCREENING').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Preboarding package<select value={form.preboardingPackageId} onChange={(event) => setForm({ ...form, preboardingPackageId: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs"><option value="">Choose later</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Key Responsibilities
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.responsibilities}
                  onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
                  placeholder="- Bullet list of main duties..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Essential Qualifications
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.essentialQualifications}
                  onChange={(e) => setForm({ ...form, essentialQualifications: e.target.value })}
                  placeholder="Degrees, professional licenses, essential skills..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <div className="flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Application questions</h2>{canEditFormBuilder && <button type="button" onClick={() => setQuestions([...questions, { label: '', fieldType: 'LONGTEXT', required: true }])} className="text-xs font-bold text-blue-700">+ Add question</button>}</div>
                  {questions.map((question, index) => <div key={index} className="grid gap-2 rounded-xl border bg-white p-3 sm:grid-cols-[1fr_160px_auto]"><input required disabled={!canEditFormBuilder} value={question.label} onChange={(e) => setQuestions(questions.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} placeholder="Question label" className="rounded-lg border border-slate-300 p-2 text-xs" /><select disabled={!canEditFormBuilder} value={question.fieldType} onChange={(e) => setQuestions(questions.map((item, i) => i === index ? { ...item, fieldType: e.target.value } : item))} className="rounded-lg border border-slate-300 p-2 text-xs"><option value="TEXT">Short text</option><option value="LONGTEXT">Long text</option><option value="NUMBER">Number</option><option value="YESNO">Yes/No</option><option value="DATE">Date</option><option value="SELECT">Select one</option><option value="MULTISELECT">Select many</option><option value="FILE">File</option><option value="DECLARATION">Declaration</option></select>{canEditFormBuilder && <button type="button" onClick={() => setQuestions(questions.filter((_, i) => i !== index))} className="text-xs font-bold text-rose-700">Remove</button>}{['SELECT','MULTISELECT'].includes(question.fieldType) && <textarea required disabled={!canEditFormBuilder} value={question.configurationJson?.options.join('\n') || ''} onChange={(event) => setQuestions(questions.map((item, i) => i === index ? { ...item, configurationJson: { options: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) } } : item))} placeholder="Options, one per line" className="rounded-lg border border-slate-300 p-2 text-xs sm:col-span-2" />}{index>0&&<div className="grid gap-2 sm:col-span-3 sm:grid-cols-3"><select disabled={!canEditFormBuilder} value={question.conditionJson?.dependsOnIndex??''} onChange={(event)=>setQuestions(questions.map((item,i)=>i===index?{...item,conditionJson:event.target.value===''?undefined:{dependsOnIndex:Number(event.target.value),operator:'EQUALS',value:''}}:item))} className="rounded-lg border p-2 text-xs"><option value="">Always show</option>{questions.slice(0,index).map((dependency,dependencyIndex)=><option key={dependencyIndex} value={dependencyIndex}>Show based on: {dependency.label||`Question ${dependencyIndex+1}`}</option>)}</select>{question.conditionJson&&<><select disabled={!canEditFormBuilder} value={question.conditionJson.operator} onChange={(event)=>setQuestions(questions.map((item,i)=>i===index?{...item,conditionJson:{...item.conditionJson!,operator:event.target.value as any}}:item))} className="rounded-lg border p-2 text-xs"><option value="EQUALS">Equals</option><option value="NOT_EQUALS">Does not equal</option><option value="CONTAINS">Contains</option></select><input disabled={!canEditFormBuilder} required value={question.conditionJson.value} onChange={(event)=>setQuestions(questions.map((item,i)=>i===index?{...item,conditionJson:{...item.conditionJson!,value:event.target.value}}:item))} placeholder="Trigger value" className="rounded-lg border p-2 text-xs"/></>}</div>}</div>)}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <div className="flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Required documents</h2>{canEditFormBuilder && <button type="button" onClick={() => setRequiredDocuments([...requiredDocuments, { documentType: '', required: true }])} className="text-xs font-bold text-blue-700">+ Add document</button>}</div>
                {requiredDocuments.map((document, index) => <div key={index} className="flex gap-2"><select disabled={!canEditFormBuilder} required aria-label={`Required document ${index + 1}`} value={document.documentType} onChange={(e) => setRequiredDocuments(requiredDocuments.map((item, i) => i === index ? { ...item, documentType: e.target.value } : item))} className="flex-1 rounded-lg border border-slate-300 p-2 text-xs"><option value="">Choose a configured document type</option>{documentTypes.map((type) => <option key={type.id} value={type.code}>{type.name}</option>)}</select>{canEditFormBuilder && <button type="button" onClick={() => setRequiredDocuments(requiredDocuments.filter((_, i) => i !== index))} className="text-xs font-bold text-rose-700">Remove</button>}</div>)}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                  <Save className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
