import Link from 'next/link'
import { ClipboardList, ArrowRight } from 'lucide-react'

export default function AdminAssessmentBankPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assessment Bank</h1>
        <p className="text-slate-600 text-sm mt-1">
          Assessments are attached to a specific vacancy along with their questions and pass marks.
          Create and manage them from the vacancy they belong to.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ClipboardList className="h-6 w-6 text-blue-600" />
        <h2 className="mt-3 font-semibold text-slate-900">Manage assessments per vacancy</h2>
        <p className="text-sm text-slate-600 mt-1">
          Open a vacancy to configure its online MCQ, essay, scenario or offline assessments and
          the auto-scored question key.
        </p>
        <Link
          href="/recruitment/vacancies"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go to Vacancies <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
