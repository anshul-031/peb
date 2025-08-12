import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
      <ul className="mt-4 space-y-2 text-xs">
        {logs.length === 0 && <li className="rounded border bg-white p-3">No logs yet.</li>}
        {logs.slice(Math.max(0, logs.length - 200)).reverse().map((l: any, i: number) => (
          <li key={i} className="rounded border bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[11px] text-zinc-600">{l.time}</div>
              <div className={`rounded px-1 py-0.5 text-[10px] ${l.level==='error'?'bg-red-100 text-red-800':l.level==='warn'?'bg-amber-100 text-amber-800':l.level==='debug'?'bg-zinc-100 text-zinc-800':'bg-emerald-100 text-emerald-800'}`}>{l.level}</div>
            </div>
            <div className="mt-1 font-medium">{l.source}</div>
            <div className="text-zinc-700">{l.message}</div>
            {l.meta && <pre className="mt-1 overflow-auto rounded bg-zinc-50 p-2">{JSON.stringify(l.meta, null, 2)}</pre>}
          </li>
        ))}
      </ul>
    </div>
  )
}
