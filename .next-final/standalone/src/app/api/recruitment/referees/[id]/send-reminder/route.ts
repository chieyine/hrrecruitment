import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { enqueueEmail } from '@/lib/outbox'
import { logAudit } from '@/lib/audit'

export async function POST(_request:Request, context: { params: Promise<{id:string}> }) {
  const params = await context.params;try{const user=await requirePermission('reference.manage');const referee=await prisma.referee.findUnique({where:{id:params.id},include:{requests:{where:{status:{in:['PENDING','SENT']}},orderBy:{sentAt:'desc'},take:1}}});if(!referee||!referee.requests[0])return NextResponse.json({error:'No active reference request exists'},{status:404});await enqueueEmail({recipient:referee.email,subject:'Reminder: FRAD reference request',html:'<p>This is a reminder to complete the confidential FRAD reference request using the original secure link.</p>',deduplicationKey:`reference-reminder:${referee.requests[0].id}:${new Date().toISOString().slice(0,10)}`});await prisma.referenceRequest.update({where:{id:referee.requests[0].id},data:{reminderSentAt:new Date()}});await logAudit({actorUserId:user.userId,action:'REFERENCE_REMINDER_SENT',resourceType:'ReferenceRequest',resourceId:referee.requests[0].id});return NextResponse.json({success:true})}catch(err){return authzResponse(err)}}
