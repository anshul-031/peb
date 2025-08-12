import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { supportReactions, soilBearing } = body || {}
  console.log('[FOUND][POST] incoming', { hasSupport: !!supportReactions, soilBearing })
  if (!supportReactions || !soilBearing) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Simple sizing placeholder
  const Pu = Math.abs(supportReactions.P || 0)
  const q = Number(soilBearing)
  const area = Pu / q
  const size = Math.sqrt(area)

  const design = {
    input: { supportReactions, soilBearing: q },
    footing: { B: Number(size.toFixed(2)), L: Number(size.toFixed(2)), D: 0.6 },
    reinforcement: { top: '10 @ 150 c/c', bottom: '12 @ 150 c/c' },
    checks: [{ type: 'Bearing', utilization: 0.81 }],
  }

  const payload = {
    status: 'ok',
    updatedAt: new Date().toISOString(),
    qAllow: q,
  footingSize: `${design.footing.B} x ${design.footing.L} x ${design.footing.D} m`,
    design,
  }
  console.log('[FOUND][POST] result prepared', { footing: payload.footingSize })
  return NextResponse.json(payload)
}
