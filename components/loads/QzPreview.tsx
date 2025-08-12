"use client"
import { useMemo } from 'react'

type Props = {
  windSpeed?: number // mph
  exposure?: 'B'|'C'|'D'
  importance?: number
  directionality?: number
  topography?: number
  eaveHeight_m?: number
}

export default function QzPreview({ windSpeed = 90, exposure = 'C', importance = 1.0, directionality = 0.85, topography = 1.0, eaveHeight_m = 6 }: Props) {
  // compute qz over heights
  const points = useMemo(() => {
    const baseKz: Record<'B'|'C'|'D', number> = { B: 0.7, C: 0.85, D: 1.03 }
    const h_ft = Math.max(eaveHeight_m * 3.28084, 20)
    const N = 20
    const arr: { h: number; qz: number }[] = []
    for (let i = 0; i <= N; i++) {
      const h = 10 + (h_ft - 10) * (i / N)
      const scale = Math.max(h, 15) / 33
      const Kz = baseKz[exposure] * Math.pow(scale, 0.1)
      const qz_psf = 0.00256 * Kz * directionality * topography * windSpeed * windSpeed * importance
      const qz_kPa = qz_psf * 0.04788025898
      arr.push({ h, qz: qz_kPa })
    }
    return arr
  }, [windSpeed, exposure, importance, directionality, topography, eaveHeight_m])

  const width = 320, height = 160, pad = 28
  const maxQ = Math.max(...points.map(p => p.qz), 1)
  const minQ = 0
  const minH = Math.min(...points.map(p => p.h))
  const maxH = Math.max(...points.map(p => p.h))
  const x = (q: number) => pad + (q - minQ) / (maxQ - minQ || 1) * (width - pad * 2)
  const y = (h: number) => height - pad - (h - minH) / (maxH - minH || 1) * (height - pad * 2)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.qz).toFixed(1)} ${y(p.h).toFixed(1)}`).join(' ')
  const qAtEave = points[points.length - 1]?.qz ?? 0

  return (
    <div className="rounded border bg-white p-3 shadow-sm">
      <div className="mb-2 text-sm font-medium">Wind pressure preview qz(h) · kPa</div>
      <svg width={width} height={height} className="text-zinc-600">
        {/* axes */}
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#e5e7eb" />
        <line x1={pad} y1={height - pad} x2={pad} y2={pad} stroke="#e5e7eb" />
        {/* ticks */}
        {Array.from({ length: 5 }, (_, i) => {
          const q = minQ + (maxQ - minQ) * (i / 4)
          const tx = x(q)
          return <g key={i}><line x1={tx} y1={height - pad} x2={tx} y2={height - pad + 4} stroke="#9ca3af" /><text x={tx} y={height - pad + 14} fontSize={9} textAnchor="middle">{q.toFixed(2)}</text></g>
        })}
        {Array.from({ length: 5 }, (_, i) => {
          const h = minH + (maxH - minH) * (i / 4)
          const ty = y(h)
          return <g key={i}><line x1={pad - 4} y1={ty} x2={pad} y2={ty} stroke="#9ca3af" /><text x={pad - 6} y={ty + 3} fontSize={9} textAnchor="end">{Math.round(h)}</text></g>
        })}
        {/* curve */}
        <path d={path} fill="none" stroke="#2563eb" strokeWidth={2} />
      </svg>
      <div className="mt-2 text-xs text-zinc-700">At eave (~{Math.round(eaveHeight_m*3.28084)} ft): qz ≈ {qAtEave.toFixed(2)} kPa</div>
    </div>
  )
}
