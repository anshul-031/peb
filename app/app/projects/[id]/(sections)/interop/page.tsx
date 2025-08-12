import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function InteropPage({ params }: { params: { id: string } }) {
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
    select: { id: true },
  })

  if (!project) {
    return <div className="text-center py-10">Project not found or access denied.</div>
  }

  async function runOpenSees() {
    'use server'
    const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analysis/opensees`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project!.id })
    })
  const json = await res.json()
  redirect(`/app/job-status?jobId=${encodeURIComponent(json.jobId)}&projectId=${encodeURIComponent(params.id)}`)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Interoperability</h2>
      <p className="text-sm text-gray-600 mt-2">IFC/CIS2 import/export coming soon.</p>
      <ul className="mt-4 list-disc pl-5 text-sm text-gray-700">
        <li>Import IFC to pre-populate geometry</li>
        <li>Export analytical model to OpenSees/IFC</li>
        <li>DXF outlines for fabrication</li>
      </ul>
      <div className="mt-5 flex gap-3 flex-wrap">
  <a className="rounded bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700" href={`/api/interop/ifc/export?projectId=${project.id}`}>Export IFC</a>
  <a className="rounded bg-fuchsia-600 px-3 py-2 text-white hover:bg-fuchsia-700" href={`/api/interop/cis2/export?projectId=${project.id}`}>Export CIS/2</a>
  <a className="rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700" href={`/api/drawings/dxf?projectId=${project.id}`}>Export DXF</a>
  <form action={`/api/interop/ifc/import?projectId=${project.id}`} method="post">
          <button className="rounded bg-gray-700 px-3 py-2 text-white hover:bg-gray-800" type="submit">Import IFC (JSON stub)</button>
        </form>
        <form action={runOpenSees}>
          <button className="rounded bg-orange-600 px-3 py-2 text-white hover:bg-orange-700" type="submit">Run OpenSees</button>
        </form>
      </div>
    </div>
  )
}
