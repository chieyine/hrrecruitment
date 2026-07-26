import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import AccommodationRequestForm from '@/components/shared/AccommodationRequestForm'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function CandidateAccommodationsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/auth/login')
  const applications = await prisma.application.findMany({
    where: { candidate: { userId: user.userId }, internalStatus: { notIn: ['DRAFT', 'WITHDRAWN', 'CANCELLED', 'NOT_SELECTED', 'TRANSFERRED_TO_ERP'] } },
    select: { id: true, vacancy: { select: { title: true, referenceNumber: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  const requests = await prisma.accommodationRequest.findMany({
    where: { applicationId: { in: applications.map((application) => application.id) } },
    orderBy: { requestedAt: 'desc' },
  })
  return <div className="flex min-h-screen flex-col bg-slate-50"><Header currentUser={user}/><main id="main-content" className="flex-1 py-8"><div className="mx-auto max-w-4xl space-y-6 px-4"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Fair participation</p><h1 className="mt-1 text-3xl font-extrabold text-slate-900">Adjustments and accommodations</h1><p className="mt-2 text-sm text-slate-600">Requests are restricted to authorized HR staff and are not shown to assessors or panel members.</p></div><AccommodationRequestForm applications={applications}/><div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Your requests</h2><div className="mt-3 divide-y">{requests.map((request)=><div key={request.id} className="py-3 text-sm"><div className="flex justify-between gap-3"><span className="font-semibold">{request.requestType.replaceAll('_',' ')}</span><span className="text-xs font-bold text-blue-700">{request.status.replaceAll('_',' ')}</span></div>{request.decision&&<p className="mt-1 text-xs text-slate-600">{request.decision}</p>}</div>)}{requests.length===0&&<p className="py-6 text-center text-sm text-slate-500">No requests submitted.</p>}</div></div></div></main><Footer/></div>
}
