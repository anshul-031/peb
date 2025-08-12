"use client"
import { useRouter, useSearchParams } from 'next/navigation'

type Dims = { width?: number; length?: number; eaveHeight?: number; roofSlope?: number; bays?: number }

export default function BuildingTree({ dims }: { dims: Dims }) {
  const router = useRouter()
  const sp = useSearchParams()
  const bays = Number(dims.bays || 0) || 4
  const selected = sp.get('sel') || ''
  const selMatch = selected.startsWith('frame:') ? Number(selected.split(':')[1]) : -1

  function selectFrame(i: number) {
    const url = new URL(window.location.href)
    url.searchParams.set('sel', `frame:${i}`)
    const next = url.pathname + url.search
    router.replace(next as any)
  }

  return (
    <div>
      <div className="text-sm font-medium">Building</div>
      <div className="mt-2 text-xs text-zinc-500">Frames</div>
      <ul className="mt-1 space-y-1 text-sm">
        {Array.from({ length: bays }, (_, i) => (
          <li key={i}>
            <button onClick={() => selectFrame(i)} className={`w-full rounded px-2 py-1 text-left hover:bg-zinc-100 ${selMatch===i ? 'bg-zinc-200 font-medium' : ''}`}>Frame {i+1}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
