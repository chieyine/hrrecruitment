import OperatingModelManager from '@/components/admin/OperatingModelManager'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function OperatingModelPage(){
  const [policies,workflows,changes,integrations]=await Promise.all([
    prisma.slaPolicy.findMany({orderBy:{name:'asc'}}),
    prisma.workflowDefinition.findMany({include:{versions:{include:{transitions:true},orderBy:{version:'desc'}}},orderBy:{name:'asc'}}),
    prisma.configurationChangeRequest.findMany({orderBy:{requestedAt:'desc'},take:200}),
    prisma.integrationConnection.findMany({orderBy:{connectionType:'asc'}}),
  ])
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Controlled configuration</p><h1 className="mt-1 text-3xl font-extrabold">Operating model</h1><p className="mt-2 text-sm text-slate-600">Versioned workflows, service targets, and integration status. Material changes require a second administrator.</p></div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Workflow versions</h2>{workflows.map((workflow)=><div key={workflow.id} className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-sm font-bold">{workflow.name}</p><p className="text-xs text-slate-500">{workflow.versions.map((version)=>`v${version.version} ${version.status} (${version.transitions.length} rules)`).join(' · ')}</p></div>)}</div><div className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Integration readiness</h2>{integrations.length===0?<p className="mt-3 text-sm text-slate-500">No external connections configured. Core email and in-platform delivery remain active.</p>:integrations.map((integration)=><div key={integration.id} className="mt-3 flex justify-between text-sm"><span>{integration.displayName}</span><span className="font-bold">{integration.status}</span></div>)}</div></div><OperatingModelManager policies={policies} changes={changes}/></div>
}
