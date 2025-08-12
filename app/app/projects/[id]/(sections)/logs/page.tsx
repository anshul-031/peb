import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import LogsFeed from '@/components/project/LogsFeed'

export default async function LogsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return <div className="py-10 text-center">Please sign in to view this project.</div>
  const project = await prisma.project.findFirst({
    where: {
      id: params.id,
      OR: [
        { owner: { email: session.user.email } },
        { collaborators: { some: { user: { email: session.user.email } } } },
      ],
    },
    select: { id: true, buildingData: true },
  })
  if (!project) return <div className="py-10 text-center">Project not found or access denied.</div>
  const logs: any[] = Array.isArray((project.buildingData as any)?.logs) ? (project.buildingData as any).logs : []
  async function clearLogs() {
    'use server'
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${params.id}/logs`, { method: 'DELETE' })
  }
  return (
    <div>
      <h2 className="text-xl font-semibold">Logs</h2>
      <div className="mt-2 text-xs text-zinc-600">Recent project logs across analysis, connections, foundations, BOM, and auth events.</div>
      <form action={clearLogs} className="mt-3">
        <button className="rounded border px-3 py-1 text-sm">Clear logs</button>
      </form>
      <div className="mt-4">
        <LogsFeed projectId={project.id} initialLogs={logs} />
      </div>
    </div>
  )
}
