import { prisma } from '@/lib/prisma'
import { requireUser, authzResponse, AuthzError } from '@/lib/authz'
import { logAudit } from '@/lib/audit'

function certificatePdf(lines:string[]){
  const safe=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[^\x20-\x7E]/g,'?')
  const text=['BT /F1 24 Tf 120 500 Td (FRAD Certificate of Completion) Tj',...lines.map((line,index)=>`0 -${index===0?60:28} Td /F1 ${index===0?18:12} Tf (${safe(line)}) Tj`),'ET'].join('\n')
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  let output='%PDF-1.4\n';const offsets=[0]
  objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(output));output+=`${index+1} 0 obj\n${object}\nendobj\n`})
  const xref=Buffer.byteLength(output);output+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n `).join('\n')}\ntrailer << /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(output)
}

export async function GET(_:Request, context: { params: Promise<{id:string}> }) {
  const params = await context.params;
  try{
    const user=await requireUser()
    const record=await prisma.candidateCourse.findFirst({where:{id:params.id,status:'COMPLETED',candidatePreboarding:{application:{candidate:{userId:user.userId}}}},include:{course:true,candidatePreboarding:{include:{application:{include:{candidate:true}}}}}})
    if(!record)throw new AuthzError('Completed course not found',404)
    let configured=record.course
    try{if(record.courseSnapshotJson)configured=JSON.parse(record.courseSnapshotJson)}catch{}
    if(!configured.certificateEnabled)throw new AuthzError('Certificates are not enabled for this course',409)
    const candidate=record.candidatePreboarding.application.candidate
    const bytes=certificatePdf([`${candidate.legalFirstName} ${candidate.lastName}`,`has completed ${configured.title}`,`Score: ${record.score??100}%`,`Completed: ${(record.completedAt||new Date()).toLocaleDateString('en-GB')}`,`Certificate ID: ${record.id}`])
    await logAudit({actorUserId:user.userId,action:'COURSE_CERTIFICATE_DOWNLOADED',resourceType:'CandidateCourse',resourceId:record.id})
    return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="frad-course-certificate-${record.id}.pdf"`,'Cache-Control':'private, no-store'}})
  }catch(error){return authzResponse(error)}
}
