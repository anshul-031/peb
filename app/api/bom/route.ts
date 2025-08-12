import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const items = (body.items as any[]) || [
    { part: 'Rafter', size: 'Tapered', qty: 2, length_m: 20.0 },
    { part: 'Column', size: 'Tapered', qty: 2, length_m: 6.0 },
    { part: 'Purlin', size: 'Z200', qty: 120, length_m: 6.0 },
  ]
  const headers = ['Part', 'Size', 'Quantity', 'Length (m)']
  const rows = items.map(i => [i.part, i.size, i.qty, i.length_m])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="bom.csv"',
    },
  })
}
