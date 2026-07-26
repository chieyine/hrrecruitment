import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, authzResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
export async function POST(_request:Request, context: { params: Promise<{id:string}> }) {
  const params = await context.params;try{const user=await requirePermission('reference.manage');const response=await prisma.referenceResponse.findUnique({where:{id:params.id}});if(!response)return NextResponse.json({error:'Reference response not found'},{status:404});const updated=await prisma.referenceResponse.update({where:{id:response.id},data:{verifiedBy:user.userId,verifiedAt:new Date()}});await logAudit({actorUserId:user.userId,action:'REFERENCE_VERIFIED',resourceType:'ReferenceResponse',resourceId:updated.id});return NextResponse.json({success:true})}catch(err){return authzResponse(err)}}
