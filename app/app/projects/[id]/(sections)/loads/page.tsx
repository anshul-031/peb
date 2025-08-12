import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { redirect } from 'next/navigation'

async function saveLoads(projectId: string, formData: FormData) {
  'use server'
  const windSpeed = Number(formData.get('windSpeed') || 0)
  const seismicZone = String(formData.get('seismicZone') || '')
  await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${projectId}/loads`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ windSpeed, seismicZone }),
  })
  redirect(`/app/projects/${projectId}/loads`)
}

export default async function LoadsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return <div className="text-center py-10">Please sign in to view this project.</div>
  }

  const project = await prisma.project.findFirst({
    where: {
      id: params.id,
      OR: [
        { owner: { email: session.user.email } },
        { collaborators: { some: { user: { email: session.user.email } } } },
      ],
    },
    select: { id: true, loadData: true },
  })

  if (!project) {
    return <div className="text-center py-10">Project not found or access denied.</div>
  }

  const loads = (project.loadData as any) || {}
  const dimensions = ((await prisma.project.findUnique({ where: { id: params.id } }))?.buildingData as any)?.dimensions || {}
  // Compute qz via API (fallback to simple formula if needed)
  const V = Number(loads.windSpeed ?? 40)
  let qz = 0.613 * V * V
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/loads/calc`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ windSpeed: 90, exposure: 'C', importance: 1.0, directionality: 0.85, topography: 1.0, height_ft: Math.max(Number(dimensions.eaveHeight||20)*3.2808, 33) })
    })
    const json = await res.json()
    qz = Number(json.qz_kPa ?? qz)
  } catch {}

  return (
    <div>
      <h2 className="text-xl font-semibold">Loads</h2>
  <p className="text-sm text-gray-500">Wind/seismic wizard preview and custom combinations coming soon.</p>
      <pre className="mt-4 bg-gray-50 p-4 rounded text-sm overflow-x-auto">{JSON.stringify(loads, null, 2)}</pre>
      <div className="mt-2 text-xs text-zinc-600">Approx. wind pressure qz: {qz.toFixed(2)} kPa</div>
  <form action={saveLoads.bind(null, project.id)} className="mt-4 grid grid-cols-2 gap-4 max-w-xl">
        <label className="flex flex-col text-sm">Basic wind speed (m/s)
          <input name="windSpeed" type="number" step="1" defaultValue={loads.windSpeed} className="mt-1 rounded border px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">Seismic zone
          <input name="seismicZone" defaultValue={loads.seismicZone} className="mt-1 rounded border px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">Exposure (ASCE)
          <select name="exposure" defaultValue={loads.exposure ?? 'C'} className="mt-1 rounded border px-3 py-2">
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">Importance factor I
          <input name="importance" type="number" step="0.05" defaultValue={loads.importance ?? 1.0} className="mt-1 rounded border px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">Directionality Kd
          <input name="directionality" type="number" step="0.05" defaultValue={loads.directionality ?? 0.85} className="mt-1 rounded border px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">Topography Ke
          <input name="topography" type="number" step="0.05" defaultValue={loads.topography ?? 1.0} className="mt-1 rounded border px-3 py-2" />
        </label>
        <div className="col-span-2">
          <button type="submit" className="rounded bg-zinc-900 px-4 py-2 text-white">Save Loads</button>
        </div>
      </form>
      <div className="mt-6 flex gap-3">
        <Link className="text-blue-600 underline" href={`/app/projects/${project.id}`}>Geometry</Link>
  <Link className="text-blue-600 underline" href={("/app/projects/" + project.id + "/loads/wizard") as any}>Open Loads Wizard</Link>
  <Link className="text-blue-600 underline" href={("/app/projects/" + project.id + "/loads/combinations") as any}>Custom Combinations</Link>
      </div>
    </div>
  )
}
