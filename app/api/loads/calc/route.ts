import { NextRequest, NextResponse } from 'next/server'

// Simplified ASCE-style qz calculation (placeholder)
// qz_psf = 0.00256 * Kz * Kd * Ke * V^2 * I
// Returns both psf and kPa (1 psf ≈ 0.04788 kPa)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const V = Number(body.windSpeed ?? 90) // mph for ASCE-style
  const exposure = String(body.exposure ?? 'C') as 'B'|'C'|'D'
  const I = Number(body.importance ?? 1.0)
  const Kd = Number(body.directionality ?? 0.85)
  const Ke = Number(body.topography ?? 1.0)
  const height_ft = Number(body.height_ft ?? 33)

  const baseKz: Record<'B'|'C'|'D', number> = { B: 0.7, C: 0.85, D: 1.03 }
  const scale = Math.max(height_ft, 15) / 33
  const Kz = baseKz[exposure] * Math.pow(scale, 0.1)

  const qz_psf = 0.00256 * Kz * Kd * Ke * V * V * I
  const qz_kPa = qz_psf * 0.04788025898
  return NextResponse.json({ V, exposure, I, Kd, Ke, height_ft, Kz, qz_psf, qz_kPa })
}
