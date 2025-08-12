"use client"

export default function FoundationDetailSVG({ data }: { data: any }) {
  const sizeText: string = String(data?.footingSize || '1.2 x 1.2 x 0.6 m')
  const m = sizeText.match(/([0-9.]+)\s*x\s*([0-9.]+)\s*x\s*([0-9.]+)/i)
  const B = m ? Number(m[1]) : 1.2
  const L = m ? Number(m[2]) : 1.2
  const D = m ? Number(m[3]) : 0.6

  const w = 360, h = 220
  const pad = 24
  const scale = 100 // m → px scale for schematic
  const bx = w/2 - (B*scale)/2
  const by = h/2 - (L*scale)/2

  return (
    <div className="rounded border bg-white p-2">
      <div className="mb-1 text-[11px] text-zinc-600">Footing — Plan & Section (schematic)</div>
      <svg width={w} height={h} className="block">
        {/* Plan (top-left) */}
        <rect x={bx} y={by} width={B*scale} height={L*scale} fill="#f8fafc" stroke="#0f172a" />
        {/* Section (right side) */}
        <g transform={`translate(${w - pad - 120}, ${pad})`}>
          <rect x={0} y={0} width={120} height={D*scale} fill="#e2e8f0" stroke="#475569" />
          {/* Ground line */}
          <line x1={-20} y1={0} x2={140} y2={0} stroke="#0f172a" strokeDasharray="4 3" />
          {/* Depth label */}
          <line x1={-10} y1={0} x2={-10} y2={D*scale} stroke="#0f172a" />
          <text x={-30} y={(D*scale)/2} fontSize={11} fill="#334155" transform={`rotate(-90, ${-30}, ${(D*scale)/2})`}>D = {D.toFixed(2)} m</text>
        </g>
        <text x={pad} y={16} fontSize={11} fill="#334155">Size: {B.toFixed(2)} x {L.toFixed(2)} x {D.toFixed(2)} m · qAllow: {(data?.qAllow ?? '—')} kPa</text>
      </svg>
    </div>
  )
}
