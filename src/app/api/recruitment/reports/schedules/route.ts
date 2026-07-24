import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse, AuthzError } from '@/lib/authz'
import { parseBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'

const REPORTS=['pipeline','candidate-stages','assessments','interviews','references','offers','preboarding','outstanding','courses','readiness','resumption','erp','waivers','work-items','communications','approvals','audit','complaints','privacy-deletions','configuration-changes','delivery','data-quality'] as const

export async function GET(){
  try{
    const user=await requirePermission('report.export')
    const schedules=await prisma.scheduledReport.findMany({where:{userId:user.userId},orderBy:{createdAt:'desc'}})
    return Response.json({schedules})
  }catch(error){return authzResponse(error)}
}

export async function POST(request:Request){
  try{
    const user=await requirePermission('report.export')
    const input=await parseBody(request,z.object({reportType:z.enum(REPORTS),format:z.enum(['csv','xlsx','pdf']),frequency:z.enum(['DAILY','WEEKLY','MONTHLY']),recipientEmail:z.string().email(),nextRunAt:z.coerce.date()}))
    const recipientDomain=input.recipientEmail.split('@')[1].toLowerCase()
    const configuredDomains=(process.env.REPORT_RECIPIENT_DOMAINS||user.email.split('@')[1]).split(',').map(value=>value.trim().toLowerCase()).filter(Boolean)
    if(!configuredDomains.includes(recipientDomain))throw new AuthzError('Scheduled reports may only be sent to an approved organisation email domain',400)
    if(input.reportType==='complaints'&&!await hasPermission(user.userId,'complaint.manage'))throw new AuthzError('Complaint export permission is required',403)
    if(input.reportType==='audit'&&!await hasPermission(user.userId,'audit.read'))throw new AuthzError('Audit export permission is required',403)
    if(input.reportType==='configuration-changes'&&!await hasPermission(user.userId,'governance.manage'))throw new AuthzError('Governance export permission is required',403)
    if(input.nextRunAt<=new Date())throw new AuthzError('First delivery must be in the future',400)
    const schedule=await prisma.scheduledReport.create({data:{...input,userId:user.userId}})
    await logAudit({actorUserId:user.userId,action:'REPORT_SCHEDULE_CREATED',resourceType:'ScheduledReport',resourceId:schedule.id,newValue:input})
    return Response.json({success:true,schedule})
  }catch(error){return authzResponse(error)}
}

export async function DELETE(request:Request){
  try{
    const user=await requirePermission('report.export')
    const input=await parseBody(request,z.object({id:z.string().uuid()}))
    const changed=await prisma.scheduledReport.updateMany({where:{id:input.id,userId:user.userId},data:{active:false}})
    if(!changed.count)throw new AuthzError('Schedule not found',404)
    await logAudit({actorUserId:user.userId,action:'REPORT_SCHEDULE_DISABLED',resourceType:'ScheduledReport',resourceId:input.id})
    return Response.json({success:true})
  }catch(error){return authzResponse(error)}
}
