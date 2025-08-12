import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function VersionsPage({ params, searchParams }: { params: { id: string }, searchParams?: { from?: string, to?: string } }) {
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
  include: { versions: { orderBy: { createdAt: 'desc' } } },
  })

  if (!project) {
    return <div className="text-center py-10">Project not found or access denied.</div>
  }

  type VersionLite = { id: number; createdAt: Date; notes: string | null }
  const versions = project.versions as VersionLite[]

  // Optional diff
  let diff: { differences: Array<{ path: string; a: unknown; b: unknown }> } | null = null
  const from = searchParams?.from
  const to = searchParams?.to
  if (from && to) {
    const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${params.id}/versions/diff?from=${from}&to=${to}`, { cache: 'no-store' })
    if (res.ok) diff = await res.json()
  }

  async function revertTo(versionId: number) {
    'use server'
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${params.id}/versions/${versionId}/revert`, { method: 'POST' })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Versions</h2>
      <ul className="mt-4 space-y-2">
    {versions.map((v) => (
          <li key={v.id} className="rounded border p-3 text-sm">
            <div className="font-medium">{new Date(v.createdAt).toLocaleString()}</div>
            <div className="text-gray-600">{v.notes || 'Snapshot'}</div>
            <div className="mt-2 flex gap-2">
              <form action={revertTo.bind(null, v.id)}>
                <button className="rounded border px-2 py-1">Revert to this</button>
              </form>
              {versions.length > 1 && (
                <a className="underline text-xs" href={`?from=${v.id}&to=${versions[0].id}`}>Compare with latest</a>
              )}
            </div>
          </li>
        ))}
      </ul>
      {diff && (
        <div className="mt-6">
          <div className="text-sm font-medium">Differences</div>
          <ul className="mt-2 space-y-1 text-xs">
            {diff.differences.length === 0 && <li>No differences.</li>}
            {diff.differences.map((d, i) => (
              <li key={i} className="rounded bg-gray-50 p-2">
                <div className="font-mono">{d.path}</div>
                <div className="text-red-700">A: {JSON.stringify(d.a)}</div>
                <div className="text-green-700">B: {JSON.stringify(d.b)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
