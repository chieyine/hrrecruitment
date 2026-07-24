'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'

export default async function VacancyApplicationsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [vacancy, setVacancy] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/recruitment/vacancies/${params.id}`),
      fetch(`/api/recruitment/applications?vacancyId=${encodeURIComponent(params.id)}`),
    ])
      .then(async ([vacancyResponse, applicationResponse]) => {
        const [vacancyBody, applicationBody] = await Promise.all([vacancyResponse.json(), applicationResponse.json()])
        if (!vacancyResponse.ok) throw new Error(vacancyBody.error || 'Unable to load vacancy')
        if (!applicationResponse.ok) throw new Error(applicationBody.error || 'Unable to load applications')
        setVacancy(vacancyBody.vacancy)
        setApplications(applicationBody.applications || [])
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load applications'))
  }, [params.id])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Header />
      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href={`/recruitment/vacancies/${params.id}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Applicants for {vacancy?.title || 'Vacancy'}</h1>
              <p className="text-slate-600 text-sm">Review, score, and manage applicant stages.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {error && <p role="alert" className="border-b border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Total Applicants ({applications.length})</span>
          </div>

          {applications.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              No applications submitted for this vacancy yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-4">Candidate</th>
                  <th className="p-4">Applied Date</th>
                  <th className="p-4">Current Stage</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80">
                    <td className="p-4 font-medium text-slate-900">
                      {app.candidate?.legalFirstName} {app.candidate?.lastName}
                    </td>
                    <td className="p-4 text-slate-600">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full">
                        {app.internalStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/recruitment/applications/${app.id}`}
                        className="text-emerald-600 font-medium hover:text-emerald-700 text-sm"
                      >
                        Open Workspace →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
