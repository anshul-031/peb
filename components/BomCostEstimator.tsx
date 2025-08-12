"use client"
import { useMemo, useState } from 'react'

export default function BomCostEstimator({ totalKg, frames }: { totalKg: number; frames: number }) {
  const [rate, setRate] = useState<number>(65) // default cost per kg (your currency)
  const [miscPct, setMiscPct] = useState<number>(10) // paint, bolts, wastage
  const material = useMemo(() => totalKg * rate, [totalKg, rate])
  const misc = useMemo(() => material * (miscPct / 100), [material, miscPct])
  const total = material + misc
  const perFrame = frames > 0 ? total / frames : 0
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="text-sm font-medium">Cost estimator (rough)</div>
      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col">Rate (per kg)
          <input type="number" step="1" value={rate} onChange={e=>setRate(Number(e.target.value))} className="mt-1 rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col">Misc + Wastage (%)
          <input type="number" step="1" value={miscPct} onChange={e=>setMiscPct(Number(e.target.value))} className="mt-1 rounded border px-2 py-1" />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded border p-2"><div className="text-xs text-zinc-500">Steel (kg)</div><div className="font-medium">{totalKg.toFixed(0)}</div></div>
        <div className="rounded border p-2"><div className="text-xs text-zinc-500">Material</div><div className="font-medium">{material.toFixed(0)}</div></div>
        <div className="rounded border p-2"><div className="text-xs text-zinc-500">Misc</div><div className="font-medium">{misc.toFixed(0)}</div></div>
        <div className="rounded border p-2"><div className="text-xs text-zinc-500">Total</div><div className="font-medium">{total.toFixed(0)}</div></div>
        <div className="rounded border p-2 col-span-2"><div className="text-xs text-zinc-500">Per frame</div><div className="font-medium">{perFrame.toFixed(0)}</div></div>
      </div>
      <div className="mt-2 text-[10px] text-zinc-500">Note: This is a coarse estimate. Use your local rates and adjust misc% for paint/bolts/fab/wastage.</div>
    </div>
  )
}
