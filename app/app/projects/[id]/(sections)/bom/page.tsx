import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import BomExportButton from '@/components/BomExportButton'
import BomCostEstimator from '@/components/BomCostEstimator'

export default async function BomPage({ params }: { params: { id: string } }) {
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
    select: { id: true, projectName: true, buildingData: true, analysisResults: true },
  })
  if (!project) return <div className="py-10 text-center">Not found</div>

  const bd = (project.buildingData as any) || {}
  const dims = bd.dimensions || {}
  const uc = ((project.analysisResults as any)?.frameUC || []) as number[]
  const items = [
    { part: 'Rafter', size: 'Tapered', qty: 2 * (((dims.bays || 0) + 1) || 1), length_m: Number(dims.width || 0) || 10 },
    { part: 'Column', size: 'Tapered', qty: 2 * (((dims.bays || 0) + 1) || 1), length_m: Number(dims.eaveHeight || 0) || 6 },
    { part: 'Purlin', size: 'Z200', qty: Math.max(Math.round((Number(dims.length || 0) || 24) / 1.5), 12), length_m: 6 },
  ] as { part: string; size: string; qty: number; length_m: number }[]

  // Simple unit mass map (kg/m); clearly marked as estimate
  const unitMass: Record<string, number> = {
    'Rafter|Tapered': 35,
    'Column|Tapered': 45,
    'Purlin|Z200': 16,
  }
  const withCalcs = items.map(it => {
    const key = `${it.part}|${it.size}`
    const um = unitMass[key] ?? 25
    const totalLen = it.qty * it.length_m
    const estKg = totalLen * um
    return { ...it, unitMass_kg_per_m: um, totalLen_m: totalLen, estWeight_kg: estKg }
  })
  const totals = withCalcs.reduce(
    (acc, it) => {
      acc.qty += it.qty
      acc.len += it.totalLen_m
      acc.kg += it.estWeight_kg
      return acc
    },
    { qty: 0, len: 0, kg: 0 }
  )

  const quick = [
    { label: 'Frames', value: (dims.bays || 0) + 1 },
    { label: 'Span (m)', value: dims.width ?? '-' },
    { label: 'Length (m)', value: dims.length ?? '-' },
    { label: 'Avg UC', value: uc.length ? (uc.reduce((a,b)=>a+b,0)/uc.length).toFixed(2) : '-' },
    { label: 'Total pieces', value: totals.qty },
    { label: 'Total length (m)', value: totals.len.toFixed(1) },
    { label: 'Est. steel (t)', value: (totals.kg/1000).toFixed(2) },
  ]

  return (
    <div>
      <h2 className="text-xl font-semibold">Bill of Materials</h2>
      <p className="mt-1 text-sm text-zinc-600">Quick summary and CSV export for costing and procurement.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3 max-w-xl">
          {quick.map(q => (
            <div key={q.label} className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-xs text-zinc-500">{q.label}</div>
              <div className="text-base font-medium">{q.value}</div>
            </div>
          ))}
        </div>
        <BomCostEstimator totalKg={totals.kg} frames={(dims.bays || 0) + 1} />
      </div>
      <div className="mt-6">
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left">Part</th>
                <th className="px-3 py-2 text-left">Size</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Length (m)</th>
                <th className="px-3 py-2 text-right">Total len (m)</th>
                <th className="px-3 py-2 text-right">Unit mass (kg/m)</th>
                <th className="px-3 py-2 text-right">Est. weight (kg)</th>
              </tr>
            </thead>
            <tbody>
              {withCalcs.map((it, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-2">{it.part}</td>
                  <td className="px-3 py-2">{it.size}</td>
                  <td className="px-3 py-2 text-right">{it.qty}</td>
                  <td className="px-3 py-2 text-right">{it.length_m}</td>
                  <td className="px-3 py-2 text-right">{it.totalLen_m.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right">{it.unitMass_kg_per_m.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right">{it.estWeight_kg.toFixed(0)}</td>
                </tr>
              ))}
              <tr className="border-t bg-zinc-50 font-medium">
                <td className="px-3 py-2" colSpan={2}>Totals</td>
                <td className="px-3 py-2 text-right">{totals.qty}</td>
                <td className="px-3 py-2 text-right">—</td>
                <td className="px-3 py-2 text-right">{totals.len.toFixed(1)}</td>
                <td className="px-3 py-2 text-right">—</td>
                <td className="px-3 py-2 text-right">{totals.kg.toFixed(0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <div className="text-xs text-zinc-500 mb-1">Estimates use generic unit mass per part: Rafter 35, Column 45, Purlin (Z200) 16 kg/m.</div>
          <BomExportButton items={withCalcs as any} />
        </div>
      </div>
    </div>
  )
}
