import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  console.log('[BOM][API] export requested', { count: Array.isArray((body as any).items) ? (body as any).items.length : 'default' })
  const items = (body.items as any[]) || [
    { part: 'Rafter', size: 'Tapered', qty: 2, length_m: 20.0 },
    { part: 'Column', size: 'Tapered', qty: 2, length_m: 6.0 },
    { part: 'Purlin', size: 'Z200', qty: 120, length_m: 6.0 },
  ]
  const headers = ['Part', 'Size', 'Quantity', 'Length (m)', 'Total len (m)', 'Unit mass (kg/m)', 'Est. weight (kg)']
  const rows = items.map((i: any) => {
    const totalLen = (i.qty ?? 0) * (i.length_m ?? 0)
    const um = i.unitMass_kg_per_m ?? ''
    const kg = i.estWeight_kg ?? (typeof um === 'number' ? (totalLen * um) : '')
    return [i.part, i.size, i.qty, i.length_m, totalLen, um, kg]
  })
  // Totals row
  const totals = items.reduce(
    (acc: any, i: any) => {
      acc.qty += Number(i.qty || 0)
      acc.len += Number(i.qty || 0) * Number(i.length_m || 0)
      const um = Number(i.unitMass_kg_per_m || 0)
      acc.kg += um ? Number(i.qty || 0) * Number(i.length_m || 0) * um : 0
      return acc
    },
    { qty: 0, len: 0, kg: 0 }
  )
  const csv = [headers, ...rows, ['Totals', '', totals.qty, '', totals.len, '', totals.kg]].map(r => r.join(',')).join('\n')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="bom.csv"',
    },
  })
}
