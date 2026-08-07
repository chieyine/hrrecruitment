'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { ArrowLeft, CheckCircle2, AlertCircle, Send } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { SaveIndicator } from '@/components/ui/PageElements'

export const dynamic = 'force-dynamic'

function ApplyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const vacancyId = searchParams.get('vacancyId')

  const [vacancy, setVacancy] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [declarationsAccepted, setDeclarationsAccepted] = useState(false)
  const [candidateDocuments, setCandidateDocuments] = useState<any[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loadProblem, setLoadProblem] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [lowData, setLowData] = useState(false)
  const [online, setOnline] = useState(true)
  const submissionKey = useRef(crypto.randomUUID())
  const formRef = useRef<HTMLFormElement>(null)
  const localDraftKey = vacancyId ? `frad-application-draft:${vacancyId}` : null

  useEffect(() => {
    setLowData(localStorage.getItem('frad-low-data') === 'true' || searchParams.get('lowData') === '1')
    const updateConnection = () => setOnline(navigator.onLine)
    updateConnection()
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
    }
  }, [searchParams])

  const toggleLowData = () => {
    setLowData((current) => {
      localStorage.setItem('frad-low-data', String(!current))
      return !current
    })
  }

  const restoreLocalDraft = useCallback(() => {
    if (!localDraftKey) return false
    try {
      const saved = JSON.parse(localStorage.getItem(localDraftKey) || 'null')
      if (!saved?.vacancy) return false
      setVacancy(saved.vacancy)
      setAnswers(saved.answers || {})
      setSelectedDocuments(saved.selectedDocuments || {})
      setDeclarationsAccepted(Boolean(saved.declarationsAccepted))
      setLoadProblem('Connection unavailable. Restored your locally saved application draft.')
      setLoading(false)
      return true
    } catch {
      return false
    }
  }, [localDraftKey])

  // Keep a device-local recovery copy as the candidate types. The account
  // draft remains authoritative when reachable; this copy only prevents a
  // connection loss or interrupted save from destroying current work.
  useEffect(() => {
    if (!localDraftKey || !vacancy || loading) return
    localStorage.setItem(
      localDraftKey,
      JSON.stringify({ vacancy, answers, selectedDocuments, declarationsAccepted, savedAt: new Date().toISOString() })
    )
  }, [answers, declarationsAccepted, loading, localDraftKey, selectedDocuments, vacancy])

  useEffect(() => {
    if (!vacancyId) {
      setLoadProblem('No role was selected. Return to open roles and choose the position you want to apply for.')
      setLoading(false)
      return
    }
    let unavailable = false
    // Ask for this vacancy only. Fetching the entire list and filtering client
    // side broke as soon as the public endpoint became paginated.
    fetch(`/api/public/vacancies?id=${encodeURIComponent(vacancyId)}`)
      .then((res) => res.json())
      .then((data) => {
        const found = data.vacancies?.find((v: any) => v.id === vacancyId)
        if (!found) {
          unavailable = true
          setLoadProblem('This role is no longer open for applications.')
          setLoading(false)
          return Promise.reject(new Error('ROLE_UNAVAILABLE'))
        }
        setVacancy(found)
        return Promise.all([
          Promise.resolve(found),
          fetch(`/api/candidate/applications?vacancyId=${encodeURIComponent(vacancyId)}`).then((response) =>
            response.ok ? response.json() : null
          ),
          fetch('/api/candidate/profile').then((response) => (response.ok ? response.json() : null)),
        ])
      })
      .then(([found, data, profileData]) => {
        setCandidateDocuments(profileData?.profile?.documents || [])
        if (data?.application?.isDraft) {
          const restored: Record<string, unknown> = {}
          for (const answer of data.application.answers || []) {
            try {
              restored[answer.vacancyQuestionId] = JSON.parse(answer.answerJson)
            } catch {}
          }
          setAnswers(restored)
          const restoredDocuments: Record<string, string> = {}
          for (const requirement of found?.requiredDocuments || []) {
            const linked = data.application.files?.find(
              (file: any) =>
                file.vacancyRequiredDocumentId === requirement.id ||
                (!file.vacancyRequiredDocumentId &&
                  profileData?.profile?.documents?.some(
                    (doc: any) => doc.fileAssetId === file.fileAssetId && doc.documentType === requirement.documentType
                  ))
            )
            const candidateDocument = profileData?.profile?.documents?.find(
              (doc: any) => doc.fileAssetId === linked?.fileAssetId && doc.documentType === requirement.documentType
            )
            if (candidateDocument) restoredDocuments[requirement.id] = candidateDocument.id
          }
          setSelectedDocuments(restoredDocuments)
        } else if (data?.application?.id) {
          router.replace(`/candidate/applications/${data.application.id}`)
          return
        }
        setLoading(false)
      })
      .catch(() => {
        if (unavailable) return
        if (restoreLocalDraft()) return
        setLoadProblem('The application could not be loaded. Check your connection and try again.')
        setLoading(false)
      })
  }, [restoreLocalDraft, vacancyId, router])

  const save = async (mode: 'DRAFT' | 'SUBMIT') => {
    if (mode === 'SUBMIT' && !declarationsAccepted) {
      setError('You must accept the candidate declarations before submitting.')
      return false
    }
    setSubmitting(true)
    setError('')
    const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({ vacancyQuestionId: qId, answer: val }))
    try {
      const res = await fetch('/api/candidate/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(mode === 'SUBMIT' ? { 'Idempotency-Key': submissionKey.current } : {}),
        },
        body: JSON.stringify({
          vacancyId,
          answers: formattedAnswers,
          documents: Object.entries(selectedDocuments)
            .filter(([, candidateDocumentId]) => candidateDocumentId)
            .map(([requirementId, candidateDocumentId]) => ({ requirementId, candidateDocumentId })),
          mode,
          declarationsAccepted,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Failed to ${mode === 'DRAFT' ? 'save' : 'submit'} application`)
        return false
      }
      if (mode === 'DRAFT') {
        setSaveStatus(
          `Draft saved to your account at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        )
        setError('')
      }
      return data.applicationId as string
    } catch {
      setError('An error occurred while saving your application.')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const applicationId = await save('SUBMIT')
    if (applicationId) {
      if (localDraftKey) localStorage.removeItem(localDraftKey)
      router.push(`/candidate/applications/${applicationId}/receipt`)
      router.refresh()
    }
  }

  const returnToEdit = useCallback(() => {
    setReviewOpen(false)
    // Wait until the dialog has unmounted and completed focus restoration.
    // The real hash target also provides a reliable browser fallback if focus
    // or smooth scrolling is restricted by the user's browser settings.
    window.setTimeout(() => {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}#application-edit-form`
      )
      const firstEditable = formRef.current?.querySelector<HTMLElement>(
        'textarea:not([disabled]), select:not([disabled]), input:not([type="hidden"]):not([disabled])'
      )
      formRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
      if (firstEditable) {
        firstEditable.focus({ preventScroll: true })
      }
    }, 50)
  }, [])

  const uploadQuestionFile = async (questionId: string, file?: File) => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    form.append('sensitivityClass', 'CONFIDENTIAL')
    const response = await fetch('/api/assets/upload', { method: 'POST', body: form })
    const body = await response.json()
    if (response.ok) setAnswers({ ...answers, [questionId]: body.fileAssetId })
    else setError(body.error || 'File upload failed')
  }

  const questionVisible = (question: any) => {
    if (!question.conditionJson) return true
    try {
      const condition = JSON.parse(question.conditionJson)
      const dependency = vacancy.questions[condition.dependsOnIndex]
      if (!dependency) return false
      const actual = answers[dependency.id]
      if (condition.operator === 'CONTAINS')
        return Array.isArray(actual) ? actual.includes(condition.value) : String(actual ?? '').includes(condition.value)
      if (condition.operator === 'NOT_EQUALS') return String(actual ?? '') !== String(condition.value)
      return String(actual ?? '') === String(condition.value)
    } catch {
      return false
    }
  }

  useEffect(() => {
    if (loading || !vacancyId || (!Object.keys(answers).length && !Object.keys(selectedDocuments).length)) return
    const timer = window.setTimeout(async () => {
      setSaveStatus('Saving changes…')
      try {
        const response = await fetch('/api/candidate/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vacancyId,
            answers: Object.entries(answers).map(([vacancyQuestionId, answer]) => ({ vacancyQuestionId, answer })),
            documents: Object.entries(selectedDocuments)
              .filter(([, candidateDocumentId]) => candidateDocumentId)
              .map(([requirementId, candidateDocumentId]) => ({ requirementId, candidateDocumentId })),
            mode: 'DRAFT',
            declarationsAccepted: false,
          }),
        })
        setSaveStatus(
          response.ok
            ? `Saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Not saved. Check your connection and try again.'
        )
      } catch {
        setSaveStatus('Not saved. Check your connection and try again.')
      }
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [answers, selectedDocuments, loading, vacancyId, vacancy, online])

  const visibleQuestions = vacancy?.questions?.filter(questionVisible) || []
  const requiredQuestions = visibleQuestions.filter((question: any) => question.required)
  const completedRequiredQuestions = requiredQuestions.filter((question: any) => {
    const answer = answers[question.id]
    if (question.fieldType === 'DECLARATION') return answer === true
    if (Array.isArray(answer)) return answer.length > 0
    return answer !== undefined && answer !== null && String(answer).trim() !== ''
  }).length
  const requiredDocuments = vacancy?.requiredDocuments?.filter((requirement: any) => requirement.required) || []
  const selectedRequiredDocuments = requiredDocuments.filter(
    (requirement: any) => selectedDocuments[requirement.id]
  ).length

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center">
          <p className="text-xs text-slate-500 font-semibold">Loading vacancy details…</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!vacancy || loadProblem) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-50">
        <Header />
        <main id="main-content" className="flex flex-1 items-center px-4 py-12 sm:px-6">
          <section className="mx-auto w-full max-w-xl border-t-4 border-brand-800 bg-white p-7 shadow-soft sm:p-10">
            <AlertCircle className="h-9 w-9 text-amber-700" />
            <h1 className="mt-6 font-display text-3xl text-navy-900">Application not available</h1>
            <p className="mt-4 text-sm leading-6 text-stone-600">{loadProblem || 'This role could not be opened.'}</p>
            <Link href="/careers" className="btn-primary mt-7">
              View open roles
            </Link>
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className={`flex min-h-screen flex-col bg-slate-50 ${lowData ? '[&_img]:hidden' : ''}`}>
      {!lowData && <Header />}

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/careers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Vacancies
          </Link>

          <div className="section-panel p-5 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p role="status" className={`text-xs font-semibold ${online ? 'text-emerald-700' : 'text-amber-800'}`}>
                  {online
                    ? 'Online — account autosave available'
                    : 'Offline — changes are safe on this device and will resume when connected'}
                </p>
                <button type="button" onClick={toggleLowData} className="rounded border px-3 py-1.5 text-xs font-bold">
                  {lowData ? 'Standard view' : 'Low-data mode'}
                </button>
              </div>
              <span className="font-mono text-xs font-bold text-stone-600">
                {vacancy?.referenceNumber || 'FRAD-VACANCY'}
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
                Apply for {vacancy?.title || 'this role'}
              </h1>
              <p className="text-xs text-slate-500">
                {vacancy?.department?.name} • {vacancy?.dutyStation?.name}
              </p>
              <div className="mt-3">
                <SaveIndicator status={saveStatus} />
              </div>
            </div>

            <section
              aria-labelledby="application-checklist"
              className="grid gap-3 border-y border-stone-200 bg-stone-50 p-4 sm:grid-cols-3"
            >
              <div>
                <h2 id="application-checklist" className="text-xs font-bold uppercase tracking-[0.1em] text-stone-500">
                  Application checklist
                </h2>
                <p className="mt-1 text-sm font-semibold text-stone-900">
                  {requiredQuestions.length + requiredDocuments.length + 1} required items
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-500">Questions</p>
                <p className="mt-1 text-sm font-bold text-stone-900">
                  {completedRequiredQuestions} of {requiredQuestions.length} complete
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-500">Documents and declaration</p>
                <p className="mt-1 text-sm font-bold text-stone-900">
                  {selectedRequiredDocuments + (declarationsAccepted ? 1 : 0)} of {requiredDocuments.length + 1}{' '}
                  complete
                </p>
              </div>
            </section>

            {error && (
              <div
                role={error.startsWith('Draft saved') ? 'status' : 'alert'}
                className={`flex items-center gap-2 rounded-xl border p-4 text-xs font-medium ${error.startsWith('Draft saved') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}
              >
                {error.startsWith('Draft saved') ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span>{error}</span>
              </div>
            )}

            <form
              id="application-edit-form"
              ref={formRef}
              data-testid="application-edit-form"
              onSubmit={handleSubmit}
              className="scroll-mt-28 space-y-6"
            >
              {/* Profile Snapshot Reminder */}
              <div className="border-l-4 border-brand-600 bg-brand-50 p-4 text-sm text-stone-700 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-brand-700" /> Your saved profile is included
                </span>
                <p>
                  We will take a copy of your profile when you submit. Changes made later will not alter this
                  application.
                </p>
              </div>

              {/* Vacancy Questions */}
              {vacancy?.questions && vacancy.questions.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                    Questions for this role
                  </h3>

                  {vacancy.questions.map((q: any) => {
                    if (!questionVisible(q)) return null
                    const questionId = `question-${q.id}`
                    let configuration: any = {}
                    try {
                      configuration = q.configurationJson ? JSON.parse(q.configurationJson) : {}
                    } catch {}
                    const options: string[] = configuration.options || []
                    return (
                      <div key={q.id} className="space-y-1.5">
                        <label htmlFor={questionId} className="block text-xs font-bold text-slate-900">
                          {q.label} {q.required && <span className="text-rose-600">*</span>}
                        </label>
                        {q.helpText && <p className="text-[11px] text-slate-500">{q.helpText}</p>}
                        {q.fieldType === 'LONGTEXT' ? (
                          <textarea
                            id={questionId}
                            required={q.required}
                            rows={3}
                            value={answers[q.id] || ''}
                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                            placeholder="Write your answer"
                            className="field-control"
                          />
                        ) : q.fieldType === 'YESNO' ? (
                          <select
                            id={questionId}
                            required={q.required}
                            value={answers[q.id] ?? ''}
                            onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })}
                            className="field-control"
                          >
                            <option value="">Choose an answer</option>
                            <option value="YES">Yes</option>
                            <option value="NO">No</option>
                          </select>
                        ) : q.fieldType === 'SELECT' ? (
                          <select
                            id={questionId}
                            required={q.required}
                            value={answers[q.id] ?? ''}
                            onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })}
                            className="field-control"
                          >
                            <option value="">Choose an answer</option>
                            {options.map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                        ) : q.fieldType === 'MULTISELECT' ? (
                          <div className="space-y-1">
                            {options.map((option) => {
                              const selected = Array.isArray(answers[q.id]) ? answers[q.id] : []
                              return (
                                <label key={option} className="flex gap-2 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(option)}
                                    onChange={(event) =>
                                      setAnswers({
                                        ...answers,
                                        [q.id]: event.target.checked
                                          ? [...selected, option]
                                          : selected.filter((item: string) => item !== option),
                                      })
                                    }
                                  />
                                  {option}
                                </label>
                              )
                            })}
                          </div>
                        ) : q.fieldType === 'DECLARATION' ? (
                          <label className="flex gap-2 text-xs">
                            <input
                              required={q.required}
                              type="checkbox"
                              checked={answers[q.id] === true}
                              onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.checked })}
                            />
                            I confirm this declaration
                          </label>
                        ) : q.fieldType === 'FILE' ? (
                          <div>
                            <input
                              id={questionId}
                              required={q.required && !answers[q.id]}
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(event) => void uploadQuestionFile(q.id, event.target.files?.[0])}
                            />
                            {answers[q.id] && <p className="text-xs text-emerald-700">File attached.</p>}
                          </div>
                        ) : (
                          <input
                            id={questionId}
                            required={q.required}
                            type={q.fieldType === 'NUMBER' ? 'number' : q.fieldType === 'DATE' ? 'date' : 'text'}
                            value={answers[q.id] ?? ''}
                            onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })}
                            className="field-control"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Declarations */}
              {vacancy?.requiredDocuments?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                    Required documents
                  </h3>
                  {vacancy.requiredDocuments.map((requirement: any) => {
                    const options = candidateDocuments.filter(
                      (document) => document.documentType === requirement.documentType
                    )
                    return (
                      <div key={requirement.id} className="space-y-1">
                        <label
                          htmlFor={`document-${requirement.id}`}
                          className="block text-xs font-bold text-slate-900"
                        >
                          {requirement.documentType.replaceAll('_', ' ')}{' '}
                          {requirement.required && <span className="text-rose-600">*</span>}
                        </label>
                        <select
                          id={`document-${requirement.id}`}
                          required={requirement.required}
                          value={selectedDocuments[requirement.id] || ''}
                          onChange={(event) =>
                            setSelectedDocuments({ ...selectedDocuments, [requirement.id]: event.target.value })
                          }
                          className="field-control"
                        >
                          <option value="">Select a saved document</option>
                          {options.map((document: any) => (
                            <option key={document.id} value={document.id}>
                              {document.fileAsset?.originalName || document.documentType}
                            </option>
                          ))}
                        </select>
                        {!options.length && (
                          <p className="text-xs text-amber-700">
                            Upload this document in{' '}
                            <Link className="underline font-bold" href="/candidate/profile/documents">
                              your document library
                            </Link>{' '}
                            before submitting.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Before you submit</h3>
                <div className="space-y-2 text-xs text-slate-600">
                  <p>I confirm that the information in this application and my saved profile is accurate.</p>
                  <p>I understand that FRAD does not charge candidates at any stage of recruitment.</p>
                  <p>
                    I understand that false or misleading information may lead to disqualification or, if discovered
                    later, dismissal.
                  </p>
                </div>

                <label className="flex items-center gap-2 pt-2 text-xs font-bold text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declarationsAccepted}
                    onChange={(e) => setDeclarationsAccepted(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>I confirm the statements above</span>
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-4">
                <button type="button" onClick={() => save('DRAFT')} disabled={submitting} className="btn-secondary">
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!formRef.current?.reportValidity()) return
                    if (completedRequiredQuestions !== requiredQuestions.length) {
                      setError('Complete all required questions before reviewing your application.')
                      return
                    }
                    if (selectedRequiredDocuments !== requiredDocuments.length) {
                      setError('Attach all required documents before reviewing your application.')
                      return
                    }
                    if (!declarationsAccepted) {
                      setError('Confirm the declarations before reviewing your application.')
                      return
                    }
                    setError('')
                    setReviewOpen(true)
                  }}
                  disabled={submitting}
                  className="btn-primary"
                >
                  Review application
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Dialog open={reviewOpen} onClose={returnToEdit} title="Review your application">
        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Role</p>
            <p className="mt-1 font-bold text-stone-900">{vacancy?.title}</p>
            <p className="text-xs text-stone-500">{vacancy?.referenceNumber}</p>
          </div>
          {visibleQuestions.map((question: any) => (
            <div key={question.id} className="border-t border-stone-200 pt-3">
              <p className="text-xs font-semibold text-stone-600">{question.label}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-stone-900">
                {Array.isArray(answers[question.id])
                  ? answers[question.id].join(', ')
                  : answers[question.id] === true
                    ? 'Confirmed'
                    : String(answers[question.id] ?? 'Not answered')}
              </p>
            </div>
          ))}
          <p className="border-t border-stone-200 pt-3 text-xs leading-5 text-stone-600">
            Submitting creates a fixed copy of your profile, answers and selected documents. You can withdraw later, but
            you cannot edit this application after submission.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={returnToEdit} className="btn-secondary">
              Go back and edit
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={(event) => {
                setReviewOpen(false)
                void handleSubmit(event as unknown as React.FormEvent)
              }}
              className="btn-primary"
            >
              {submitting ? 'Submitting…' : 'Submit application'} <Send className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </Dialog>

      {!lowData && <Footer />}
    </div>
  )
}

export default function ApplicationApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-slate-50">
          <Header />
          <main id="main-content" className="flex-1 flex items-center justify-center">
            <p className="text-xs text-slate-500 font-semibold">Loading application form…</p>
          </main>
          <Footer />
        </div>
      }
    >
      <ApplyForm />
    </Suspense>
  )
}
