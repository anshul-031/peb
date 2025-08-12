import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProjectRole } from '@/lib/rbac'
import { redirect } from 'next/navigation'
import Viewer3D from '@/components/Viewer3D'
import BuildingTree from '@/components/BuildingTree'

async function saveDimensions(projectId: string, formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  const role = await getProjectRole(projectId, session?.user?.email || undefined)
  if (role !== 'OWNER' && role !== 'EDITOR') return
  const width = Number(formData.get('width') || 0)
  const length = Number(formData.get('length') || 0)
  const eaveHeight = Number(formData.get('eaveHeight') || 0)
  const roofSlope = Number(formData.get('roofSlope') || 0)
  const bays = Number(formData.get('bays') || 0)
  const buildingData = { dimensions: { width, length, eaveHeight, roofSlope, bays } }
  await prisma.project.update({ where: { id: projectId }, data: { buildingData } })
  redirect(`/app/projects/${projectId}`)
}

async function saveFrameProps(projectId: string, formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  const role = await getProjectRole(projectId, session?.user?.email || undefined)
  if (role !== 'OWNER' && role !== 'EDITOR') return
  const type = String(formData.get('frameType') || 'Clear Span')
  const section = String(formData.get('section') || 'Tapered')
  const haunch = Number(formData.get('haunch') || 0.6)
  const crane = String(formData.get('crane') || 'None')
  const prev = await prisma.project.findUnique({ where: { id: projectId } })
  const bd = (prev?.buildingData as any) || {}
  const next = { ...bd, frame: { type, section, haunch, crane } }
  await prisma.project.update({ where: { id: projectId }, data: { buildingData: next } })
  redirect(`/app/projects/${projectId}`)
}

async function saveSecondary(projectId: string, formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  const role = await getProjectRole(projectId, session?.user?.email || undefined)
  if (role !== 'OWNER' && role !== 'EDITOR') return
  const purlin = Number(formData.get('purlinSpacing') || 1.5)
  const girt = Number(formData.get('girtSpacing') || 1.5)
  const pSection = String(formData.get('purlinSection') || 'Z200')
  const gSection = String(formData.get('girtSection') || 'Z200')
  const bracing = String(formData.get('bracing') || 'Rod')
  const prev = await prisma.project.findUnique({ where: { id: projectId } })
  const bd = (prev?.buildingData as any) || {}
  const next = { ...bd, secondary: { purlin, girt, pSection, gSection, bracing } }
  await prisma.project.update({ where: { id: projectId }, data: { buildingData: next } })
  redirect(`/app/projects/${projectId}`)
}

async function saveOpenings(projectId: string, formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  const role = await getProjectRole(projectId, session?.user?.email || undefined)
  if (role !== 'OWNER' && role !== 'EDITOR') return
  const w = Number(formData.get('doorW') || 3)
  const h = Number(formData.get('doorH') || 3)
  const z = Number(formData.get('doorZ') || 0)
  const prev = await prisma.project.findUnique({ where: { id: projectId } })
  const bd = (prev?.buildingData as any) || {}
  const doors = Array.isArray(bd?.openings?.doors) ? bd.openings.doors : []
  const next = { ...bd, openings: { ...bd.openings, doors: [...doors, { w, h, z }] } }
  await prisma.project.update({ where: { id: projectId }, data: { buildingData: next } })
  redirect(`/app/projects/${projectId}`)
}

async function runAnalysis(projectId: string) {
  'use server'
  const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  })
  const json = await res.json()
  redirect(`/app/job-status?jobId=${encodeURIComponent(json.jobId)}&projectId=${encodeURIComponent(projectId)}`)
}

async function saveSettings(projectId: string, formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  const role = await getProjectRole(projectId, session?.user?.email || undefined)
  if (role !== 'OWNER' && role !== 'EDITOR') return
  const clientName = String(formData.get('clientName') || '')
  const designerName = String(formData.get('designerName') || '')
  const location = String(formData.get('location') || '')
  const designCode = String(formData.get('designCode') || '')
  const unitSystem = String(formData.get('unitSystem') || '')
  const buildingType = String(formData.get('buildingType') || '') as any
  const status = String(formData.get('status') || '') as any
  const analysisMode = formData.get('analysisMode') ? 'local' : 'queue'
  const prev = await prisma.project.findUnique({ where: { id: projectId } })
  const bd = (prev?.buildingData as any) || {}
  const nextBD = { ...bd, settings: { ...(bd.settings || {}), analysisMode } }
  await prisma.project.update({
    where: { id: projectId },
    data: { clientName, designerName, location, designCode, unitSystem, buildingType, status, buildingData: nextBD },
  })
  const notice = analysisMode === 'local' ? 'analysis-local' : 'analysis-queue'
  redirect(`/app/projects/${projectId}?notice=${notice}`)
}

export default async function ProjectEditor({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email || undefined
  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return <div className="p-6">Not found</div>
  const role = await getProjectRole(project.id, email)
  const canEdit = role === 'OWNER' || role === 'EDITOR'
  const d = (project.buildingData as any)?.dimensions || {}
  const settings = (project.buildingData as any)?.settings || {}
  const ucByFrame = ((project.analysisResults as any)?.frameUC as number[]) || Array.from({ length: Number(d.bays) || 4 }, () => 0.6)
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{project.projectName}</h1>
        <form action={saveSettings.bind(null, project.id)}>
          <input type="hidden" name="clientName" defaultValue={project.clientName ?? ''} />
          <input type="hidden" name="designerName" defaultValue={project.designerName ?? ''} />
          <input type="hidden" name="location" defaultValue={project.location ?? ''} />
          <input type="hidden" name="designCode" defaultValue={project.designCode ?? ''} />
          <input type="hidden" name="buildingType" defaultValue={(project as any).buildingType ?? 'PEB'} />
          <input type="hidden" name="unitSystem" defaultValue={project.unitSystem ?? 'Metric'} />
          <input type="hidden" name="status" defaultValue={project.status} />
          {/* Toggle analysisMode by including or excluding checkbox name */}
          {settings?.analysisMode === 'local' ? (
            // Currently local -> submit without analysisMode to switch to queue
            <button className="rounded border px-3 py-1.5 text-xs" disabled={!canEdit} title="Switch to Queue mode">Local mode</button>
          ) : (
            // Currently queue -> submit with analysisMode to switch to local
            <button name="analysisMode" value="on" className="rounded border px-3 py-1.5 text-xs" disabled={!canEdit} title="Switch to Local mode">Queue mode</button>
          )}
        </form>
      </div>
      {!canEdit && <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">Read-only access — you can view but not edit this project.</div>}
      <div className="mt-4 grid grid-cols-12 gap-4">
        {/* Left: hierarchy */}
        <aside className="col-span-12 md:col-span-2 rounded border p-3">
          <BuildingTree dims={d} />
        </aside>
        {/* Center: 3D */}
        <section className="col-span-12 md:col-span-6 rounded border p-3">
          <div className="text-sm font-medium">3D Viewer</div>
          <div className="mt-2">
            <Viewer3D width={Number(d.width) || 10} length={Number(d.length) || 24} eaveHeight={Number(d.eaveHeight) || 6} roofSlope={Number(d.roofSlope) || 10} bays={Number(d.bays) || 4} ucByFrame={ucByFrame} />
          </div>
        </section>
  {/* Right: properties */}
        <section className="col-span-12 md:col-span-4 rounded border p-3">
          <div className="text-sm font-medium">Properties</div>
          <form action={saveDimensions.bind(null, project.id)} className="mt-3 grid grid-cols-2 gap-3">
            <label className="flex flex-col text-xs">Width (m)
              <input name="width" defaultValue={d.width} type="number" step="0.1" className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
            </label>
            <label className="flex flex-col text-xs">Length (m)
              <input name="length" defaultValue={d.length} type="number" step="0.1" className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
            </label>
            <label className="flex flex-col text-xs">Eave Height (m)
              <input name="eaveHeight" defaultValue={d.eaveHeight} type="number" step="0.1" className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
            </label>
            <label className="flex flex-col text-xs">Roof Slope (1:x)
              <input name="roofSlope" defaultValue={d.roofSlope} type="number" step="0.1" className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
            </label>
            <label className="flex flex-col text-xs">Bays
              <input name="bays" defaultValue={d.bays} type="number" step="1" className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
            </label>
            <div className="col-span-2 mt-1 flex gap-2">
              <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-white text-sm" disabled={!canEdit}>Save</button>
            </div>
          </form>
          <div className="mt-2 flex gap-2">
            <form action={runAnalysis.bind(null, project.id)}>
              <button type="submit" className="rounded border px-3 py-1.5 text-sm">Run Analysis</button>
            </form>
            <form action={optimize.bind(null, project.id)}>
              <button type="submit" className="rounded border px-3 py-1.5 text-sm">Optimize</button>
            </form>
            {settings?.analysisMode === 'local' ? (
              <div className="ml-auto rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800">Local analysis mode</div>
            ) : (
              <div className="ml-auto rounded bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600">Queue mode</div>
            )}
          </div>
          <div className="mt-6 border-t pt-4">
            <div className="text-sm font-medium">Project Settings</div>
            <form action={saveSettings.bind(null, project.id)} className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col">Client
                <input name="clientName" defaultValue={project.clientName ?? ''} className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
              </label>
              <label className="flex flex-col">Designer
                <input name="designerName" defaultValue={project.designerName ?? ''} className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
              </label>
              <label className="flex flex-col">Location
                <input name="location" defaultValue={project.location ?? ''} className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
              </label>
              <label className="flex flex-col">Design Code
                <select name="designCode" defaultValue={project.designCode ?? 'AISC 360-16'} className="mt-1 rounded border px-2 py-1" disabled={!canEdit}>
                  <option>AISC 360-16</option>
                  <option>MBMA 2018</option>
                  <option>ASCE 7-16</option>
                  <option>IS 800:2007</option>
                </select>
              </label>
              <label className="flex flex-col">Building Type
                <select name="buildingType" defaultValue={(project as any).buildingType ?? 'PEB'} className="mt-1 rounded border px-2 py-1" disabled={!canEdit}>
                  <option value="PEB">PEB</option>
                  <option value="LGS">LGS</option>
                </select>
              </label>
              <label className="flex flex-col">Unit System
                <select name="unitSystem" defaultValue={project.unitSystem ?? 'Metric'} className="mt-1 rounded border px-2 py-1" disabled={!canEdit}>
                  <option>Metric</option>
                  <option>Imperial</option>
                </select>
              </label>
              <label className="flex flex-col">Status
                <select name="status" defaultValue={project.status} className="mt-1 rounded border px-2 py-1" disabled={!canEdit}>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>
              <label className="col-span-2 mt-1 flex items-center gap-2 text-xs">
                <input type="checkbox" name="analysisMode" defaultChecked={settings?.analysisMode === 'local'} disabled={!canEdit} />
                <span>Use local analysis (no Redis/worker). For demos/testing.</span>
              </label>
              <div className="col-span-2">
                <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-white" disabled={!canEdit}>Save Settings</button>
              </div>
            </form>
          </div>
          <div className="mt-6 border-t pt-4">
            <div className="text-sm font-medium">Frame Properties</div>
            <form action={saveFrameProps.bind(null, project.id)} className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col">Type
                <select name="frameType" defaultValue={(d as any)?.frame?.type || 'Clear Span'} className="mt-1 rounded border px-2 py-1" disabled={!canEdit}>
                  <option>Clear Span</option>
                  <option>Multi-Span</option>
                </select>
              </label>
              <label className="flex flex-col">Section
                <select name="section" defaultValue={(d as any)?.frame?.section || 'Tapered'} className="mt-1 rounded border px-2 py-1" disabled={!canEdit}>
                  <option>Tapered</option>
                  <option>Prismatic</option>
                </select>
              </label>
              <label className="flex flex-col">Haunch (m)
                <input name="haunch" type="number" step="0.1" defaultValue={(d as any)?.frame?.haunch || 0.6} className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
              </label>
              <label className="flex flex-col">Crane
                <select name="crane" defaultValue={(d as any)?.frame?.crane || 'None'} className="mt-1 rounded border px-2 py-1" disabled={!canEdit}>
                  <option>None</option>
                  <option>Light</option>
                  <option>Heavy</option>
                </select>
              </label>
              <div className="col-span-2"><button className="rounded bg-zinc-900 px-3 py-1.5 text-white" disabled={!canEdit}>Save Frame</button></div>
            </form>
          </div>
          <div className="mt-6 border-t pt-4">
            <div className="text-sm font-medium">Secondary Framing & Bracing</div>
            <form action={saveSecondary.bind(null, project.id)} className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col">Purlin spacing (m)
                <input name="purlinSpacing" type="number" step="0.1" defaultValue={(d as any)?.secondary?.purlin || 1.5} className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
              </label>
              <label className="flex flex-col">Girt spacing (m)
                <input name="girtSpacing" type="number" step="0.1" defaultValue={(d as any)?.secondary?.girt || 1.5} className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
              </label>
              <label className="flex flex-col">Purlin section
                <select name="purlinSection" defaultValue={(d as any)?.secondary?.pSection || 'Z200'} className="mt-1 rounded border px-2 py-1" disabled={!canEdit}>
                  <option>Z200</option>
                  <option>Z250</option>
                  <option>Z300</option>
                </select>
              </label>
              <label className="flex flex-col">Girt section
                <select name="girtSection" defaultValue={(d as any)?.secondary?.gSection || 'Z200'} className="mt-1 rounded border px-2 py-1" disabled={!canEdit}>
                  <option>Z200</option>
                  <option>Z250</option>
                  <option>Z300</option>
                </select>
              </label>
              <label className="flex flex-col">Bracing type
                <select name="bracing" defaultValue={(d as any)?.secondary?.bracing || 'Rod'} className="mt-1 rounded border px-2 py-1" disabled={!canEdit}>
                  <option>Rod</option>
                  <option>Angle</option>
                  <option>Cable</option>
                </select>
              </label>
              <div className="col-span-2"><button className="rounded bg-zinc-900 px-3 py-1.5 text-white" disabled={!canEdit}>Save Secondary</button></div>
            </form>
          </div>
          <div className="mt-6 border-t pt-4">
            <div className="text-sm font-medium">Openings</div>
            <form action={saveOpenings.bind(null, project.id)} className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <label className="flex flex-col">Door W (m)
                <input name="doorW" type="number" step="0.1" className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
              </label>
              <label className="flex flex-col">Door H (m)
                <input name="doorH" type="number" step="0.1" className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
              </label>
              <label className="flex flex-col">At Z (m)
                <input name="doorZ" type="number" step="0.1" className="mt-1 rounded border px-2 py-1" disabled={!canEdit} />
              </label>
              <div className="col-span-3"><button className="rounded bg-zinc-900 px-3 py-1.5 text-white" disabled={!canEdit}>Add Door</button></div>
            </form>
          </div>
          {/* Collaborators (basic) */}
          <Collaborators projectId={project.id} isOwner={role === 'OWNER'} />
        </section>
      </div>
    </main>
  )
}

async function optimize(projectId: string) {
  'use server'
  const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analysis/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, target: 'min-weight' }),
  })
  const json = await res.json()
  redirect(`/app/job-status?jobId=${encodeURIComponent(json.jobId)}&projectId=${encodeURIComponent(projectId)}`)
}

async function Collaborators({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const proj = await prisma.project.findUnique({
    where: { id: projectId },
    include: { collaborators: { include: { user: true } } },
  })
  async function addCollaborator(formData: FormData) {
    'use server'
    const email = String(formData.get('email') || '')
    const role = String(formData.get('role') || 'VIEWER') as 'OWNER' | 'EDITOR' | 'VIEWER'
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${projectId}/collaborators`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role })
    })
    redirect(`/app/projects/${projectId}`)
  }
  async function updateRole(userId: string, formData: FormData) {
    'use server'
    const role = String(formData.get('role') || 'VIEWER')
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${projectId}/collaborators`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role })
    })
    redirect(`/app/projects/${projectId}`)
  }
  async function removeCollaborator(userId: string) {
    'use server'
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${projectId}/collaborators`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId })
    })
    redirect(`/app/projects/${projectId}`)
  }
  return (
    <div className="mt-6 border-t pt-4">
      <div className="text-sm font-medium">Collaborators</div>
      <div className="mt-2 space-y-2 text-xs">
        {proj?.collaborators.map((c: { id: string; role: string; userId: string; user: { email: string } }) => (
          <div key={c.id} className="flex items-center justify-between rounded border p-2">
            <div>{c.user.email}</div>
            <div className="flex items-center gap-2">
              <form action={updateRole.bind(null, c.userId)} className="flex items-center gap-1">
                <select name="role" defaultValue={c.role} className="rounded border px-2 py-1" disabled={!isOwner}>
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                </select>
                <button className="rounded border px-2" disabled={!isOwner}>Update</button>
              </form>
              <form action={removeCollaborator.bind(null, c.userId)}>
                <button className="rounded border px-2 text-red-600" disabled={!isOwner}>Remove</button>
              </form>
            </div>
          </div>
        ))}
      </div>
      {isOwner && (
        <form action={addCollaborator} className="mt-2 flex gap-2 text-xs">
          <input name="email" placeholder="email" className="flex-1 rounded border px-2 py-1" />
          <select name="role" className="rounded border px-2 py-1">
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
          </select>
          <button type="submit" className="rounded border px-2">Add</button>
        </form>
      )}
    </div>
  )
}
