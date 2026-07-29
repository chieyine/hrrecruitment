'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

async function postAction(action: string, resourceId: string, data: Record<string, unknown>) {
  const response = await fetch('/api/candidate/preboarding/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, resourceId, data }),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json.error || 'Action failed')
}

export type DynamicFormField = {
  name: string
  label?: string
  type?: string
  required?: boolean
  helpText?: string
  options?: string[]
}

export function FormAction({
  resourceId,
  fields,
  initialResponses = {},
}: {
  resourceId: string
  fields: DynamicFormField[]
  initialResponses?: Record<string, unknown>
}) {
  const router = useRouter()
  const [responses, setResponses] = useState<Record<string, unknown>>(initialResponses)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const key = `frad-preboarding-form:${resourceId}`
    if (!Object.keys(initialResponses).length) {
      try {
        const local = JSON.parse(localStorage.getItem(key) || '{}')
        if (local.responses) setResponses(local.responses)
      } catch {}
    }
  }, [resourceId, initialResponses])

  useEffect(() => {
    if (!Object.keys(responses).length) return
    const timer = window.setTimeout(async () => {
      localStorage.setItem(
        `frad-preboarding-form:${resourceId}`,
        JSON.stringify({ responses, savedAt: new Date().toISOString() })
      )
      try {
        await postAction('FORM_SAVE', resourceId, { responses })
      } catch {}
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [responses, resourceId])

  const save = async (action: 'FORM_SAVE' | 'FORM_SUBMIT') => {
    setBusy(true)
    setMessage('')
    setIsError(false)
    try {
      await postAction(action, resourceId, { responses })
      setMessage(action === 'FORM_SUBMIT' ? 'Form submitted for review.' : 'Draft saved.')
      router.refresh()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : 'Form could not be saved')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        void save('FORM_SUBMIT')
      }}
    >
      {fields.map((field) => {
        const id = `form-${resourceId}-${field.name}`
        const type = String(field.type || 'text').toLowerCase()
        const value = responses[field.name]
        const common = {
          id,
          required: Boolean(field.required),
          'aria-describedby': field.helpText ? `${id}-help` : undefined,
        }
        return (
          <div key={field.name}>
            <label htmlFor={id} className="block text-xs font-bold text-slate-800">
              {field.label || field.name.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}
              {field.required && (
                <span className="ml-1 text-red-700" aria-hidden="true">
                  *
                </span>
              )}
            </label>
            {field.helpText && (
              <p id={`${id}-help`} className="mt-1 text-xs text-slate-500">
                {field.helpText}
              </p>
            )}
            {['longtext', 'textarea'].includes(type) ? (
              <textarea
                {...common}
                value={String(value ?? '')}
                onChange={(event) => setResponses({ ...responses, [field.name]: event.target.value })}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            ) : ['select', 'dropdown', 'singleselect'].includes(type) ? (
              <select
                {...common}
                value={String(value ?? '')}
                onChange={(event) => setResponses({ ...responses, [field.name]: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="">Select an option</option>
                {(field.options || []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : type === 'multiselect' ? (
              <fieldset className="mt-2 space-y-2" aria-describedby={field.helpText ? `${id}-help` : undefined}>
                <legend className="sr-only">{field.label || field.name}</legend>
                {(field.options || []).map((option) => {
                  const selected = Array.isArray(value) ? (value as string[]) : []
                  return (
                    <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selected.includes(option)}
                        onChange={(event) =>
                          setResponses({
                            ...responses,
                            [field.name]: event.target.checked
                              ? [...selected, option]
                              : selected.filter((item) => item !== option),
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      {option}
                    </label>
                  )
                })}
              </fieldset>
            ) : ['yesno', 'boolean', 'checkbox', 'declaration'].includes(type) ? (
              <input
                {...common}
                type="checkbox"
                checked={value === true}
                onChange={(event) => setResponses({ ...responses, [field.name]: event.target.checked })}
                className="mt-2 h-5 w-5 rounded border-slate-300"
              />
            ) : (
              <input
                {...common}
                type={type === 'number' || type === 'rating' ? 'number' : type === 'date' ? 'date' : 'text'}
                value={String(value ?? '')}
                onChange={(event) =>
                  setResponses({
                    ...responses,
                    [field.name]:
                      type === 'number' || type === 'rating'
                        ? event.target.value === ''
                          ? ''
                          : Number(event.target.value)
                        : event.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            )}
          </div>
        )
      })}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save('FORM_SAVE')}
          disabled={busy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Submit form'}
        </button>
      </div>
      {message && (
        <p role={isError ? 'alert' : 'status'} className={`text-xs ${isError ? 'text-red-700' : 'text-emerald-700'}`}>
          {message}
        </p>
      )}
    </form>
  )
}

export function TextAction({
  resourceId,
  action,
  label,
  placeholder,
  dataKey = 'comment',
}: {
  resourceId: string
  action: string
  label: string
  placeholder?: string
  dataKey?: string
}) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setMessage('')
    try {
      const data = dataKey === 'responses' ? { responses: { response: value } } : { [dataKey]: value }
      await postAction(action, resourceId, data)
      setMessage('Saved.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        aria-label={placeholder || label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 p-2 text-xs"
        rows={2}
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || !value.trim()}
        className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {busy ? 'Saving…' : label}
      </button>
      {message && (
        <p role="status" className="text-xs text-slate-600">
          {message}
        </p>
      )}
    </div>
  )
}

export function TaskAction({
  resourceId,
  evidenceRequired = false,
}: {
  resourceId: string
  evidenceRequired?: boolean
}) {
  const router = useRouter()
  const [comment, setComment] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setMessage('')
    try {
      let evidenceFileId: string | undefined
      if (file) {
        const form = new FormData()
        form.append('file', file)
        form.append('sensitivityClass', 'CONFIDENTIAL')
        const upload = await fetch('/api/assets/upload', { method: 'POST', body: form })
        const uploaded = await upload.json()
        if (!upload.ok) throw new Error(uploaded.error || 'Supporting evidence could not be uploaded')
        evidenceFileId = uploaded.fileAssetId
      }
      await postAction('TASK_SUBMIT', resourceId, { comment, evidenceFileId })
      setMessage('Task submitted.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Task could not be submitted')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        aria-label="Completion note"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Add a short completion note"
        className="w-full rounded-lg border border-slate-300 p-2 text-xs"
        rows={2}
      />
      <label className="block text-xs font-semibold text-slate-700">
        Supporting evidence{evidenceRequired ? ' *' : ''}
        <input
          type="file"
          required={evidenceRequired}
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          className="mt-1 block w-full text-xs"
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={busy || (evidenceRequired && !file)}
        className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {busy ? 'Submitting…' : 'Submit task'}
      </button>
      {message && (
        <p role="status" className="text-xs text-slate-600">
          {message}
        </p>
      )}
    </div>
  )
}

export function SimpleAction({
  resourceId,
  action,
  label,
  data = {},
}: {
  resourceId: string
  action: string
  label: string
  data?: Record<string, unknown>
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    setMessage('')
    try {
      await postAction(action, resourceId, data)
      setMessage('Saved.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {busy ? 'Saving…' : label}
      </button>
      {message && (
        <p role="status" className="mt-1 text-xs text-slate-600">
          {message}
        </p>
      )}
    </div>
  )
}

export function MeetingResponseAction({ resourceId }: { resourceId: string }) {
  const router = useRouter()
  const [response, setResponse] = useState('CONFIRMED')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const needsReason = response === 'DECLINED' || response === 'RESCHEDULE_REQUESTED'

  const submit = async () => {
    setBusy(true)
    setMessage('')
    try {
      await postAction('MEETING_RESPOND', resourceId, { response, reason: reason.trim() || undefined })
      setMessage('Your response was sent.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Your response could not be sent.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 max-w-xl space-y-3 border-t border-stone-200 pt-4">
      <label className="field-label">
        Your response
        <select value={response} onChange={(event) => setResponse(event.target.value)} className="field-control">
          <option value="CONFIRMED">I will attend</option>
          <option value="RESCHEDULE_REQUESTED">I need another time</option>
          <option value="DECLINED">I cannot attend</option>
        </select>
      </label>
      {needsReason && (
        <label className="field-label">
          Reason *
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="field-control"
            placeholder="Give the recruitment team enough information to respond."
          />
        </label>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={busy || (needsReason && reason.trim().length < 3)}
        className="btn-primary"
      >
        {busy ? 'Sending…' : 'Send response'}
      </button>
      {message && (
        <p role={/could not|required|error/i.test(message) ? 'alert' : 'status'} className="text-xs text-stone-700">
          {message}
        </p>
      )}
    </div>
  )
}

export function PolicyAction({ resourceId, method }: { resourceId: string; method: string }) {
  const router = useRouter()
  const [typedName, setTypedName] = useState('')
  const [drawnSignature, setDrawnSignature] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    setMessage('')
    try {
      let signedFileId: string | undefined
      if (method === 'UPLOAD_SIGNED') {
        if (!file) throw new Error('Choose the signed PDF first')
        const form = new FormData()
        form.set('file', file)
        form.set('sensitivityClass', 'CONFIDENTIAL')
        const response = await fetch('/api/assets/upload', { method: 'POST', body: form })
        const uploaded = await response.json()
        if (!response.ok) throw new Error(uploaded.error || 'Upload failed')
        signedFileId = uploaded.fileAssetId
      }
      const signatureData =
        method === 'TYPED_NAME' ? typedName : method === 'DRAWN_SIGNATURE' ? drawnSignature : undefined
      await postAction('POLICY_SIGN', resourceId, { signatureData, signedFileId })
      setMessage('Policy acknowledgement recorded.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Signature failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-3 space-y-2">
      {method === 'TYPED_NAME' && (
        <label className="block text-xs font-bold">
          Full legal name
          <input
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 p-2"
          />
        </label>
      )}
      {method === 'DRAWN_SIGNATURE' && <SignaturePad onChange={setDrawnSignature} />}
      {method === 'UPLOAD_SIGNED' && (
        <label className="block text-xs font-bold">
          Signed policy PDF
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="mt-1 block w-full text-xs"
          />
        </label>
      )}
      {method === 'ACKNOWLEDGE' && (
        <p className="text-xs text-slate-600">
          By continuing, you confirm that you have read and understood this policy.
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={
          busy ||
          (method === 'TYPED_NAME' && !typedName.trim()) ||
          (method === 'DRAWN_SIGNATURE' && !drawnSignature) ||
          (method === 'UPLOAD_SIGNED' && !file)
        }
        className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {busy ? 'Recording…' : method === 'ACKNOWLEDGE' ? 'I acknowledge' : 'Sign policy'}
      </button>
      {message && (
        <p role={/failed|error|required|choose/i.test(message) ? 'alert' : 'status'} className="text-xs text-slate-600">
          {message}
        </p>
      )}
    </div>
  )
}

function SignaturePad({ onChange }: { onChange: (value: string) => void }) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [drawing, setDrawing] = useState(false)
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    }
  }
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const p = point(event)
    if (!canvas || !p) return
    canvas.setPointerCapture(event.pointerId)
    const context = canvas.getContext('2d')
    context?.beginPath()
    context?.moveTo(p.x, p.y)
    setDrawing(true)
  }
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const p = point(event)
    if (!canvas || !p || !drawing) return
    const context = canvas.getContext('2d')
    if (context) {
      context.lineWidth = 2
      context.lineCap = 'round'
      context.strokeStyle = '#0f172a'
      context.lineTo(p.x, p.y)
      context.stroke()
    }
  }
  const end = () => {
    if (!canvas) return
    setDrawing(false)
    onChange(canvas.toDataURL('image/png'))
  }
  const clear = () => {
    const context = canvas?.getContext('2d')
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      onChange('')
    }
  }
  return (
    <div>
      <span className="block text-xs font-bold">Draw signature</span>
      <canvas
        ref={setCanvas}
        width={640}
        height={160}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="mt-1 h-32 w-full touch-none rounded-lg border border-slate-300 bg-white"
        aria-label="Signature drawing area"
      />
      <button type="button" onClick={clear} className="mt-1 text-xs font-bold text-slate-600">
        Clear signature
      </button>
    </div>
  )
}

export function DocumentAction({
  resourceId,
  sensitivityClass = 'STANDARD',
  expiryRequired = false,
  allowedFileTypes,
}: {
  resourceId: string
  sensitivityClass?: string
  expiryRequired?: boolean
  allowedFileTypes?: string
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [minDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10))
  const submit = async () => {
    if (!file || (expiryRequired && !expiryDate)) return
    setBusy(true)
    setMessage('')
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('sensitivityClass', sensitivityClass)
      const upload = await fetch('/api/assets/upload', { method: 'POST', body: form })
      const uploaded = await upload.json()
      if (!upload.ok) throw new Error(uploaded.error || 'Upload failed')
      await postAction('DOCUMENT_SUBMIT', resourceId, {
        fileAssetId: uploaded.fileAssetId,
        expiryDate: expiryDate || undefined,
      })
      setMessage('Document submitted for review.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }
  const accept = allowedFileTypes
    ?.split(',')
    .map((extension) => `.${extension.trim().replace(/^\./, '')}`)
    .join(',')
  return (
    <div className="mt-3 space-y-2">
      <label className="block text-xs font-bold text-slate-700">
        Choose document
        <input
          type="file"
          accept={accept}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-xs"
        />
      </label>
      {expiryRequired && (
        <label className="block text-xs font-bold text-slate-700">
          Document expiry date
          <input
            type="date"
            min={minDate}
            value={expiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
            required
            className="mt-1 block rounded-lg border border-slate-300 p-2"
          />
        </label>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={busy || !file || (expiryRequired && !expiryDate)}
        className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {busy ? 'Uploading…' : 'Upload & submit'}
      </button>
      {message && (
        <p
          role={/failed|error|required|invalid/i.test(message) ? 'alert' : 'status'}
          className="text-xs text-slate-700"
        >
          {message}
        </p>
      )}
    </div>
  )
}

export function CourseAction({
  resourceId,
  questions,
}: {
  resourceId: string
  questions: Array<{ id: string; question: string; questionType: string; optionsJson: string }>
}) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    setMessage('')
    try {
      await postAction('COURSE_SUBMIT', resourceId, { answers })
      setMessage('Quiz submitted.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submission failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-3 space-y-3">
      {questions.map((q) => {
        let options: string[] = []
        try {
          options = JSON.parse(q.optionsJson)
        } catch {}
        if (q.questionType === 'MULTISELECT')
          return (
            <fieldset key={q.id} className="text-xs">
              <legend className="font-semibold text-slate-700">{q.question}</legend>
              {options.map((option) => (
                <label key={option} className="mt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Array.isArray(answers[q.id]) && answers[q.id].includes(option)}
                    onChange={(event) => {
                      const current = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : []
                      setAnswers({
                        ...answers,
                        [q.id]: event.target.checked
                          ? [...current, option]
                          : current.filter((value) => value !== option),
                      })
                    }}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          )
        if (q.questionType === 'SHORTTEXT')
          return (
            <label key={q.id} className="block text-xs font-semibold text-slate-700">
              {q.question}
              <input
                value={String(answers[q.id] || '')}
                onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2"
              />
            </label>
          )
        return (
          <label key={q.id} className="block text-xs font-semibold text-slate-700">
            {q.question}
            <select
              value={String(answers[q.id] || '')}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2"
            >
              <option value="">Select an answer</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )
      })}
      <button
        type="button"
        onClick={submit}
        disabled={
          busy || questions.some((q) => !answers[q.id] || (Array.isArray(answers[q.id]) && answers[q.id].length === 0))
        }
        className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {busy ? 'Submitting…' : questions.length ? 'Submit quiz' : 'Complete course'}
      </button>
      {message && (
        <p role="status" className="text-xs text-slate-600">
          {message}
        </p>
      )}
    </div>
  )
}
