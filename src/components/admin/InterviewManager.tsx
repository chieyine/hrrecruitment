'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Panel = {
  interviewId: string
  panelMemberId: string
  applicationId: string
  candidate: string
  vacancy: string
  title: string
  conflictStatus: string
  questions: Array<{ id: string; question: string; maximumScore: number }>
}

export default function InterviewManager({
  applications,
  panelUsers,
  myPanels,
  canSchedule = true,
}: {
  applications: Array<{ id: string; name: string }>
  panelUsers: Array<{ id: string; email: string }>
  myPanels: Panel[]
  canSchedule?: boolean
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [applicationId, setApplicationId] = useState('')
  const [panelUserIds, setPanelUserIds] = useState<string[]>([])
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [title, setTitle] = useState('Panel interview')
  const [timezone, setTimezone] = useState('Africa/Lagos')
  const [format, setFormat] = useState('VIRTUAL')
  const [venue, setVenue] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [instructions, setInstructions] = useState('')
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(1440)
  const [questions, setQuestions] = useState([{ question: '', competency: '', maximumScore: 10 }])
  const [attachments, setAttachments] = useState<File[]>([])
  const [scores, setScores] = useState<Record<string, string>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [recommendations, setRecommendations] = useState<Record<string, string>>({})
  const [conflicts, setConflicts] = useState<Record<string, string>>({})
  const [conflictComments, setConflictComments] = useState<Record<string, string>>({})

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    const attachmentFileIds: string[] = []
    for (const file of attachments) {
      const form = new FormData()
      form.append('file', file)
      form.append('sensitivityClass', 'INTERNAL')
      const upload = await fetch('/api/assets/upload', { method: 'POST', body: form })
      const uploaded = await upload.json()
      if (!upload.ok) return setMessage(uploaded.error || 'An interview attachment could not be uploaded.')
      attachmentFileIds.push(uploaded.fileAssetId)
    }
    const scheduledEnd = end
      ? new Date(end).toISOString()
      : new Date(new Date(start).getTime() + 60 * 60_000).toISOString()
    const response = await fetch('/api/recruitment/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId,
        title,
        scheduledStart: new Date(start).toISOString(),
        scheduledEnd,
        timezone,
        format,
        venue,
        meetingLink,
        instructions,
        reminderMinutesBefore,
        attachmentFileIds,
        panelUserIds,
        questions: questions.filter((item) => item.question.trim()),
      }),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Interview scheduled.' : data.error || 'Failed')
    if (response.ok) router.refresh()
  }

  const submit = async (panel: Panel) => {
    if (!conflicts[panel.panelMemberId])
      return setMessage('Complete the conflict-of-interest declaration before submitting.')
    if (panel.questions.some((item) => !comments[item.id]?.trim()))
      return setMessage('Explain the evidence behind every score before submitting.')
    if (!recommendations[panel.panelMemberId]) return setMessage('Choose an overall recommendation before submitting.')
    const questionScores = panel.questions.map((item) => ({
      interviewQuestionId: item.id,
      score: Number(scores[item.id] || 0),
      comment: comments[item.id] || '',
    }))
    const response = await fetch(`/api/recruitment/interviews/${panel.interviewId}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        panelMemberId: panel.panelMemberId,
        recommendation: recommendations[panel.panelMemberId],
        conflictType: conflicts[panel.panelMemberId],
        conflictComment: conflictComments[panel.panelMemberId] || undefined,
        questionScores,
      }),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Independent panel score submitted.' : data.error || 'Failed')
    if (response.ok) router.refresh()
  }

  return (
    <div className="space-y-4">
      {canSchedule && (
        <form onSubmit={create} className="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-2">
          <h2 className="font-bold md:col-span-2">Schedule interview</h2>
          <select
            required
            value={applicationId}
            onChange={(event) => setApplicationId(event.target.value)}
            className="rounded border p-2 text-sm"
          >
            <option value="">Candidate</option>
            {applications.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Interview title"
            className="rounded border p-2 text-sm"
          />
          <label className="text-xs font-bold">
            Starts
            <input
              required
              type="datetime-local"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="mt-1 w-full rounded border p-2 text-sm"
            />
          </label>
          <label className="text-xs font-bold">
            Ends
            <input
              type="datetime-local"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="mt-1 w-full rounded border p-2 text-sm"
            />
          </label>
          <label className="text-xs font-bold">
            Timezone
            <input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="mt-1 w-full rounded border p-2 text-sm"
            />
          </label>
          <label className="text-xs font-bold">
            Format
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="mt-1 w-full rounded border p-2 text-sm"
            >
              <option value="VIRTUAL">Virtual</option>
              <option value="PHYSICAL">Physical</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </label>
          {format !== 'VIRTUAL' && (
            <input
              required
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              placeholder="Venue"
              className="rounded border p-2 text-sm"
            />
          )}
          {format !== 'PHYSICAL' && (
            <input
              required
              type="url"
              value={meetingLink}
              onChange={(event) => setMeetingLink(event.target.value)}
              placeholder="Meeting link"
              className="rounded border p-2 text-sm"
            />
          )}
          <fieldset className="md:col-span-2">
            <legend className="text-xs font-bold">Panel members</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {panelUsers.map((item) => (
                <label key={item.id} className="flex items-center gap-2 rounded border p-2 text-xs">
                  <input
                    type="checkbox"
                    checked={panelUserIds.includes(item.id)}
                    onChange={(event) =>
                      setPanelUserIds(
                        event.target.checked ? [...panelUserIds, item.id] : panelUserIds.filter((id) => id !== item.id)
                      )
                    }
                  />
                  {item.email}
                </label>
              ))}
            </div>
          </fieldset>
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Instructions for the candidate and panel"
            className="rounded border p-2 text-sm md:col-span-2"
          />
          <label className="text-xs font-bold">
            Reminder
            <select
              value={reminderMinutesBefore}
              onChange={(event) => setReminderMinutesBefore(Number(event.target.value))}
              className="mt-1 w-full rounded border p-2 text-sm"
            >
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
              <option value={2880}>2 days before</option>
              <option value={10080}>1 week before</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            Attachments
            <input
              type="file"
              multiple
              onChange={(event) => setAttachments(Array.from(event.target.files || []))}
              className="mt-1 block w-full"
            />
          </label>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold">Questions</h3>
              <button
                type="button"
                onClick={() => setQuestions([...questions, { question: '', competency: '', maximumScore: 10 }])}
                className="text-xs font-bold text-brand-700"
              >
                Add question
              </button>
            </div>
            {questions.map((item, index) => (
              <div
                key={index}
                className="grid gap-2 rounded border bg-slate-50 p-2 md:grid-cols-[1fr_180px_100px_auto]"
              >
                <input
                  required
                  value={item.question}
                  onChange={(event) =>
                    setQuestions(
                      questions.map((question, i) =>
                        i === index ? { ...question, question: event.target.value } : question
                      )
                    )
                  }
                  placeholder="Interview question"
                  className="rounded border p-2 text-sm"
                />
                <input
                  value={item.competency}
                  onChange={(event) =>
                    setQuestions(
                      questions.map((question, i) =>
                        i === index ? { ...question, competency: event.target.value } : question
                      )
                    )
                  }
                  placeholder="Competency"
                  className="rounded border p-2 text-sm"
                />
                <input
                  aria-label="Maximum score"
                  type="number"
                  min={1}
                  value={item.maximumScore}
                  onChange={(event) =>
                    setQuestions(
                      questions.map((question, i) =>
                        i === index ? { ...question, maximumScore: Number(event.target.value) } : question
                      )
                    )
                  }
                  className="rounded border p-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setQuestions(questions.filter((_, i) => i !== index))}
                  className="text-xs font-bold text-rose-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            disabled={!panelUserIds.length || !questions.some((item) => item.question.trim())}
            className="w-fit rounded bg-brand-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Schedule and invite
          </button>
        </form>
      )}
      {myPanels.map((panel) => (
        <div key={panel.panelMemberId} className="rounded-2xl border bg-white p-5 space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Assigned scorecard</p>
            <h3 className="mt-1 font-bold">
              {panel.candidate} — {panel.vacancy}
            </h3>
            <p className="text-xs text-slate-500">{panel.title}</p>
            <a
              href={`/recruitment/applications/${panel.applicationId}`}
              className="mt-2 inline-block text-xs font-semibold text-brand-700 underline"
            >
              Review the permitted candidate evidence
            </a>
          </div>
          <div className="border border-amber-200 bg-amber-50 p-3">
            <label className="field-label">Conflict-of-interest declaration</label>
            <select
              value={conflicts[panel.panelMemberId] || ''}
              onChange={(event) => setConflicts({ ...conflicts, [panel.panelMemberId]: event.target.value })}
              className="field-control"
            >
              <option value="">Choose declaration</option>
              <option value="NONE">I have no conflict</option>
              <option value="FAMILY">Family relationship</option>
              <option value="PERSONAL">Personal relationship</option>
              <option value="SUPERVISORY">Supervisory relationship</option>
              <option value="COLLEAGUE">Current or former colleague</option>
              <option value="FINANCIAL">Financial interest</option>
              <option value="OTHER">Other conflict</option>
            </select>
            {conflicts[panel.panelMemberId] && conflicts[panel.panelMemberId] !== 'NONE' && (
              <textarea
                required
                value={conflictComments[panel.panelMemberId] || ''}
                onChange={(event) =>
                  setConflictComments({ ...conflictComments, [panel.panelMemberId]: event.target.value })
                }
                placeholder="Describe the conflict. Submission will be blocked for HR review."
                className="field-control mt-2"
              />
            )}
          </div>
          <p className="text-xs leading-5 text-slate-600">
            Score only the evidence observed against each question. Use the full scale, and explain what evidence
            supports the score. Your submission remains independent from other panel members.
          </p>
          {panel.questions.map((item) => (
            <div key={item.id} className="space-y-1">
              <label className="block text-xs font-semibold">
                {item.question} (0–{item.maximumScore})
                <input
                  required
                  type="number"
                  min="0"
                  max={item.maximumScore}
                  value={scores[item.id] || ''}
                  onChange={(event) => setScores({ ...scores, [item.id]: event.target.value })}
                  className="mt-1 block w-full rounded border p-2"
                />
              </label>
              <textarea
                aria-label={`Evidence comment for ${item.question}`}
                required
                value={comments[item.id] || ''}
                onChange={(event) => setComments({ ...comments, [item.id]: event.target.value })}
                placeholder="What evidence supports this score?"
                className="block w-full rounded border p-2 text-xs"
              />
            </div>
          ))}
          <label className="block">
            <span className="field-label">Overall recommendation</span>
            <select
              value={recommendations[panel.panelMemberId] || ''}
              onChange={(event) =>
                setRecommendations({ ...recommendations, [panel.panelMemberId]: event.target.value })
              }
              className="field-control"
            >
              <option value="">Choose recommendation</option>
              <option value="RECOMMENDED">Recommended</option>
              <option value="RESERVE">Reserve</option>
              <option value="NOT_RECOMMENDED">Not recommended</option>
            </select>
          </label>
          <button
            onClick={() => submit(panel)}
            className="rounded bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
          >
            Submit independent score
          </button>
        </div>
      ))}
      {message && (
        <p role="status" className="text-xs text-slate-600">
          {message}
        </p>
      )}
    </div>
  )
}

export function PanelConfirmation({ interviewId, varianceFlag }: { interviewId: string; varianceFlag: boolean }) {
  const router = useRouter()
  const [comment, setComment] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const confirm = async () => {
    setBusy(true)
    const response = await fetch(`/api/recruitment/interviews/${interviewId}/confirm-panel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: comment.trim() || undefined }),
    })
    const body = await response.json()
    setBusy(false)
    setMessage(
      response.ok
        ? `Panel outcome confirmed. Average score: ${Number(body.average).toFixed(1)}%.`
        : body.error || 'The outcome could not be confirmed.'
    )
    if (response.ok) router.refresh()
  }
  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-bold text-amber-950">
        {varianceFlag ? 'Scores differ by 25 points or more' : 'All independent scorecards are complete'}
      </p>
      <p className="mt-1 text-xs leading-5 text-amber-900">
        {varianceFlag
          ? 'Review each score and its evidence together. Record how the panel resolved the difference before you confirm.'
          : 'The chair should review the completed scorecards before the result moves forward.'}
      </p>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={varianceFlag ? 'How was the score variance resolved?' : 'Chair note (optional)'}
        className="mt-2 w-full rounded border border-amber-300 bg-white p-2 text-xs"
      />
      <button
        type="button"
        disabled={busy || (varianceFlag && comment.trim().length < 5)}
        onClick={confirm}
        className="mt-2 rounded bg-amber-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {busy ? 'Confirming…' : 'Confirm panel outcome'}
      </button>
      {message && (
        <p role="status" className="mt-2 text-xs text-slate-700">
          {message}
        </p>
      )}
    </div>
  )
}
