import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'
import { getStatusBadgeClass } from '@/lib/utils'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { CourseAction } from '@/components/shared/PreboardingActions'

export const dynamic = 'force-dynamic'

function assignedCourse(course: any) {
  try { return course.courseSnapshotJson ? JSON.parse(course.courseSnapshotJson) : course.course }
  catch { return course.course }
}

export default async function CandidatePreboardingCoursesPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const pb = await getMyPreboarding(user.userId)
  const courses = pb?.courses ?? []

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <Link href="/candidate/preboarding" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Back to Preboarding
          </Link>
          <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <h1 className="text-2xl font-extrabold text-slate-900">Compulsory Courses</h1>
            </div>
            {courses.length === 0 ? (
              <p className="text-sm text-slate-500">No courses have been assigned yet.</p>
            ) : (
              courses.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  {(() => { const configured=assignedCourse(c); return <>
                  <div className="flex items-start justify-between gap-4"><div>
                    <span className="font-bold text-slate-900 block">{configured?.title || 'Course'}</span>
                    {c.score != null && <span className="text-slate-500">Score: {c.score}%</span>}
                    {c.status==='COMPLETED'&&configured?.certificateEnabled&&<a href={`/api/candidate/preboarding/courses/${c.id}/certificate`} className="ml-3 font-bold text-blue-700 hover:underline">Download certificate</a>}
                  </div><span className={`px-3 py-1 rounded-full font-bold border ${getStatusBadgeClass(c.status)}`}>{c.status}</span></div>
                  {configured?.contents?.map((content:any) => <div key={content.id} className="mt-3 rounded-lg border border-slate-200 bg-white p-3"><strong>{content.title}</strong>{content.content && <p className="mt-1 whitespace-pre-line text-slate-600">{content.content}</p>}</div>)}
                  {!['COMPLETED', 'WAIVED'].includes(c.status) && <CourseAction resourceId={c.id} questions={configured?.quizQuestions || []} />}
                  </>})()}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
