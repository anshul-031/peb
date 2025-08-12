import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Viewer3D from '@/components/Viewer3D'

async function saveDimensions(projectId: string, formData: FormData) {
  'use server'
  const width = Number(formData.get('width') || 0)
  const length = Number(formData.get('length') || 0)
  const eaveHeight = Number(formData.get('eaveHeight') || 0)
  const roofSlope = Number(formData.get('roofSlope') || 0)
  const bays = Number(formData.get('bays') || 0)
  const buildingData = { dimensions: { width, length, eaveHeight, roofSlope, bays } }
  await prisma.project.update({ where: { id: projectId }, data: { buildingData } })
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
  redirect(`/app/job-status?jobId=${encodeURIComponent(json.jobId)}`)
}

async function saveSettings(projectId: string, formData: FormData) {
  'use server'
  const clientName = String(formData.get('clientName') || '')
  const designerName = String(formData.get('designerName') || '')
  const location = String(formData.get('location') || '')
  const designCode = String(formData.get('designCode') || '')
  const unitSystem = String(formData.get('unitSystem') || '')
  const buildingType = String(formData.get('buildingType') || '') as any
  const status = String(formData.get('status') || '') as any
  await prisma.project.update({
    where: { id: projectId },
    data: { clientName, designerName, location, designCode, unitSystem, buildingType, status },
  })
  redirect(`/app/projects/${projectId}`)
}

export default async function ProjectEditor({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return <div className="p-6">Not found</div>
  const d = (project.buildingData as any)?.dimensions || {}
  const ucByFrame = ((project.analysisResults as any)?.frameUC as number[]) || Array.from({ length: Number(d.bays) || 4 }, () => 0.6)
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold">{project.projectName}</h1>
      <div className="mt-4 grid grid-cols-12 gap-4">
        {/* Left: hierarchy */}
        <aside className="col-span-12 md:col-span-2 rounded border p-3">
          <div className="text-sm font-medium">Building</div>
          <ul className="mt-2 text-sm space-y-1">
            <li>Frames</li>
            <li>Bays</li>
            <li>Bracing</li>
            <li>Openings</li>
          </ul>
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
              <input name="width" defaultValue={d.width} type="number" step="0.1" className="mt-1 rounded border px-2 py-1" />
            </label>
            <label className="flex flex-col text-xs">Length (m)
              <input name="length" defaultValue={d.length} type="number" step="0.1" className="mt-1 rounded border px-2 py-1" />
            </label>
            <label className="flex flex-col text-xs">Eave Height (m)
              <input name="eaveHeight" defaultValue={d.eaveHeight} type="number" step="0.1" className="mt-1 rounded border px-2 py-1" />
            </label>
            <label className="flex flex-col text-xs">Roof Slope (1:x)
              <input name="roofSlope" defaultValue={d.roofSlope} type="number" step="0.1" className="mt-1 rounded border px-2 py-1" />
            </label>
            <label className="flex flex-col text-xs">Bays
              <input name="bays" defaultValue={d.bays} type="number" step="1" className="mt-1 rounded border px-2 py-1" />
            </label>
            <div className="col-span-2 mt-1 flex gap-2">
              <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-white text-sm">Save</button>
            </div>
          </form>
          <div className="mt-2 flex gap-2">
            <form action={runAnalysis.bind(null, project.id)}>
              <button type="submit" className="rounded border px-3 py-1.5 text-sm">Run Analysis</button>
            </form>
            <form action={optimize.bind(null, project.id)}>
              <button type="submit" className="rounded border px-3 py-1.5 text-sm">Optimize</button>
            </form>
          </div>
          <div className="mt-6 border-t pt-4">
            <div className="text-sm font-medium">Project Settings</div>
            <form action={saveSettings.bind(null, project.id)} className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col">Client
                <input name="clientName" defaultValue={project.clientName ?? ''} className="mt-1 rounded border px-2 py-1" />
              </label>
              <label className="flex flex-col">Designer
                <input name="designerName" defaultValue={project.designerName ?? ''} className="mt-1 rounded border px-2 py-1" />
              </label>
              <label className="flex flex-col">Location
                <input name="location" defaultValue={project.location ?? ''} className="mt-1 rounded border px-2 py-1" />
              </label>
              <label className="flex flex-col">Design Code
                <select name="designCode" defaultValue={project.designCode ?? 'AISC 360-16'} className="mt-1 rounded border px-2 py-1">
                  <option>AISC 360-16</option>
                  <option>MBMA 2018</option>
                  <option>ASCE 7-16</option>
                  <option>IS 800:2007</option>
                </select>
              </label>
              <label className="flex flex-col">Building Type
                <select name="buildingType" defaultValue={(project as any).buildingType ?? 'PEB'} className="mt-1 rounded border px-2 py-1">
                  <option value="PEB">PEB</option>
                  <option value="LGS">LGS</option>
                </select>
              </label>
              <label className="flex flex-col">Unit System
                <select name="unitSystem" defaultValue={project.unitSystem ?? 'Metric'} className="mt-1 rounded border px-2 py-1">
                  <option>Metric</option>
                  <option>Imperial</option>
                </select>
              </label>
              <label className="flex flex-col">Status
                <select name="status" defaultValue={project.status} className="mt-1 rounded border px-2 py-1">
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>
              <div className="col-span-2">
                <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-white">Save Settings</button>
              </div>
            </form>
          </div>
          {/* Collaborators (basic) */}
          <Collaborators projectId={project.id} />
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
  redirect(`/app/job-status?jobId=${encodeURIComponent(json.jobId)}`)
}

async function Collaborators({ projectId }: { projectId: string }) {
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
  return (
    <div className="mt-6 border-t pt-4">
      <div className="text-sm font-medium">Collaborators</div>
      <ul className="mt-2 space-y-1 text-xs">
        {proj?.collaborators.map((c: { id: string; role: string; user: { email: string } }) => (
          <li key={c.id}>{c.user.email} · {c.role}</li>
        ))}
      </ul>
      <form action={addCollaborator} className="mt-2 flex gap-2 text-xs">
        <input name="email" placeholder="email" className="flex-1 rounded border px-2 py-1" />
        <select name="role" className="rounded border px-2 py-1">
          <option value="VIEWER">Viewer</option>
          <option value="EDITOR">Editor</option>
        </select>
        <button type="submit" className="rounded border px-2">Add</button>
      </form>
    </div>
  )
}
