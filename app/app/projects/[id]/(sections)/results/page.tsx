import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Viewer3D from '@/components/Viewer3D'
import { ToastProvider } from '@/components/Toast'

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
  select: { id: true, analysisResults: true, buildingData: true },
  })

  if (!project) {
    return <div className="text-center py-10">Project not found or access denied.</div>
  }

  const results = (project.analysisResults as any) || null
  const dims = (project.buildingData as any)?.dimensions || {}

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
  const localStatus = typeof results?.status === 'string' && results.status.includes('local')
  const uc = Array.isArray(results?.frameUC) ? (results.frameUC as number[]) : []
  const maxUC = uc.length ? Math.max(...uc) : null
  const govIdx = uc.length ? uc.indexOf(maxUC!) : -1
  const defl = Array.isArray(d?.deflection) ? d!.deflection : []
  const maxDefl = defl.length ? Math.max(...defl.map((v:number)=>Math.abs(v))) : null
  const govCombo = typeof results?.governingCombo === 'string' ? results.governingCombo as string : null
  function BarChart({ data, label }: { data: number[]; label: string }) {
    const w = 420, h = 120, pad = 10
    const barW = (w - 2*pad) / Math.max(1, data.length)
    return (
      <div className="rounded border bg-white p-3">
        <div className="mb-1 text-xs text-zinc-500">{label}</div>
        <svg width={w} height={h}>
          {data.map((v, i) => {
            const x = pad + i * barW
            const bh = Math.min(h - 2*pad, (v || 0) / 1.2 * (h - 2*pad))
            const y = h - pad - bh
            const color = v > 1.0 ? '#ef4444' : '#10b981'
            return <rect key={i} x={x + 2} y={y} width={barW - 4} height={bh} fill={color} />
          })}
        </svg>
      </div>
    )
  }
  return (
    <div>
      <h2 className="text-xl font-semibold">Analysis Results</h2>
      {localStatus && (
        <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">Local analysis mode in use (no Redis/worker detected). Values are illustrative.</div>
      )}
      {!results && (
        <div className="mt-3 rounded border bg-white p-3 text-sm">
          <div>No results yet. Run analysis to see utilization and plots.</div>
          <form action={async () => {
            'use server'
            const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: params.id }) })
            const json = await res.json()
            const jobId = json.jobId
            if (jobId) {
              const loc = `/app/job-status?jobId=${encodeURIComponent(jobId)}&projectId=${encodeURIComponent(params.id)}`
              const { redirect } = await import('next/navigation')
              redirect(loc)
            }
          }}>
            <button className="mt-2 rounded bg-zinc-900 px-3 py-1 text-white">Run Analysis</button>
          </form>
        </div>
      )}
      {d ? (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded border bg-white p-3 md:col-span-2">
            <div className="text-xs text-zinc-500">Summary</div>
            <div className="mt-1 text-sm">Max Utilization: {maxUC !== null ? maxUC.toFixed(2) : '—'}</div>
            {govIdx >= 0 && (
              <div className="text-xs text-zinc-500">Governing frame: #{govIdx + 1}</div>
            )}
            {govCombo && (
              <div className="text-xs text-zinc-500">Governing combo: {govCombo}</div>
            )}
            {typeof results?.status === 'string' && <div className="text-xs text-zinc-500">Status: {results.status}</div>}
          </div>
          <div className="md:col-span-2">
            <Viewer3D
              width={Number(dims.width || 10)}
              length={Number(dims.length || 24)}
              eaveHeight={Number(dims.eaveHeight || 6)}
              roofSlope={Number(dims.roofSlope || 10)}
              bays={Number(dims.bays || 3) + 1}
              ucByFrame={uc}
            />
          </div>
          <div className="rounded border bg-white p-3">
            <div className="mb-1 text-xs text-zinc-500">Deflection Summary</div>
            <div className="text-sm">Max Abs Deflection: {maxDefl !== null ? maxDefl.toFixed(2) : '—'}</div>
          </div>
          <Plot data={d.M} label="Bending Moment (M)" color="#3b82f6" />
          <Plot data={d.V} label="Shear (V)" color="#6366f1" />
          <Plot data={d.N} label="Axial (N)" color="#10b981" />
          <Plot data={d.deflection} label="Deflection" color="#ef4444" />
        </div>
      ) : null}
      {uc.length > 0 && (
        <div className="mt-4">
          <BarChart data={uc} label="Utilization by Frame" />
        </div>
      )}
      <pre className="mt-4 bg-gray-50 p-4 rounded text-sm overflow-x-auto">{JSON.stringify(results, null, 2)}</pre>
    </div>
  )
}
