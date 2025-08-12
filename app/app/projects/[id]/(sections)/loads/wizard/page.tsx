import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

async function saveWizard(projectId: string, formData: FormData) {
  'use server'
  const dead = Number(formData.get('dead') || 0)
  const live = Number(formData.get('live') || 0)
  const windSpeed = Number(formData.get('windSpeed') || 90)
  const exposure = String(formData.get('exposure') || 'C')
  const seismicZone = String(formData.get('seismicZone') || 'II')
  const designCode = String(formData.get('designCode') || 'ASCE 7-16')
  const comboRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/load-combinations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ designCode }) })
  const combos = (await comboRes.json()).combinations
  await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${projectId}/loads`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dead, live, windSpeed, exposure, seismicZone, designCode, combos })
  })
  redirect(`/app/projects/${projectId}/loads`)
}

export default async function LoadsWizardPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return <div className="py-10 text-center">Please sign in.</div>
  const project = await prisma.project.findFirst({
    where: {
      id: params.id,
      OR: [
        { owner: { email: session.user.email } },
        { collaborators: { some: { user: { email: session.user.email } } } },
      ],
    },
    select: { id: true, designCode: true },
  })
  if (!project) return <div className="py-10 text-center">Not found</div>

  return (
    <div>
      <h3 className="text-lg font-semibold">Loads Wizard</h3>
      <ol className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
        <li className="rounded-full bg-zinc-900 px-2 py-0.5 text-white">1. Basics</li>
        <li className="rounded-full bg-zinc-100 px-2 py-0.5">2. Wind</li>
        <li className="rounded-full bg-zinc-100 px-2 py-0.5">3. Seismic</li>
        <li className="rounded-full bg-zinc-100 px-2 py-0.5">4. Combos</li>
      </ol>
      <form action={saveWizard.bind(null, project.id)} className="mt-4 grid max-w-xl grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col">Dead load D (kPa)
          <input name="dead" type="number" step="0.1" defaultValue={0.5} className="mt-1 rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col">Live load L (kPa)
          <input name="live" type="number" step="0.1" defaultValue={0.57} className="mt-1 rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col">Design Code
          <select name="designCode" defaultValue={project.designCode || 'ASCE 7-16'} className="mt-1 rounded border px-2 py-1">
            <option>ASCE 7-16</option>
            <option>MBMA 2018</option>
            <option>AISC 360-16</option>
            <option>IS 800:2007</option>
          </select>
        </label>
        <div className="col-span-2 mt-2 border-t pt-3">
          <div className="text-sm font-medium">Wind</div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="flex flex-col">Basic wind speed (mph)
              <input name="windSpeed" type="number" step="1" defaultValue={90} className="mt-1 rounded border px-2 py-1" />
            </label>
            <label className="flex flex-col">Exposure
              <select name="exposure" defaultValue={'C'} className="mt-1 rounded border px-2 py-1">
                <option>B</option>
                <option>C</option>
                <option>D</option>
              </select>
            </label>
          </div>
        </div>
        <div className="col-span-2 border-t pt-3">
          <div className="text-sm font-medium">Seismic</div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="flex flex-col">Zone
              <select name="seismicZone" defaultValue={'II'} className="mt-1 rounded border px-2 py-1">
                <option>I</option>
                <option>II</option>
                <option>III</option>
                <option>IV</option>
              </select>
            </label>
          </div>
        </div>
        <div className="col-span-2 mt-2">
          <button className="rounded bg-zinc-900 px-4 py-2 text-white">Save & Apply</button>
        </div>
      </form>
    </div>
  )
}
