import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import CourseLearningExperience from '@/components/candidate/CourseLearningExperience'
import { EmptyState, PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { getMyPreboarding } from '@/lib/candidate-preboarding'

export const dynamic = 'force-dynamic'

function assignedCourse(assignment: any) {
  let source = assignment.course
  try {
    source = assignment.courseSnapshotJson ? JSON.parse(assignment.courseSnapshotJson) : assignment.course
  } catch {}
  // Never serialize scoring weights or correct answers into the candidate's
  // React payload. Grading uses the server-side assignment snapshot.
  return {
    title: source?.title,
    description: source?.description,
    learningObjectives: source?.learningObjectives,
    estimatedDurationMinutes: source?.estimatedDurationMinutes,
    passMark: source?.passMark,
    allowedAttempts: source?.allowedAttempts,
    certificateEnabled: source?.certificateEnabled,
    contents: Array.isArray(source?.contents)
      ? source.contents.map((content: any) => ({
          id: content.id,
          contentType: content.contentType,
          title: content.title,
          content: content.content,
          fileAssetId: content.fileAssetId,
        }))
      : [],
    quizQuestions: Array.isArray(source?.quizQuestions)
      ? source.quizQuestions.map((question: any) => ({
          id: question.id,
          question: question.question,
          questionType: question.questionType,
          optionsJson: question.optionsJson,
        }))
      : [],
  }
}

export default async function CandidatePreboardingCoursesPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const preboarding = await getMyPreboarding(user.userId)
  const courses = preboarding?.courses ?? []

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-7 sm:py-9">
        <div className="page-shell max-w-5xl space-y-6">
          <Link
            href="/candidate/preboarding"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" /> Before you start
          </Link>
          <PageIntro
            eyebrow="Before you start"
            title="Learning"
            description="Complete each module and pass the final assessment. Your progress and attempts are recorded."
          />

          {courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No learning assigned"
              description="Any course you need before your first day will appear here."
            />
          ) : (
            <div className="space-y-6">
              {courses.map((course) => (
                <CourseLearningExperience key={course.id} assignment={course} course={assignedCourse(course)} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
