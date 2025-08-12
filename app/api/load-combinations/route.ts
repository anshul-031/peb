import { NextRequest, NextResponse } from 'next/server'

const combosByCode: Record<string, string[]> = {
  'ASCE 7-16': [
    '1.4D',
    '1.2D + 1.6L + 0.5(Lr or S or R)',
    '1.2D + 1.0W + 1.6L + 0.5(Lr or S or R)',
    '0.9D + 1.0W',
  ],
  'AISC 360-16': [
    '1.4D',
    '1.2D + 1.6L',
    '0.9D + 1.0W',
  ],
  'MBMA 2018': [
    '1.0D + 0.6W',
    '1.0D + 0.75(0.6W + 1.0L)',
  ],
  'IS 800:2007': [
    '1.5(D + L)',
    '0.9D + 1.5W',
  ],
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { designCode = 'ASCE 7-16', unitSystem = 'Metric' } = body
  const combos = combosByCode[designCode] || combosByCode['ASCE 7-16']
  return NextResponse.json({ designCode, unitSystem, combinations: combos })
}
