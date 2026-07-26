import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import PrintButton from '@/components/shared/PrintButton'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

export default async function ApplicationReceiptPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const application = await prisma.application.findFirst({
    where: { id: params.id, candidate: { userId: user.userId }, submittedAt: { not: null } },
    include: { vacancy: { include: { department: true, dutyStation: true } }, files: true, answers: true },
  })
  if (!application) notFound()

  return (
    <div className="flex min-h-screen flex-col bg-stone-100 print:bg-white">
      <div className="print:hidden"><Header currentUser={user} /></div>
      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <article className="section-panel p-6 sm:p-10 print:border-0 print:p-0 print:shadow-none">
            <div className="flex items-start gap-4 border-b border-stone-200 pb-6">
              <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-emerald-700" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Application received</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-950">Thank you for applying.</h1>
                <p className="mt-2 text-sm leading-6 text-stone-600">Keep this receipt for your records. We will contact you through your account and registered email address.</p>
              </div>
            </div>
            <dl className="grid gap-x-8 gap-y-5 py-7 text-sm sm:grid-cols-2">
              <div><dt className="text-xs font-semibold text-stone-500">Role</dt><dd className="mt-1 font-bold text-stone-900">{application.vacancy.title}</dd></div>
              <div><dt className="text-xs font-semibold text-stone-500">Vacancy reference</dt><dd className="mt-1 font-mono text-stone-900">{application.vacancy.referenceNumber}</dd></div>
              <div><dt className="text-xs font-semibold text-stone-500">Application reference</dt><dd className="mt-1 font-mono text-stone-900">{application.id}</dd></div>
              <div><dt className="text-xs font-semibold text-stone-500">Submitted</dt><dd className="mt-1 text-stone-900">{formatDate(application.submittedAt!)}</dd></div>
              <div><dt className="text-xs font-semibold text-stone-500">Team</dt><dd className="mt-1 text-stone-900">{application.vacancy.department.name}</dd></div>
              <div><dt className="text-xs font-semibold text-stone-500">Location</dt><dd className="mt-1 text-stone-900">{application.vacancy.dutyStation.name}</dd></div>
              <div><dt className="text-xs font-semibold text-stone-500">Answers recorded</dt><dd className="mt-1 text-stone-900">{application.answers.length}</dd></div>
              <div><dt className="text-xs font-semibold text-stone-500">Files attached</dt><dd className="mt-1 text-stone-900">{application.files.length}</dd></div>
            </dl>
            <div className="border-t border-stone-200 pt-5">
              <h2 className="text-sm font-bold text-stone-900">What happens next</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">The recruitment team will review applications after the vacancy closes. If you need to complete an assessment, attend an interview or provide more information, the request will appear in your account.</p>
            </div>
            <div className="mt-7 flex flex-wrap gap-2 print:hidden">
              <Link href={`/candidate/applications/${application.id}`} className="btn-primary">View application</Link>
              <PrintButton />
              <Link href="/candidate/dashboard" className="btn-secondary">Return to account</Link>
            </div>
          </article>
        </div>
      </main>
      <div className="print:hidden"><Footer /></div>
    </div>
  )
}
