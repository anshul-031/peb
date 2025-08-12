import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function ConnectionsPage({ params }: { params: { id: string } }) {
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
    select: { id: true, connectionDesigns: true },
  })

  if (!project) {
    return <div className="text-center py-10">Project not found or access denied.</div>
  }

  const data = (project.connectionDesigns as any) || { note: 'No connection designs yet.' }
  const projectId = project.id

  async function designAndSave(fd: FormData) {
    'use server'
  const joint = String(fd.get('joint') || 'Rafter-Column')
  const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/connection-design`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jointType: joint, forces: { M: 120, V: 80, N: 50 } }) })
    const json = await res.json()
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${projectId}/connections`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json) })
    redirect(`/app/projects/${projectId}/connections`)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Connections</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 max-w-xl text-sm">
        <div className="rounded border bg-white p-3"><div className="text-xs text-zinc-500">Designed joints</div><div className="text-base font-medium">{Array.isArray((data as any).joints) ? (data as any).joints.length : 0}</div></div>
        <div className="rounded border bg-white p-3"><div className="text-xs text-zinc-500">Last status</div><div className="text-base font-medium">{(data as any).status || '—'}</div></div>
      </div>
      <pre className="mt-4 bg-gray-50 p-4 rounded text-sm overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
  <form action={designAndSave} className="mt-4 flex gap-2 text-sm">
        <select name="joint" className="rounded border px-2 py-1">
          <option>Rafter-Column</option>
          <option>Base Plate</option>
        </select>
        <button type="submit" className="rounded border px-3 py-1">Design & Save</button>
      </form>
    </div>
  )
}
