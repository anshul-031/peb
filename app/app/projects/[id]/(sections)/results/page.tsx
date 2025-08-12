import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function ResultsPage({ params }: { params: { id: string } }) {
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
    select: { id: true, analysisResults: true },
  })

  if (!project) {
    return <div className="text-center py-10">Project not found or access denied.</div>
  }

  const results = (project.analysisResults as any) || { note: 'No results yet. Run analysis from Geometry tab.' }

  function Plot({ data, label, color = '#0ea5e9' }: { data: number[]; label: string; color?: string }) {
    const w = 420, h = 120, pad = 10
    const max = Math.max(1, ...data.map((v) => Math.abs(v)))
    const points = data.map((v, i) => {
      const x = pad + (i / Math.max(1, data.length - 1)) * (w - 2 * pad)
      const y = h / 2 - (v / max) * (h / 2 - pad)
      return `${x},${y}`
    }).join(' ')
    return (
      <div className="rounded border bg-white p-3">
        <div className="mb-1 text-xs text-zinc-500">{label}</div>
        <svg width={w} height={h} className="overflow-visible">
          <line x1={pad} y1={h/2} x2={w-pad} y2={h/2} stroke="#e5e7eb" />
          <polyline fill="none" stroke={color} strokeWidth={2} points={points} />
        </svg>
      </div>
    )
  }

  const d = results?.diagrams
  return (
    <div>
      <h2 className="text-xl font-semibold">Analysis Results</h2>
      {d ? (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Plot data={d.M} label="Bending Moment (M)" color="#3b82f6" />
          <Plot data={d.V} label="Shear (V)" color="#6366f1" />
          <Plot data={d.N} label="Axial (N)" color="#10b981" />
          <Plot data={d.deflection} label="Deflection" color="#ef4444" />
        </div>
      ) : null}
      <pre className="mt-4 bg-gray-50 p-4 rounded text-sm overflow-x-auto">{JSON.stringify(results, null, 2)}</pre>
    </div>
  )
}
