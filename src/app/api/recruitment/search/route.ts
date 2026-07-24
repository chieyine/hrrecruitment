import { prisma } from '@/lib/prisma'
import { requireStaff, authzResponse, AuthzError } from '@/lib/authz'
import { hasPermission } from '@/lib/rbac'
import { assignedApplicationWhere } from '@/lib/recruitment-access'

export const dynamic = 'force-dynamic'

export async function GET(request:Request){
  try{
    const user=await requireStaff()
    const query=(new URL(request.url).searchParams.get('q')||'').trim()
    if(query.length<2)throw new AuthzError('Enter at least two characters',400)
    if(query.length>100)throw new AuthzError('Search is too long',400)
    const readAllApplications=await hasPermission(user.userId,'application.read.all')
    const readAssignedApplications=await hasPermission(user.userId,'application.read.assigned')
    const readAllVacancies=await hasPermission(user.userId,'vacancy.read.all')
    const readAssignedVacancies=await hasPermission(user.userId,'vacancy.read.assigned')
    const applicationScope=readAllApplications?{}:readAssignedApplications?assignedApplicationWhere(user.userId):null
    const vacancyScope=readAllVacancies?{}:readAssignedVacancies?{ownerUserId:user.userId}:null
    const [applications,vacancies]=await Promise.all([
      applicationScope?prisma.application.findMany({where:{AND:[applicationScope,{OR:[
        {candidate:{legalFirstName:{contains:query}}},
        {candidate:{lastName:{contains:query}}},
        {candidate:{primaryPhone:{contains:query}}},
        {candidate:{alternatePhone:{contains:query}}},
        {candidate:{user:{email:{contains:query}}}},
        {vacancy:{referenceNumber:{contains:query}}},
        {vacancy:{title:{contains:query}}},
        {vacancy:{project:{name:{contains:query}}}},
        {vacancy:{department:{name:{contains:query}}}},
        {vacancy:{dutyStation:{name:{contains:query}}}},
        {erpTransferRecord:{erpPersonnelNumber:{contains:query}}},
      ]}]},include:{candidate:{include:{user:{select:{email:true}}}},vacancy:{include:{project:true,department:true,dutyStation:true}},erpTransferRecord:true},take:50,orderBy:{updatedAt:'desc'}}):[],
      vacancyScope?prisma.vacancy.findMany({where:{AND:[vacancyScope,{OR:[{referenceNumber:{contains:query}},{title:{contains:query}},{project:{name:{contains:query}}},{department:{name:{contains:query}}},{dutyStation:{name:{contains:query}}}]}]},include:{project:true,department:true,dutyStation:true},take:50,orderBy:{createdAt:'desc'}}):[],
    ])
    const maySeeContact = readAllApplications && !user.roles.includes('AUDITOR')
    return Response.json({query,applications:applications.map(record=>({id:record.id,name:`${record.candidate.legalFirstName} ${record.candidate.lastName}`,email:maySeeContact?record.candidate.user.email:null,phone:maySeeContact?record.candidate.primaryPhone:null,status:record.internalStatus,vacancy:record.vacancy.title,reference:record.vacancy.referenceNumber,project:record.vacancy.project?.name,department:record.vacancy.department.name,dutyStation:record.vacancy.dutyStation.name,erpPersonnelNumber:record.erpTransferRecord?.erpPersonnelNumber||null})),vacancies:vacancies.map(record=>({id:record.id,title:record.title,reference:record.referenceNumber,status:record.status,project:record.project?.name,department:record.department.name,dutyStation:record.dutyStation.name}))})
  }catch(error){return authzResponse(error)}
}
