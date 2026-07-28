import { redirect } from 'next/navigation'
import { LockKeyhole } from 'lucide-react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import AccommodationManager from '@/components/admin/AccommodationManager'
import { PageIntro } from '@/components/ui/PageElements'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

export default async function AccommodationsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  if (!user.roles.some((role) => ['HR_MANAGER', 'SYSTEM_ADMIN'].includes(role))) redirect('/recruitment/dashboard')
  const records = await prisma.accommodationRequest.findMany({
    where: { status: { in: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED'] } },
    orderBy: { requestedAt: 'asc' },
    take: 250,
  })
  const applications = await prisma.application.findMany({
    where: { id: { in: records.map((record) => record.applicationId) } },
    select: {
      id: true,
      candidate: { select: { legalFirstName: true, lastName: true } },
      vacancy: { select: { referenceNumber: true, title: true } },
    },
  })
  const byId = new Map(applications.map((application) => [application.id, application]))
  const requests = records.map((record) => {
    const application = byId.get(record.applicationId)
    return {
      id: record.id,
      requestType: record.requestType,
      details: record.details,
      status: record.status,
      requestedAt: formatDate(record.requestedAt),
      candidateName: application
        ? `${application.candidate.legalFirstName} ${application.candidate.lastName}`
        : 'Candidate',
      vacancy: application ? `${application.vacancy.referenceNumber} · ${application.vacancy.title}` : 'Application',
    }
  })
  const waiting = requests.filter((request) => ['REQUESTED', 'UNDER_REVIEW'].includes(request.status)).length
  const agreed = requests.filter((request) => ['APPROVED', 'PARTIALLY_APPROVED'].includes(request.status)).length
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea]">
      <Header currentUser={user} />
      <main id="main-content" className="flex-1 py-8 sm:py-10">
        <div className="page-shell space-y-8">
          <PageIntro
            title="Candidate adjustments"
            description="Review what a candidate has asked for, record FRAD’s response, and confirm when the adjustment is ready."
            actions={
              <div className="flex items-center gap-3 border-l-2 border-[#bc6747] pl-4 text-sm text-stone-600">
                <LockKeyhole aria-hidden className="h-4 w-4 shrink-0 text-brand-700" />
                <span className="max-w-56">Visible only to HR managers and system administrators.</span>
              </div>
            }
          />

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-stone-300 py-4">
            <p className="text-sm text-stone-600">
              <span className="mr-2 font-display text-3xl text-navy-950">{waiting}</span>
              waiting for a decision
            </p>
            <span aria-hidden className="hidden h-7 w-px bg-stone-300 sm:block" />
            <p className="text-sm text-stone-600">
              <span className="mr-2 font-display text-3xl text-navy-950">{agreed}</span>
              agreed and awaiting confirmation
            </p>
          </div>

          <AccommodationManager requests={requests} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
