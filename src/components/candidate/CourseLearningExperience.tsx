'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Check, CheckCircle2, Clock3, ExternalLink, LockKeyhole } from 'lucide-react'
import ControlledDocumentViewer from '@/components/shared/ControlledDocumentViewer'
import { CourseAction } from '@/components/shared/PreboardingActions'
import { formatDate, getStatusBadgeClass } from '@/lib/utils'

type CourseContent = {
  id: string
  contentType: string
  title: string
  content?: string | null
  fileAssetId?: string | null
}

function trustedEmbedUrl(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (['youtube.com', 'www.youtube.com'].includes(url.hostname)) {
      const id = url.searchParams.get('v')
      return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1)
      return /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (['vimeo.com', 'www.vimeo.com'].includes(url.hostname)) {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {}
  return null
}

function safeExternalUrl(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export default function CourseLearningExperience({
  assignment,
  course,
}: {
  assignment: any
  course: {
    title?: string
    description?: string
    learningObjectives?: string
    estimatedDurationMinutes?: number
    passMark?: number
    allowedAttempts?: number
    certificateEnabled?: boolean
    contents?: CourseContent[]
    quizQuestions?: Array<{ id: string; question: string; questionType: string; optionsJson: string }>
  }
}) {
  const contents = course.contents || []
  const initialCompleted = useMemo(
    () => new Set<string>((assignment.contentProgress || []).map((item: any) => item.courseContentId)),
    [assignment.contentProgress]
  )
  const [completed, setCompleted] = useState(initialCompleted)
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const allModulesComplete = contents.every((content) => completed.has(content.id))
  const progress = contents.length ? Math.round((completed.size / contents.length) * 100) : 100
  const remainingAttempts = Math.max(0, (course.allowedAttempts ?? 3) - (assignment.attempts || 0))
  const hasAssessment = Boolean(course.quizQuestions?.length)
  const configurationEmpty = contents.length === 0 && !hasAssessment

  async function completeModule(content: CourseContent) {
    setBusyId(content.id)
    setMessage('')
    try {
      const response = await fetch('/api/candidate/preboarding/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COURSE_CONTENT_COMPLETE',
          resourceId: assignment.id,
          data: {
            contentId: content.id,
            completionMethod: 'CONFIRMED',
          },
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not record module completion.')
      setCompleted((current) => new Set([...current, content.id]))
      setMessage(`Completed: ${content.title}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not record module completion.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <article
      id={`course-${assignment.id}`}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-stone-200 bg-white"
    >
      <div className="border-b border-stone-200 px-5 py-5 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <span className={`status-chip ${getStatusBadgeClass(assignment.status)}`}>
              {assignment.status.replaceAll('_', ' ').toLowerCase()}
            </span>
            <h2 className="mt-3 text-xl font-semibold tracking-[-.02em] text-navy-900">{course.title || 'Course'}</h2>
            {course.description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{course.description}</p>
            )}
          </div>
          <div className="flex shrink-0 gap-4 text-xs font-semibold text-stone-500">
            <span>
              <Clock3 className="mr-1 inline h-4 w-4" />
              {course.estimatedDurationMinutes || 30} min
            </span>
            {assignment.dueAt && <span>Due {formatDate(assignment.dueAt)}</span>}
          </div>
        </div>
        {course.learningObjectives && (
          <div className="mt-5 rounded-xl bg-brand-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">What you will learn</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-brand-950">{course.learningObjectives}</p>
          </div>
        )}
        <div className="mt-5">
          <div className="flex justify-between text-xs font-semibold text-stone-600">
            <span>
              {completed.size} of {contents.length} modules complete
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-brand-700 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="divide-y divide-stone-200">
        {contents.map((content, index) => {
          const done = completed.has(content.id)
          const embedUrl = content.contentType === 'VIDEO' ? trustedEmbedUrl(content.content) : null
          const externalUrl = safeExternalUrl(content.content)
          return (
            <section key={content.id} aria-labelledby={`module-${content.id}`} className="px-5 py-6 sm:px-6">
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    done ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {content.contentType.toLowerCase()}
                  </p>
                  <h3 id={`module-${content.id}`} className="mt-1 text-base font-semibold text-navy-900">
                    {content.title}
                  </h3>

                  {embedUrl && (
                    <div className="mt-4 aspect-video overflow-hidden rounded-xl border border-stone-200 bg-black">
                      <iframe
                        title={content.title}
                        src={embedUrl}
                        allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                  )}
                  {!embedUrl && content.content && !externalUrl && (
                    <div className="prose prose-sm mt-4 max-w-none whitespace-pre-line leading-7 text-stone-700">
                      {content.content}
                    </div>
                  )}
                  {!embedUrl && externalUrl && (
                    <a href={externalUrl} target="_blank" rel="noreferrer" className="btn-secondary mt-4">
                      <ExternalLink className="h-4 w-4" /> Open learning resource
                    </a>
                  )}
                  {content.fileAssetId && (
                    <div className="mt-4">
                      <ControlledDocumentViewer
                        fileId={content.fileAssetId}
                        title={content.title}
                        reference={`Course module ${index + 1}`}
                      />
                    </div>
                  )}

                  {!done && !['COMPLETED', 'WAIVED'].includes(assignment.status) && (
                    <button
                      type="button"
                      onClick={() => void completeModule(content)}
                      disabled={busyId === content.id}
                      className="btn-secondary mt-5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {busyId === content.id ? 'Recording…' : 'Confirm module complete'}
                    </button>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {configurationEmpty && (
        <p role="alert" className="border-t border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 sm:px-6">
          This course has no learning material or assessment. Ask the recruitment team to correct it.
        </p>
      )}

      {!configurationEmpty && !['COMPLETED', 'WAIVED'].includes(assignment.status) && (
        <section className="border-t border-stone-200 bg-stone-50 px-5 py-6 sm:px-6">
          <div className="flex items-start gap-3">
            {allModulesComplete ? (
              <BookOpen className="mt-0.5 h-5 w-5 text-brand-700" />
            ) : (
              <LockKeyhole className="mt-0.5 h-5 w-5 text-stone-500" />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-navy-900">Final assessment</h3>
              <p className="mt-1 text-sm text-stone-600">
                {allModulesComplete
                  ? hasAssessment
                    ? `Pass mark ${course.passMark ?? 80}%. ${remainingAttempts} ${
                        remainingAttempts === 1 ? 'attempt' : 'attempts'
                      } remaining.`
                    : 'Confirm completion to finish this course.'
                  : 'Complete every module to unlock the assessment.'}
              </p>
              {allModulesComplete && remainingAttempts > 0 && (
                <CourseAction resourceId={assignment.id} questions={course.quizQuestions || []} />
              )}
              {allModulesComplete && remainingAttempts === 0 && (
                <p className="mt-3 text-sm font-semibold text-rose-800">
                  No attempts remain. Message the recruitment team if you need help.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {assignment.status === 'COMPLETED' && course.certificateEnabled && (
        <div className="border-t border-emerald-200 bg-emerald-50 px-5 py-4 sm:px-6">
          <a
            href={`/api/candidate/preboarding/courses/${assignment.id}/certificate`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900 underline underline-offset-4"
          >
            <CheckCircle2 className="h-4 w-4" /> Download completion certificate
          </a>
        </div>
      )}

      {message && (
        <p role="status" className="border-t border-stone-200 px-5 py-3 text-xs font-semibold text-stone-700 sm:px-6">
          {message}
        </p>
      )}
    </article>
  )
}
