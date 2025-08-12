import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })
  const sp = new URL(req.url).searchParams
  const projectId = sp.get('projectId')
  if (!projectId) return new Response('projectId required', { status: 400 })
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { owner: { email: session.user.email } },
        { collaborators: { some: { user: { email: session.user.email } } } },
      ],
    },
    select: { buildingData: true },
  })
  if (!project) return new Response('Not found', { status: 404 })
  const dims = (project.buildingData as any)?.dimensions || {}
  const sec = (project.buildingData as any)?.secondary || {}
  const W = Number(dims.width || 12)
  const L = Number(dims.length || 24)
  const H = Number(dims.eaveHeight || 6)
  const bays = Number(dims.bays || 4)
  const frameCount = bays + 1
  const purlinSp = Number(sec.purlinSpacing || sec.purlin || 1.5)
  const purlinQty = Math.max(Math.round(L / Math.max(0.5, purlinSp)), 1) * frameCount
  const items = [
    { part: 'Rafter', size: 'Tapered', qty: 2 * frameCount, length_m: W },
    { part: 'Column', size: 'Tapered', qty: 2 * frameCount, length_m: H },
    { part: 'Purlin', size: sec.pSection || 'Z200', qty: purlinQty, length_m: 6 },
  ]
  const headers = ['Part', 'Size', 'Quantity', 'Length (m)', 'Total len (m)', 'Unit mass (kg/m)', 'Est. weight (kg)']
  const unitMass: Record<string, number> = { 'Rafter|Tapered': 35, 'Column|Tapered': 45, 'Purlin|Z200': 16 }
  const rows = items.map((i: any) => {
    const totalLen = (i.qty ?? 0) * (i.length_m ?? 0)
    const key = `${i.part}|${i.size}`
    const um = unitMass[key] ?? (i.unitMass_kg_per_m ?? '')
    const kg = typeof um === 'number' ? totalLen * um : ''
    return [i.part, i.size, i.qty, i.length_m, totalLen, um, kg]
  })
  const totals = rows.reduce(
    (acc: any, r: any[]) => {
      acc.qty += Number(r[2] || 0)
      acc.len += Number(r[4] || 0)
      acc.kg += Number(r[6] || 0)
      return acc
    },
    { qty: 0, len: 0, kg: 0 }
  )
  const csv = [headers, ...rows, ['Totals', '', totals.qty, '', totals.len, '', totals.kg]].map(r => r.join(',')).join('\n')
  try {
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${encodeURIComponent(projectId)}/logs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'info', source: 'api/bom', message: 'BOM CSV generated', meta: { totals } })
    }).catch(()=>{})
  } catch {}
  return new Response(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="bom.csv"' } })
}
