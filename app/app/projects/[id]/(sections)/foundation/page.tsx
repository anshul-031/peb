import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function FoundationPage({ params }: { params: { id: string } }) {
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
    select: { id: true, foundationDesigns: true },
  })

  if (!project) {
    return <div className="text-center py-10">Project not found or access denied.</div>
  }

  const data = (project.foundationDesigns as any) || { note: 'No foundation designs yet.' }
  const projectId = project.id

  async function designAndSave(fd: FormData) {
    'use server'
  const qAllow = Number(fd.get('qAllow') || 150)
  const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/foundation-design`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supportReactions: { P: 200, M: 50 }, soilBearing: qAllow }) })
    const json = await res.json()
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${projectId}/foundation`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json) })
    redirect(`/app/projects/${projectId}/foundation`)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Foundation</h2>
      <pre className="mt-4 bg-gray-50 p-4 rounded text-sm overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
  <form action={designAndSave} className="mt-4 flex gap-2 text-sm">
        <label className="flex items-center gap-2">qAllow (kPa)
          <input name="qAllow" type="number" defaultValue={data.qAllow || 150} className="rounded border px-2 py-1" />
        </label>
        <button type="submit" className="rounded border px-3 py-1">Design & Save</button>
      </form>
    </div>
  )
}
