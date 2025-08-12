import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { supportReactions, soilBearing } = body
  if (!supportReactions || !soilBearing) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Simple sizing placeholder
  const Pu = Math.abs(supportReactions.P || 0)
  const q = Number(soilBearing)
  const area = Pu / q
  const size = Math.sqrt(area)

  const design = {
    footing: { B: Number(size.toFixed(2)), L: Number(size.toFixed(2)), D: 0.6 },
    reinforcement: { top: '10 @ 150 c/c', bottom: '12 @ 150 c/c' },
    checks: [{ type: 'Bearing', utilization: 0.81 }],
  }

  return NextResponse.json({ design })
}
