"use client"

export default function ConnectionDetailSVG({ joint }: { joint: any }) {
  const type = joint?.type || 'Base Plate'
  const bolts = joint?.design?.bolts || { count: 8, diameter: 'M20' }
  const plate = joint?.design?.plate || { size: '250 x 350 mm', thickness: '12 mm' }
  // Parse plate size like "250 x 350 mm"
  const sizeText: string = String(plate.size || '')
  const m = sizeText.match(/(\d+)\s*x\s*(\d+)/i)
  const B = m ? Number(m[1]) : 250
  const L = m ? Number(m[2]) : 350
  const tmm = Number(String(plate.thickness || '12').replace(/[^0-9.]/g, '')) || 12

  // Simple base plate plan with 4x2 bolt pattern
  const w = 360, h = 220, pad = 24
  const scale = 1 // 1 px per mm (scaled down by factor)
  const boxW = Math.min(w - 2*pad, B * 0.6)
  const boxL = Math.min(h - 2*pad, L * 0.6)
  const cx = w/2, cy = h/2
  const x0 = cx - boxW/2, y0 = cy - boxL/2
  const boltR = 6
  const boltCols = 2, boltRows = 4
  const bx0 = x0 + 20, bx1 = x0 + boxW - 20
  const byStep = (boxL - 40) / (boltRows - 1)
  const boltPts: [number, number][] = []
  for (let r = 0; r < boltRows; r++) {
    const yy = y0 + 20 + r * byStep
    boltPts.push([bx0, yy], [bx1, yy])
  }

  return (
    <div className="rounded border bg-white p-2">
      <div className="mb-1 text-[11px] text-zinc-600">{type} — Base Plate (schematic)</div>
      <svg width={w} height={h} className="block">
        {/* Plate */}
        <rect x={x0} y={y0} width={boxW} height={boxL} fill="#f8fafc" stroke="#0f172a" />
        {/* Column (hatched) */}
        <rect x={cx - 20} y={y0 + 10} width={40} height={boxL - 20} fill="#e2e8f0" stroke="#475569" />
        {/* Bolts */}
        {boltPts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={boltR} fill="#1e293b" />
        ))}
        {/* Labels */}
        <text x={pad} y={16} fontSize={11} fill="#334155">Plate: {B} x {L} mm · t={tmm} mm · Bolts: {bolts.count}×{bolts.diameter}</text>
      </svg>
    </div>
  )
}
