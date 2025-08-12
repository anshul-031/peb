import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'

async function createProject(formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    // Require sign-in to create projects
    return
  }
  const name = String(formData.get('name') || '')
  const buildingType = (formData.get('buildingType') as string) || 'PEB'
  const clientName = String(formData.get('clientName') || '')
  const designerName = String(formData.get('designerName') || '')
  const designCode = String(formData.get('designCode') || 'AISC 360-16')
  const unitSystem = String(formData.get('unitSystem') || 'Metric')
  const location = String(formData.get('location') || '')
  if (!name) return
  const owner = await prisma.user.upsert({ where: { email: session.user.email! }, update: {}, create: { email: session.user.email!, name: session.user.name || null } })
  await prisma.project.create({
    data: { projectName: name, clientName, designerName, location, ownerId: owner.id, designCode, unitSystem, buildingType: buildingType as any },
  })
  revalidatePath('/app/projects')
}

async function duplicateProject(id: string) {
  'use server'
  const p = await prisma.project.findUnique({ where: { id }, include: { owner: true, collaborators: { include: { user: true } } } })
  if (!p) return
  const session = await getServerSession(authOptions)
  const email = session?.user?.email || ''
  const canAccess = p.owner?.email === email || (p.collaborators || []).some(c => c.user.email === email)
  if (!canAccess) return
  const copy = await prisma.project.create({
    data: {
      ownerId: p.ownerId,
      projectName: `${p.projectName} (Copy)`,
      designCode: p.designCode,
      unitSystem: p.unitSystem,
  clientName: p.clientName,
  designerName: p.designerName,
  buildingData: p.buildingData as any,
  loadData: p.loadData as any,
  analysisResults: p.analysisResults as any,
  connectionDesigns: p.connectionDesigns as any,
  foundationDesigns: p.foundationDesigns as any,
    },
  })
  revalidatePath('/app/projects')
}

async function runAnalysis(id: string) {
  'use server'
  // Kick off analysis and redirect to job status
  const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analysis`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: id }) })
  const json = await res.json()
  const jobId = json.jobId
  if (jobId) {
    redirect(`/app/job-status?jobId=${encodeURIComponent(jobId)}&projectId=${encodeURIComponent(id)}`)
  }
}

async function optimizeProject(id: string) {
  'use server'
  const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analysis/optimize`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: id, target: 'min-weight' }) })
  const json = await res.json()
  const jobId = json.jobId
  if (jobId) {
    redirect(`/app/job-status?jobId=${encodeURIComponent(jobId)}&projectId=${encodeURIComponent(id)}`)
  }
}

async function createFromTemplate(template: string) {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return
  const owner = await prisma.user.upsert({ where: { email: session.user.email! }, update: {}, create: { email: session.user.email!, name: session.user.name || null } })
  const presets: Record<string, any> = {
    'Warehouse 30×60': {
      name: 'Warehouse 30×60', dims: { width: 30, length: 60, eaveHeight: 8, bays: 6 }, secondary: { purlinSpacing: 1.5, girtSpacing: 1.8 }, unitSystem: 'Metric', designCode: 'AISC 360-16'
    },
    'Factory 40×80': {
      name: 'Factory 40×80', dims: { width: 40, length: 80, eaveHeight: 10, bays: 8 }, secondary: { purlinSpacing: 1.6, girtSpacing: 2.0 }, unitSystem: 'Metric', designCode: 'MBMA 2018'
    },
    'Small Shed 12×18': {
      name: 'Small Shed 12×18', dims: { width: 12, length: 18, eaveHeight: 4.2, bays: 3 }, secondary: { purlinSpacing: 1.2, girtSpacing: 1.5 }, unitSystem: 'Metric', designCode: 'IS 800:2007'
    },
  }
  const p = presets[template] || presets['Warehouse 30×60']
  await prisma.project.create({
    data: {
      ownerId: owner.id,
      projectName: p.name,
      designCode: p.designCode,
      unitSystem: p.unitSystem,
      buildingType: 'PEB' as any,
      buildingData: { dimensions: p.dims, secondary: p.secondary } as any,
    },
  })
  revalidatePath('/app/projects')
}

export default async function ProjectsPage({ searchParams }: { searchParams?: { q?: string, status?: string, client?: string } }) {
  const session = await getServerSession(authOptions)
  const q = searchParams?.q?.toLowerCase() || ''
  const status = searchParams?.status as any
  const client = searchParams?.client || ''
  let projects: any[] = []
  if (session?.user?.email) {
    const filters: any[] = []
    if (q) filters.push({ OR: [{ projectName: { contains: q, mode: 'insensitive' } }, { designCode: { contains: q, mode: 'insensitive' } }] })
    if (status) filters.push({ status })
    if (client) filters.push({ clientName: { contains: client, mode: 'insensitive' } })
    const access = { OR: [ { owner: { email: session.user.email } }, { collaborators: { some: { user: { email: session.user.email } } } } ] }
    const where = { AND: [access, ...filters] }
    projects = await prisma.project.findMany({ where, orderBy: { createdAt: 'desc' } })
  } else {
    projects = []
  }
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <form className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
        <input name="q" placeholder="Search by name or code" defaultValue={q} className="rounded border px-3 py-2 w-full" />
        <input name="client" placeholder="Client" defaultValue={client} className="rounded border px-3 py-2 w-full" />
        <select name="status" defaultValue={status || ''} className="rounded border px-3 py-2">
          <option value="">All</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <button className="rounded border px-3">Filter</button>
      </form>

      {session?.user?.email ? (
        <>
          <form action={createProject} className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-6">
            <input name="name" placeholder="New project name" className="rounded border px-3 py-2" />
            <input name="clientName" placeholder="Client" className="rounded border px-3 py-2" />
            <input name="designerName" placeholder="Designer" className="rounded border px-3 py-2" />
            <input name="location" placeholder="Location" className="rounded border px-3 py-2" />
            <select name="buildingType" className="rounded border px-3 py-2">
              <option value="PEB">PEB</option>
              <option value="LGS">LGS</option>
            </select>
            <select name="designCode" className="rounded border px-3 py-2">
              <option>AISC 360-16</option>
              <option>MBMA 2018</option>
              <option>ASCE 7-16</option>
              <option>IS 800:2007</option>
            </select>
            <select name="unitSystem" className="rounded border px-3 py-2">
              <option>Metric</option>
              <option>Imperial</option>
            </select>
            <button type="submit" className="rounded bg-zinc-900 px-4 py-2 text-white">Create</button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-zinc-600">Quick templates:</span>
            <form action={createFromTemplate.bind(null, 'Warehouse 30×60')}><button className="rounded border px-3 py-1 hover:border-indigo-300">Warehouse 30×60</button></form>
            <form action={createFromTemplate.bind(null, 'Factory 40×80')}><button className="rounded border px-3 py-1 hover:border-indigo-300">Factory 40×80</button></form>
            <form action={createFromTemplate.bind(null, 'Small Shed 12×18')}><button className="rounded border px-3 py-1 hover:border-indigo-300">Small Shed 12×18</button></form>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-xl border bg-white p-6 text-center text-sm text-zinc-700">
          <div className="text-base font-medium">Sign in to view your projects</div>
          <div className="mt-1">Your projects are private to your account.</div>
          <a href="/signin" className="mt-3 inline-block rounded bg-zinc-900 px-4 py-2 text-white">Sign in</a>
        </div>
      )}

      {projects.length === 0 ? (
        session?.user?.email ? (
          <div className="mt-10 rounded-xl border bg-white p-8 text-center text-zinc-600">No projects yet. Create one above or start from a template.</div>
        ) : null
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p: any) => {
            const uc: number[] = Array.isArray((p as any)?.analysisResults?.frameUC) ? (p as any).analysisResults.frameUC : []
            const mode = (p as any)?.buildingData?.settings?.analysisMode as string | undefined
            const maxUC = uc.length ? Math.max(...uc) : null
            const pct = maxUC ? Math.min(120, Math.round(maxUC * 100)) : 0
            const barColor = maxUC && maxUC > 1 ? 'bg-red-500' : 'bg-emerald-500'
            return (
              <div key={p.id} className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between">
                  <a href={`/app/projects/${p.id}`} className="font-medium hover:underline">{p.projectName}</a>
                  <span className={`rounded-full px-2 py-0.5 text-xs border ${p.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : p.status === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-zinc-50 text-zinc-700 border-zinc-200'}`}>{p.status?.replace('_',' ') || 'IN PROGRESS'}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-zinc-600">
                  <span className="rounded bg-zinc-100 px-2 py-0.5">{p.designCode}</span>
                  <span className="rounded bg-zinc-100 px-2 py-0.5">{p.unitSystem}</span>
                  {p.clientName && <span className="rounded bg-zinc-100 px-2 py-0.5">Client: {p.clientName}</span>}
                  {(p as any).buildingType && <span className="rounded bg-zinc-100 px-2 py-0.5">{(p as any).buildingType}</span>}
                  {mode && (
                    <span className={`rounded px-2 py-0.5 ${mode==='local' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{mode==='local' ? 'Local mode' : 'Queue mode'}</span>
                  )}
                </div>
                {maxUC !== null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-zinc-600">
                      <span>Max UC</span>
                      <span className={maxUC! > 1 ? 'text-red-600' : ''}>{maxUC!.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-zinc-100">
                      <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <a href={`/app/projects/${p.id}`} className="text-sm text-blue-600 hover:underline">Open</a>
                  <div className="flex items-center gap-3">
                    <form action={runAnalysis.bind(null, p.id)}>
                      <button className="text-xs underline">Run</button>
                    </form>
                    <form action={optimizeProject.bind(null, p.id)}>
                      <button className="text-xs underline">Optimize</button>
                    </form>
                  <form action={duplicateProject.bind(null, p.id)}>
                    <button className="text-xs underline">Duplicate</button>
                  </form>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
