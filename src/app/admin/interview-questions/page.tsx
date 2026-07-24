import Link from 'next/link'
import { MessageSquare, ArrowRight } from 'lucide-react'

export default function AdminInterviewQuestionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Interview Question Bank</h1>
        <p className="text-slate-600 text-sm mt-1">
          Interview questions belong to a scheduled interview and its competency framework.
          Manage them from the interview record.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <MessageSquare className="h-6 w-6 text-blue-600" />
        <h2 className="mt-3 font-semibold text-slate-900">Manage questions per interview</h2>
        <p className="text-sm text-slate-600 mt-1">
          Open the interviews workspace to add competency-based questions, guidance and scoring.
        </p>
        <Link
          href="/recruitment/interviews"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go to Interviews <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
