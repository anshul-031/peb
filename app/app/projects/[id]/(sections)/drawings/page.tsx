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
  select: { id: true, buildingData: true },
  })
  if (!project) return <div className="py-10 text-center">Not found or access denied.</div>

  return (
    <div>
      <h2 className="text-xl font-semibold">Drawings</h2>
      <p className="mt-2 text-sm text-zinc-600">Standard 2D drawings exports.</p>
      <div className="mt-4 flex flex-wrap gap-3">
  <a className="rounded bg-zinc-900 px-3 py-2 text-white" href={`/api/drawings/dxf?projectId=${project.id}`}>Anchor Bolt Plan (DXF)</a>
        <a className="rounded border px-3 py-2" href={`/api/reports/pdf?projectId=${project.id}`}>Frame Elevations (PDF)</a>
        <a className="rounded border px-3 py-2" href={`/api/reports/pdf?projectId=${project.id}`}>Roof Framing Plan (PDF)</a>
      </div>
      <div className="mt-6">
        <div className="text-sm font-medium">Preview: Typical Frame Elevation</div>
        <div className="mt-2 overflow-x-auto rounded border bg-white p-2">
          <svg width="640" height="220" viewBox="0 0 640 220">
            <rect x="0" y="0" width="640" height="220" fill="#fff" />
            <g stroke="#111" strokeWidth="2" fill="none">
              <line x1="80" y1="200" x2="80" y2="80" />
              <line x1="560" y1="200" x2="560" y2="80" />
              <line x1="80" y1="80" x2="320" y2="40" />
              <line x1="560" y1="80" x2="320" y2="40" />
              <line x1="40" y1="200" x2="600" y2="200" stroke="#888" strokeDasharray="4 4" />
            </g>
            <g fill="#111" fontSize="10">
              <text x="70" y="210">Base</text>
              <text x="545" y="210">Base</text>
              <text x="315" y="34">Ridge</text>
            </g>
          </svg>
        </div>
      </div>
      <div className="mt-6">
        <div className="text-sm font-medium">Preview: Roof Framing Plan</div>
        <div className="mt-2 overflow-x-auto rounded border bg-white p-2">
          {(() => {
            const d = (project.buildingData as any)?.dimensions || {}
            const L = Number(d.length || 24)
            const W = Number(d.width || 12)
            const bays = Number(d.bays || 4)
            const scale = 20
            const w = Math.max(400, W * scale + 80)
            const h = Math.max(220, L * scale + 80)
            const bayWidth = L / bays
            const lines = Array.from({ length: bays + 1 }, (_, i) => i)
            return (
              <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                <rect x="0" y="0" width={w} height={h} fill="#fff" />
                <g transform={`translate(40,40)`}>
                  <rect x="0" y="0" width={W * scale} height={L * scale} fill="#f9fafb" stroke="#111" />
                  {/* Grid/bays */}
                  <g stroke="#999" strokeDasharray="4 4">
                    {lines.map(i => (
                      <line key={i} x1={0} y1={i * bayWidth * scale} x2={W * scale} y2={i * bayWidth * scale} />
                    ))}
                  </g>
                  {/* Purlin lines across width every ~1.5 m along length */}
                  <g stroke="#1f2937">
                    {Array.from({ length: Math.floor(W / 1.5) + 1 }, (_, j) => j).map(j => (
                      <line key={j} x1={j * 1.5 * scale} y1={0} x2={j * 1.5 * scale} y2={L * scale} />
                    ))}
                  </g>
                  {/* Labels */}
                  <g fill="#111" fontSize="10">
                    <text x={W * scale - 30} y={-10}>{`W=${W}m`}</text>
                    <text x={-30} y={L * scale + 12}>{`L=${L}m`}</text>
                    {lines.map(i => (
                      <text key={i} x={-28} y={i * bayWidth * scale + 12}>{`B${i}`}</text>
                    ))}
                  </g>
                </g>
              </svg>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
