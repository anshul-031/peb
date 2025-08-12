import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function DrawingsPage({ params }: { params: { id: string } }) {
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
    select: { id: true },
  })
  if (!project) return <div className="py-10 text-center">Not found or access denied.</div>

  return (
    <div>
      <h2 className="text-xl font-semibold">Drawings</h2>
      <p className="mt-2 text-sm text-zinc-600">Standard 2D drawings exports.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a className="rounded bg-zinc-900 px-3 py-2 text-white" href="/api/drawings/dxf">Anchor Bolt Plan (DXF)</a>
        <a className="rounded border px-3 py-2" href={`/api/reports/pdf?projectId=${project.id}`}>Frame Elevations (PDF)</a>
        <a className="rounded border px-3 py-2" href={`/api/reports/pdf?projectId=${project.id}`}>Roof Framing Plan (PDF)</a>
      </div>
    </div>
  )
}
