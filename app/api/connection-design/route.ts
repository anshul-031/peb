import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { jointType, forces, code } = body
  if (!jointType || !forces) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Placeholder design logic
  const design = {
    jointType,
    code: code ?? 'AISC 360-16',
    bolts: { diameter: 'M20', count: 8, grade: '8.8' },
    plate: { thickness: '12 mm', size: '250 x 350 mm' },
    weld: { size: '6 mm', length: 'continuous' },
    checks: [{ clause: 'J3.7', utilization: 0.72 }],
  }

  return NextResponse.json({ design })
}
