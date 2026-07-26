'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AssessmentAnswerReview from '@/components/admin/AssessmentAnswerReview'

type Question = {
  questionType: 'MCQ'|'MULTISELECT'|'TRUEFALSE'|'SHORTTEXT'|'LONGTEXT'|'NUMBER'|'FILE'
  prompt: string
  optionsText: string
  correctAnswer: string
  maximumScore: number
}

type AssessmentSummary = {
  id:string
  title:string
  vacancyId:string
  type:string
  description?:string|null
  durationMinutes:number
  passMark:number
  maximumAttempts:number
  opensAt?:string|Date|null
  closesAt?:string|Date|null
  randomizeQuestions:boolean
  autoSubmit:boolean
  candidateCount:number
}

const EMPTY_QUESTION: Question = { questionType: 'MCQ', prompt: '', optionsText: '', correctAnswer: '', maximumScore: 10 }
const ASSESSMENT_TYPES = ['ONLINE_MCQ','ONLINE_SHORT_ANSWER','ESSAY','SCENARIO','FILE_UPLOAD','OFFLINE_WRITTEN','PRACTICAL','PRESENTATION','DRIVING_TEST','SPREADSHEET','SIMULATION']
const storedJson = (value:string|null|undefined):unknown => {
  if (!value) return undefined
  try { return JSON.parse(value) } catch { return undefined }
}

export default function AssessmentManager({
  vacancies, eligible, assessments, candidateAssessments,
}: {
  vacancies: Array<{id:string; title:string}>
  eligible: Array<{id:string; name:string; vacancyId:string}>
  assessments: AssessmentSummary[]
  candidateAssessments: Array<{id:string; assessmentId:string; candidateName:string; status:string}>
}) {
  const router = useRouter()
  const [message,setMessage]=useState('')
  const [vacancyId,setVacancyId]=useState('')
  const [title,setTitle]=useState('')
  const [description,setDescription]=useState('')
  const [type,setType]=useState('ONLINE_MCQ')
  const [durationMinutes,setDurationMinutes]=useState(60)
  const [passMark,setPassMark]=useState(70)
  const [maximumAttempts,setMaximumAttempts]=useState(1)
  const [opensAt,setOpensAt]=useState('')
  const [closesAt,setClosesAt]=useState('')
  const [randomizeQuestions,setRandomizeQuestions]=useState(false)
  const [autoSubmit,setAutoSubmit]=useState(true)
  const [questions,setQuestions]=useState<Question[]>([{...EMPTY_QUESTION}])
  const [assessmentId,setAssessmentId]=useState('')
  const [applicationId,setApplicationId]=useState('')
  const [resultId,setResultId]=useState('')
  const [resultScore,setResultScore]=useState('')
  const [resultComment,setResultComment]=useState('')
  const [offlineRecord,setOfflineRecord]=useState({venue:'',assessedAt:'',attendance:'ATTENDED',invigilator:'',scriptReference:''})
  const [scoreSheet,setScoreSheet]=useState<File|null>(null)
  const [resetId,setResetId]=useState('')
  const [resetReason,setResetReason]=useState('')
  const [editingId,setEditingId]=useState('')
  const [editBusy,setEditBusy]=useState(false)
  const [editForm,setEditForm]=useState({
    title:'',description:'',durationMinutes:60,passMark:70,maximumAttempts:1,
    opensAt:'',closesAt:'',randomizeQuestions:false,autoSubmit:true,
  })
  const [editQuestions,setEditQuestions]=useState<Question[]>([])

  const selectedAssessment=assessments.find(a=>a.id===assessmentId)
  const resultRecords=useMemo(()=>candidateAssessments.filter(record=>['SUBMITTED','AUTO_SUBMITTED','INVITED','NOT_STARTED','IN_PROGRESS'].includes(record.status)),[candidateAssessments])
  const offline = ['OFFLINE_WRITTEN','PRACTICAL','PRESENTATION','DRIVING_TEST','SIMULATION'].includes(type)

  const create = async (event:React.FormEvent) => {
    event.preventDefault()
    const normalizedQuestions=questions.filter(question=>question.prompt.trim()).map(question=>{
      const options=question.questionType==='TRUEFALSE'?['True','False']:question.optionsText.split('\n').map(value=>value.trim()).filter(Boolean)
      const correctAnswer=question.questionType==='MULTISELECT'?question.correctAnswer.split('|').map(value=>value.trim()).filter(Boolean):question.correctAnswer||undefined
      return {questionType:question.questionType,prompt:question.prompt,options:options.length?options:undefined,correctAnswer,maximumScore:question.maximumScore}
    })
    const response=await fetch('/api/recruitment/assessments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vacancyId,title,description,type,durationMinutes,passMark,maximumAttempts,opensAt:opensAt||undefined,closesAt:closesAt||undefined,randomizeQuestions,autoSubmit,configuration:{deliveryMode:offline?'OFFLINE':'ONLINE'},questions:normalizedQuestions})})
    const data=await response.json()
    setMessage(response.ok?'Assessment created.':data.error||'Failed')
    if(response.ok)router.refresh()
  }
  const invite = async () => {
    const response=await fetch(`/api/recruitment/assessments/${assessmentId}/invite`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({applicationIds:[applicationId]})})
    const data=await response.json();setMessage(response.ok?'Invitation sent.':data.error||'Failed');if(response.ok)router.refresh()
  }
  const recordResult = async () => {
    const selected=candidateAssessments.find(record=>record.id===resultId)
    const selectedAssessmentRecord=assessments.find(assessment=>assessment.id===selected?.assessmentId)
    const isOfflineRecord=selectedAssessmentRecord&&['OFFLINE_WRITTEN','PRACTICAL','PRESENTATION','DRIVING_TEST','SIMULATION'].includes(selectedAssessmentRecord.type)
    let scoreSheetFileId:string|undefined
    if(scoreSheet){const form=new FormData();form.append('file',scoreSheet);form.append('sensitivityClass','CONFIDENTIAL');const upload=await fetch('/api/assets/upload',{method:'POST',body:form});const body=await upload.json();if(!upload.ok){setMessage(body.error||'Score sheet upload failed');return}scoreSheetFileId=body.fileAssetId}
    const response=await fetch(`/api/recruitment/candidate-assessments/${resultId}/mark`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({score:Number(resultScore),comment:resultComment,...(isOfflineRecord?{offlineRecord:{...offlineRecord,scoreSheetFileId}}:{})})})
    const data=await response.json();setMessage(response.ok?'Assessment outcome recorded.':data.error||'Failed');if(response.ok)router.refresh()
  }
  const resetAttempt=async()=>{const response=await fetch(`/api/recruitment/candidate-assessments/${resetId}/reset`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:resetReason})});const data=await response.json();setMessage(response.ok?'Assessment attempt reset and candidate may try again.':data.error||'Reset failed');if(response.ok){setResetId('');setResetReason('');router.refresh()}}
  const updateQuestion=(index:number,changes:Partial<Question>)=>setQuestions(current=>current.map((question,i)=>i===index?{...question,...changes}:question))
  const updateEditQuestion=(index:number,changes:Partial<Question>)=>setEditQuestions(current=>current.map((question,i)=>i===index?{...question,...changes}:question))
  const inputDate=(value:string|Date|null|undefined)=>value?new Date(value).toISOString().slice(0,16):''
  const editAssessment=async(id:string)=>{
    setEditBusy(true);setMessage('')
    const response=await fetch(`/api/recruitment/assessments/${id}`)
    const data=await response.json()
    setEditBusy(false)
    if(!response.ok){setMessage(data.error||'Assessment could not be loaded.');return}
    const item=data.assessment
    setEditingId(id)
    setEditForm({title:item.title,description:item.description||'',durationMinutes:item.durationMinutes,passMark:item.passMark,maximumAttempts:item.maximumAttempts,opensAt:inputDate(item.opensAt),closesAt:inputDate(item.closesAt),randomizeQuestions:item.randomizeQuestions,autoSubmit:item.autoSubmit})
    setEditQuestions(item.questions.map((question:any)=>{
      const options=storedJson(question.optionsJson)
      const answer=storedJson(question.correctAnswerJson)
      return {
        questionType:question.questionType,
        prompt:question.prompt,
        optionsText:Array.isArray(options)?options.join('\n'):'',
        correctAnswer:answer===undefined?'':Array.isArray(answer)?answer.join('|'):String(answer),
        maximumScore:question.maximumScore,
      }
    }))
  }
  const saveAssessment=async(event:React.FormEvent)=>{
    event.preventDefault();setEditBusy(true);setMessage('')
    const selected=assessments.find(item=>item.id===editingId)
    const questions=editQuestions.filter(question=>question.prompt.trim()).map(question=>{
      const options=question.questionType==='TRUEFALSE'?['True','False']:question.optionsText.split('\n').map(value=>value.trim()).filter(Boolean)
      const correctAnswer=question.questionType==='MULTISELECT'?question.correctAnswer.split('|').map(value=>value.trim()).filter(Boolean):question.correctAnswer||undefined
      return {questionType:question.questionType,prompt:question.prompt,options:options.length?options:undefined,correctAnswer,maximumScore:question.maximumScore}
    })
    const response=await fetch(`/api/recruitment/assessments/${editingId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...editForm,opensAt:editForm.opensAt||null,closesAt:editForm.closesAt||null,...(selected?.candidateCount?{}:{questions})})})
    const data=await response.json();setEditBusy(false)
    setMessage(response.ok?'Assessment updated.':data.error||'Assessment update failed.')
    if(response.ok){setEditingId('');router.refresh()}
  }

  return <div className="space-y-4">
    <section className="rounded-2xl border bg-white p-5 space-y-3" aria-labelledby="assessment-edit-heading">
      <div><h2 id="assessment-edit-heading" className="font-bold">Edit an assessment</h2><p className="text-xs text-slate-500">Timing, instructions and delivery settings remain editable. Questions lock after the first candidate is invited so submitted attempts keep their original meaning.</p></div>
      <div className="flex flex-wrap gap-2">{assessments.map(item=><button key={item.id} type="button" onClick={()=>void editAssessment(item.id)} className={`rounded border px-3 py-2 text-left text-xs font-bold ${editingId===item.id?'border-blue-600 bg-blue-50 text-blue-900':'border-slate-300 bg-white text-slate-800'}`}>{item.title}</button>)}</div>
      {editBusy&&!editingId&&<p role="status" className="text-xs text-slate-500">Loading assessment…</p>}
      {editingId&&<form onSubmit={saveAssessment} className="space-y-3 border-t pt-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-bold">Title<input required value={editForm.title} onChange={event=>setEditForm({...editForm,title:event.target.value})} className="mt-1 w-full rounded border p-2 text-sm"/></label>
          <label className="text-xs font-bold">Instructions<input value={editForm.description} onChange={event=>setEditForm({...editForm,description:event.target.value})} className="mt-1 w-full rounded border p-2 text-sm"/></label>
          <label className="text-xs font-bold">Duration (minutes)<input type="number" min={1} max={480} value={editForm.durationMinutes} onChange={event=>setEditForm({...editForm,durationMinutes:Number(event.target.value)})} className="mt-1 w-full rounded border p-2 text-sm"/></label>
          <label className="text-xs font-bold">Pass mark (%)<input type="number" min={0} max={100} value={editForm.passMark} onChange={event=>setEditForm({...editForm,passMark:Number(event.target.value)})} className="mt-1 w-full rounded border p-2 text-sm"/></label>
          <label className="text-xs font-bold">Opens at<input type="datetime-local" value={editForm.opensAt} onChange={event=>setEditForm({...editForm,opensAt:event.target.value})} className="mt-1 w-full rounded border p-2 text-sm"/></label>
          <label className="text-xs font-bold">Closes at<input type="datetime-local" value={editForm.closesAt} onChange={event=>setEditForm({...editForm,closesAt:event.target.value})} className="mt-1 w-full rounded border p-2 text-sm"/></label>
          <label className="text-xs font-bold">Maximum attempts<input type="number" min={1} max={10} value={editForm.maximumAttempts} onChange={event=>setEditForm({...editForm,maximumAttempts:Number(event.target.value)})} className="mt-1 w-full rounded border p-2 text-sm"/></label>
          <div className="flex items-center gap-6 text-xs font-bold"><label><input type="checkbox" checked={editForm.randomizeQuestions} onChange={event=>setEditForm({...editForm,randomizeQuestions:event.target.checked})} className="mr-2"/>Randomize questions</label><label><input type="checkbox" checked={editForm.autoSubmit} onChange={event=>setEditForm({...editForm,autoSubmit:event.target.checked})} className="mr-2"/>Auto-submit</label></div>
        </div>
        {assessments.find(item=>item.id===editingId)?.candidateCount===0?<div className="space-y-2"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">Questions</h3><button type="button" onClick={()=>setEditQuestions(current=>[...current,{...EMPTY_QUESTION}])} className="rounded border px-3 py-1 text-xs font-bold">Add question</button></div>{editQuestions.map((question,index)=><div key={index} className="grid gap-2 rounded-xl border bg-slate-50 p-3 md:grid-cols-2"><select value={question.questionType} onChange={event=>updateEditQuestion(index,{questionType:event.target.value as Question['questionType']})} className="rounded border p-2 text-sm">{['MCQ','MULTISELECT','TRUEFALSE','SHORTTEXT','LONGTEXT','NUMBER','FILE'].map(value=><option key={value}>{value}</option>)}</select><input aria-label={`Question ${index+1} maximum score`} type="number" min={0.1} value={question.maximumScore} onChange={event=>updateEditQuestion(index,{maximumScore:Number(event.target.value)})} className="rounded border p-2 text-sm"/><textarea value={question.prompt} onChange={event=>updateEditQuestion(index,{prompt:event.target.value})} placeholder="Question prompt" className="rounded border p-2 text-sm md:col-span-2"/>{['MCQ','MULTISELECT'].includes(question.questionType)&&<textarea value={question.optionsText} onChange={event=>updateEditQuestion(index,{optionsText:event.target.value})} placeholder="Options, one per line" className="rounded border p-2 text-sm"/>}{['MCQ','MULTISELECT','TRUEFALSE','SHORTTEXT','NUMBER'].includes(question.questionType)&&<input value={question.correctAnswer} onChange={event=>updateEditQuestion(index,{correctAnswer:event.target.value})} placeholder="Correct answer" className="rounded border p-2 text-sm"/>}<button type="button" onClick={()=>setEditQuestions(current=>current.filter((_,i)=>i!==index))} className="justify-self-start text-xs font-bold text-rose-700">Remove</button></div>)}</div>:<p className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Questions are locked because candidates have already been invited. Create a new assessment version if the questions must change.</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setEditingId('')} className="rounded border px-4 py-2 text-xs font-bold">Cancel</button><button disabled={editBusy} className="rounded bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{editBusy?'Saving…':'Save changes'}</button></div>
      </form>}
    </section>
    <form onSubmit={create} className="rounded-2xl border bg-white p-5 space-y-3">
      <h2 className="font-bold">Create assessment</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <select required value={vacancyId} onChange={event=>setVacancyId(event.target.value)} className="w-full rounded border p-2 text-sm"><option value="">Vacancy</option>{vacancies.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</select>
        <select value={type} onChange={event=>setType(event.target.value)} className="w-full rounded border p-2 text-sm">{ASSESSMENT_TYPES.map(value=><option key={value}>{value}</option>)}</select>
        <input required value={title} onChange={event=>setTitle(event.target.value)} placeholder="Assessment title" className="w-full rounded border p-2 text-sm"/>
        <input value={description} onChange={event=>setDescription(event.target.value)} placeholder="Instructions / description" className="w-full rounded border p-2 text-sm"/>
        <label className="text-xs font-bold">Duration (minutes)<input type="number" min={1} max={480} value={durationMinutes} onChange={event=>setDurationMinutes(Number(event.target.value))} className="mt-1 w-full rounded border p-2 text-sm"/></label>
        <label className="text-xs font-bold">Pass mark (%)<input type="number" min={0} max={100} value={passMark} onChange={event=>setPassMark(Number(event.target.value))} className="mt-1 w-full rounded border p-2 text-sm"/></label>
        <label className="text-xs font-bold">Opens at<input type="datetime-local" value={opensAt} onChange={event=>setOpensAt(event.target.value)} className="mt-1 w-full rounded border p-2 text-sm"/></label>
        <label className="text-xs font-bold">Closes at<input type="datetime-local" value={closesAt} onChange={event=>setClosesAt(event.target.value)} className="mt-1 w-full rounded border p-2 text-sm"/></label>
        <label className="text-xs font-bold">Maximum attempts<input type="number" min={1} max={10} value={maximumAttempts} onChange={event=>setMaximumAttempts(Number(event.target.value))} className="mt-1 w-full rounded border p-2 text-sm"/></label>
        <div className="flex items-center gap-6 text-xs font-bold"><label><input type="checkbox" checked={randomizeQuestions} onChange={event=>setRandomizeQuestions(event.target.checked)} className="mr-2"/>Randomize questions</label><label><input type="checkbox" checked={autoSubmit} onChange={event=>setAutoSubmit(event.target.checked)} className="mr-2"/>Auto-submit</label></div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Questions / marking criteria</h3><button type="button" onClick={()=>setQuestions(current=>[...current,{...EMPTY_QUESTION}])} className="rounded border px-3 py-1 text-xs font-bold">Add question</button></div>
        {questions.map((question,index)=><div key={index} className="grid gap-2 rounded-xl border bg-slate-50 p-3 md:grid-cols-2">
          <select value={question.questionType} onChange={event=>updateQuestion(index,{questionType:event.target.value as Question['questionType']})} className="rounded border p-2 text-sm">{['MCQ','MULTISELECT','TRUEFALSE','SHORTTEXT','LONGTEXT','NUMBER','FILE'].map(value=><option key={value}>{value}</option>)}</select>
          <input type="number" min={0.1} value={question.maximumScore} onChange={event=>updateQuestion(index,{maximumScore:Number(event.target.value)})} aria-label="Maximum score" className="rounded border p-2 text-sm"/>
          <textarea value={question.prompt} onChange={event=>updateQuestion(index,{prompt:event.target.value})} placeholder={offline?'Criterion / activity to assess':'Question prompt'} className="rounded border p-2 text-sm md:col-span-2"/>
          {['MCQ','MULTISELECT'].includes(question.questionType)&&<textarea value={question.optionsText} onChange={event=>updateQuestion(index,{optionsText:event.target.value})} placeholder="Options, one per line" className="rounded border p-2 text-sm"/>}
          {['MCQ','MULTISELECT','TRUEFALSE','SHORTTEXT','NUMBER'].includes(question.questionType)&&<input value={question.correctAnswer} onChange={event=>updateQuestion(index,{correctAnswer:event.target.value})} placeholder={question.questionType==='MULTISELECT'?'Correct answers separated by |':'Correct answer'} className="rounded border p-2 text-sm"/>}
          <button type="button" onClick={()=>setQuestions(current=>current.filter((_,i)=>i!==index))} className="justify-self-start text-xs font-bold text-rose-700">Remove</button>
        </div>)}
      </div>
      <button className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white">Create assessment</button>
    </form>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-5 space-y-3"><h2 className="font-bold">Invite candidate</h2><select value={assessmentId} onChange={event=>{setAssessmentId(event.target.value);setApplicationId('')}} className="w-full rounded border p-2 text-sm"><option value="">Assessment</option>{assessments.map(a=><option key={a.id} value={a.id}>{a.title} ({a.type})</option>)}</select><select value={applicationId} onChange={event=>setApplicationId(event.target.value)} className="w-full rounded border p-2 text-sm"><option value="">Eligible candidate</option>{eligible.filter(a=>a.vacancyId===selectedAssessment?.vacancyId).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><button type="button" onClick={invite} disabled={!assessmentId||!applicationId} className="rounded bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Send invitation</button></div>
      <div className="rounded-2xl border bg-white p-5 space-y-3"><h2 className="font-bold">Record manual / offline outcome</h2><select value={resultId} onChange={event=>setResultId(event.target.value)} className="w-full rounded border p-2 text-sm"><option value="">Candidate assessment</option>{resultRecords.map(record=><option key={record.id} value={record.id}>{record.candidateName} — {record.status}</option>)}</select><input type="number" min={0} max={100} value={resultScore} onChange={event=>setResultScore(event.target.value)} placeholder="Score (%)" className="w-full rounded border p-2 text-sm"/><textarea value={resultComment} onChange={event=>setResultComment(event.target.value)} placeholder="Marker evidence and comments" className="w-full rounded border p-2 text-sm"/><div className="grid gap-2 md:grid-cols-2"><input value={offlineRecord.venue} onChange={event=>setOfflineRecord({...offlineRecord,venue:event.target.value})} placeholder="Venue" className="rounded border p-2 text-sm"/><input type="datetime-local" value={offlineRecord.assessedAt} onChange={event=>setOfflineRecord({...offlineRecord,assessedAt:event.target.value})} className="rounded border p-2 text-sm"/><select value={offlineRecord.attendance} onChange={event=>setOfflineRecord({...offlineRecord,attendance:event.target.value})} className="rounded border p-2 text-sm"><option>ATTENDED</option><option>LATE</option><option>ABSENT</option></select><input value={offlineRecord.invigilator} onChange={event=>setOfflineRecord({...offlineRecord,invigilator:event.target.value})} placeholder="Invigilator / assessor" className="rounded border p-2 text-sm"/><input value={offlineRecord.scriptReference} onChange={event=>setOfflineRecord({...offlineRecord,scriptReference:event.target.value})} placeholder="Script reference" className="rounded border p-2 text-sm"/><label className="text-xs font-bold">Score sheet<input type="file" onChange={event=>setScoreSheet(event.target.files?.[0]||null)} className="mt-1 block w-full"/></label></div>{resultId&&['SUBMITTED','AUTO_SUBMITTED'].includes(candidateAssessments.find(record=>record.id===resultId)?.status||'')&&<AssessmentAnswerReview candidateAssessmentId={resultId} candidateName={candidateAssessments.find(record=>record.id===resultId)?.candidateName||''}/>}<button type="button" onClick={recordResult} disabled={!resultId||resultScore===''} className="rounded bg-purple-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Record outcome</button></div>
    </div>
    <div className="rounded-2xl border bg-white p-5 space-y-3"><h2 className="font-bold">Authorise another attempt</h2><select value={resetId} onChange={event=>setResetId(event.target.value)} className="w-full rounded border p-2 text-sm"><option value="">Completed candidate assessment</option>{candidateAssessments.filter(record=>['SUBMITTED','AUTO_SUBMITTED','MARKED','PASSED','FAILED'].includes(record.status)).map(record=><option key={record.id} value={record.id}>{record.candidateName} — {record.status}</option>)}</select><textarea value={resetReason} onChange={event=>setResetReason(event.target.value)} placeholder="Reason for allowing another attempt" className="w-full rounded border p-2 text-sm"/><button type="button" onClick={resetAttempt} disabled={!resetId||resetReason.trim().length<10} className="rounded bg-amber-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Reset attempt</button></div>
    {message&&<p role="status" className="text-xs font-bold text-slate-700">{message}</p>}
  </div>
}
