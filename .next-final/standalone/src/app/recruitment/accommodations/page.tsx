import { redirect } from 'next/navigation'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import AccommodationManager from '@/components/admin/AccommodationManager'
import { getVerifiedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function AccommodationsPage(){
  const user=await getVerifiedUser();if(!user)redirect('/auth/login');if(!user.roles.some((role)=>['HR_MANAGER','SYSTEM_ADMIN'].includes(role)))redirect('/recruitment/dashboard')
  const records=await prisma.accommodationRequest.findMany({where:{status:{in:['REQUESTED','UNDER_REVIEW','APPROVED','PARTIALLY_APPROVED']}},orderBy:{requestedAt:'asc'},take:250})
  const applications=await prisma.application.findMany({where:{id:{in:records.map((record)=>record.applicationId)}},select:{id:true,candidate:{select:{legalFirstName:true,lastName:true}},vacancy:{select:{referenceNumber:true,title:true}}}})
  const byId=new Map(applications.map((application)=>[application.id,application]))
  const requests=records.map((record)=>{const application=byId.get(record.applicationId);return{id:record.id,requestType:record.requestType,details:record.details,status:record.status,candidateName:application?`${application.candidate.legalFirstName} ${application.candidate.lastName}`:'Candidate',vacancy:application?`${application.vacancy.referenceNumber} · ${application.vacancy.title}`:'Application'}})
  return <div className="flex min-h-screen flex-col bg-slate-50"><Header currentUser={user}/><main id="main-content" className="flex-1 py-8"><div className="mx-auto max-w-6xl space-y-6 px-4"><div className="rounded-3xl bg-slate-900 p-7 text-white"><p className="text-xs font-bold uppercase tracking-wider text-purple-300">Restricted HR workflow</p><h1 className="mt-2 text-3xl font-extrabold">Accommodations</h1><p className="mt-2 text-sm text-slate-300">Agree and track practical adjustments without exposing confidential requests to selectors or interview panels.</p></div><AccommodationManager requests={requests}/></div></main><Footer/></div>
}
