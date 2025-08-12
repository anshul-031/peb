"use client"
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useCallback, useEffect, useRef } from 'react'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Props = {
  width?: number // m
  length?: number // m
  eaveHeight?: number // m
  roofSlope?: number // 1:x
  bays?: number // count
  ucByFrame?: number[] // utilization per frame index (0..bays-1)
  openings?: {
    doors?: { w: number; h: number; z: number }[]
    windows?: { w: number; h: number; sill: number; z: number }[]
  }
}

function Frame({ span = 10, height = 6, slope = 10, z = 0, color = '#3b82f6', selected = false, clippingPlanes, onClick }: { span?: number; height?: number; slope?: number; z?: number; color?: string; selected?: boolean; clippingPlanes?: THREE.Plane[]; onClick?: () => void }) {
  // Very simplified: two columns and a straight rafter approximating roof slope
  const half = span / 2
  const ridgeY = height + span / slope / 2 // rough ridge elevation from slope
  const nodes = useMemo(() => {
    return [
      { position: [-half, 0, z], size: [0.2, height, 0.2] },
      { position: [half, 0, z], size: [0.2, height, 0.2] },
      { position: [0, ridgeY, z], size: [span + 0.5, 0.2, 0.2] },
    ]
  }, [half, height, ridgeY, span, z])
  return (
    <group scale={selected ? 1.03 : 1} onClick={onClick}>
      {nodes.map((n, i) => (
        <mesh key={i} position={[n.position[0], (n.position[1] || 0) + (i < 2 ? n.size[1] / 2 : 0), n.position[2]]}>
          <boxGeometry args={n.size as any} />
          <meshStandardMaterial color={selected ? '#111827' : color} clippingPlanes={clippingPlanes} clipShadows />
        </mesh>
      ))}
    </group>
  )
}

function ucToColor(uc: number): string {
  if (uc <= 0.8) return '#10b981' // green
  if (uc <= 1.0) return '#f59e0b' // amber
  return '#ef4444' // red
}

export default function Viewer3D({ width = 10, length = 24, eaveHeight = 6, roofSlope = 10, bays = 4, ucByFrame, openings }: Props) {
  const spacing = length / (bays || 1)
  const zs = useMemo(() => Array.from({ length: bays || 1 }, (_, i) => -length / 2 + i * spacing), [bays, length, spacing])
  const [ortho, setOrtho] = useState(false)
  const sp = useSearchParams()
  const router = useRouter()
  const sel = sp.get('sel') || ''
  const selIndex = sel.startsWith('frame:') ? Number(sel.split(':')[1]) : -1
  const cut = sp.get('cut') === '1'
  const cutzParam = sp.get('cutz')
  const cutz = cutzParam != null ? Number(cutzParam) : undefined
  const cutxParam = sp.get('cutx')
  const cutx = cutxParam != null ? Number(cutxParam) : undefined
  const cutyParam = sp.get('cuty')
  const cuty = cutyParam != null ? Number(cutyParam) : undefined
  const [measure, setMeasure] = useState<{ a?: [number, number, number]; b?: [number, number, number] }>({})
  const [measureMode, setMeasureMode] = useState(false)
  const [hoverSnap, setHoverSnap] = useState<[number, number, number] | undefined>(undefined)
  const [snapMode, setSnapMode] = useState<'end'|'mid'|'none'>('end')
  const controls = useRef<any>(null)
  const focusSelected = useCallback(() => {
    if (selIndex < 0 || !controls.current) return
    const z = zs[selIndex] || 0
    controls.current.target.set(0, Math.max(eaveHeight, 4), z)
    controls.current.update()
  }, [selIndex, zs, eaveHeight])
  const setView = useCallback((view: 'top'|'front'|'side') => {
    if (!controls.current) return
    const cam = controls.current.object
    const dist = Math.max(width, length, 12)
    if (view === 'top') {
      cam.position.set(0, Math.max(eaveHeight*2, dist), 0)
      controls.current.target.set(0, 0, 0)
    } else if (view === 'front') {
      cam.position.set(0, Math.max(eaveHeight, 6), Math.max(length/2, dist/2))
      controls.current.target.set(0, Math.max(eaveHeight/2, 3), 0)
    } else if (view === 'side') {
      cam.position.set(Math.max(width, dist/2), Math.max(eaveHeight, 6), 0)
      controls.current.target.set(0, Math.max(eaveHeight/2, 3), 0)
    }
    controls.current.update()
  }, [width, length, eaveHeight])

  const toggleCut = useCallback(() => {
    const url = new URL(window.location.href)
    if (cut) url.searchParams.delete('cut')
    else url.searchParams.set('cut', '1')
    const next = url.pathname + url.search
    router.replace(next as any)
  }, [cut, router])
  const togglePlane = useCallback(() => {
    const url = new URL(window.location.href)
    if (cutzParam != null) url.searchParams.delete('cutz')
    else {
      // default to selected frame z or mid
      const zDefault = selIndex >= 0 ? zs[selIndex] : (zs.length ? zs[Math.floor(zs.length/2)] : 0)
      url.searchParams.set('cutz', String(zDefault.toFixed(3)))
    }
    const next = url.pathname + url.search
    router.replace(next as any)
  }, [cutzParam, selIndex, zs, router])
  const updatePlane = useCallback((value: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('cutz', String(value))
    const next = url.pathname + url.search
    router.replace(next as any)
  }, [router])
  const selectFrame = useCallback((index: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('sel', `frame:${index}`)
    const next = url.pathname + url.search
    router.replace(next as any)
  }, [router])
  const togglePlaneX = useCallback(() => {
    const url = new URL(window.location.href)
    if (cutxParam != null) url.searchParams.delete('cutx')
    else url.searchParams.set('cutx', String(0))
    const next = url.pathname + url.search
    router.replace(next as any)
  }, [cutxParam, router])
  const togglePlaneY = useCallback(() => {
    const url = new URL(window.location.href)
    if (cutyParam != null) url.searchParams.delete('cuty')
    else url.searchParams.set('cuty', String(Math.max(eaveHeight/2, 3)))
    const next = url.pathname + url.search
    router.replace(next as any)
  }, [cutyParam, eaveHeight, router])
  const updatePlaneX = useCallback((value: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('cutx', String(value))
    const next = url.pathname + url.search
    router.replace(next as any)
  }, [router])
  const updatePlaneY = useCallback((value: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('cuty', String(value))
    const next = url.pathname + url.search
    router.replace(next as any)
  }, [router])
  const clippingPlanes = useMemo(() => {
    const planes: THREE.Plane[] = []
    if (cutxParam != null) planes.push(new THREE.Plane(new THREE.Vector3(1,0,0), -(cutx ?? 0)))
    if (cutyParam != null) planes.push(new THREE.Plane(new THREE.Vector3(0,1,0), -(cuty ?? 0)))
    if (cutzParam != null) planes.push(new THREE.Plane(new THREE.Vector3(0,0,1), -(cutz ?? 0)))
    return planes
  }, [cutxParam, cutx, cutyParam, cuty, cutzParam, cutz])
  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if (k === 'f') { e.preventDefault(); focusSelected() }
      else if (k === 'm') { e.preventDefault(); setMeasureMode(m => !m); setMeasure({}) }
      else if (k === 'c') { e.preventDefault(); toggleCut() }
      else if (k === 'p') { e.preventDefault(); togglePlane() }
  else if (k === 'r') { e.preventDefault(); location.reload() }
  else if (k === 's') { e.preventDefault(); setSnapMode(m => m === 'end' ? 'mid' : m === 'mid' ? 'none' : 'end') }
      else if (k === '1') { e.preventDefault(); setView('top') }
      else if (k === '2') { e.preventDefault(); setView('front') }
      else if (k === '3') { e.preventDefault(); setView('side') }
      else if (k === 'x') { e.preventDefault(); togglePlaneX() }
      else if (k === 'y') { e.preventDefault(); togglePlaneY() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusSelected, toggleCut, togglePlane, setView, togglePlaneX, togglePlaneY])
  return (
    <div className="h-80 w-full overflow-hidden rounded-md border relative">
      <div className="pointer-events-auto absolute right-2 top-2 z-10 flex gap-2">
           <button onClick={() => setOrtho((o: boolean) => !o)} className="rounded bg-white/90 px-2 py-1 text-xs shadow">{ortho ? 'Perspective' : 'Orthographic'}</button>
        <button onClick={toggleCut} className={`rounded px-2 py-1 text-xs shadow ${cut ? 'bg-zinc-900 text-white' : 'bg-white/90'}`}>{cut ? 'Cut: On' : 'Cut: Off'}</button>
        <button onClick={togglePlane} className={`rounded px-2 py-1 text-xs shadow ${cutzParam != null ? 'bg-blue-600 text-white' : 'bg-white/90'}`}>{cutzParam != null ? 'Plane: On' : 'Plane'}</button>
        <button onClick={togglePlaneX} className={`rounded px-2 py-1 text-xs shadow ${cutxParam != null ? 'bg-blue-600 text-white' : 'bg-white/90'}`}>Plane X</button>
        <button onClick={togglePlaneY} className={`rounded px-2 py-1 text-xs shadow ${cutyParam != null ? 'bg-blue-600 text-white' : 'bg-white/90'}`}>Plane Y</button>
  <button onClick={focusSelected} className="rounded bg-white/90 px-2 py-1 text-xs shadow">Focus</button>
  <button onClick={() => { setMeasureMode(m => !m); setMeasure({}) }} className={`rounded px-2 py-1 text-xs shadow ${measureMode ? 'bg-emerald-600 text-white' : 'bg-white/90'}`}>{measureMode ? 'Measure: On' : 'Measure'}</button>
  <button onClick={() => setSnapMode(m => m === 'end' ? 'mid' : m === 'mid' ? 'none' : 'end')} className={`rounded px-2 py-1 text-xs shadow ${snapMode!=='none' ? 'bg-white/90' : 'bg-white/60'}`}>Snap: {snapMode==='end' ? 'End' : snapMode==='mid' ? 'Mid' : 'Off'}</button>
        <button onClick={() => location.reload()} className="rounded bg-white/90 px-2 py-1 text-xs shadow">Reset</button>
        <div className="ml-2 hidden sm:flex items-center gap-1 text-xs text-zinc-700">
          <span>Views:</span>
          <button onClick={() => setView('top')} className="rounded bg-white/90 px-1 py-0.5 shadow">Top</button>
          <button onClick={() => setView('front')} className="rounded bg-white/90 px-1 py-0.5 shadow">Front</button>
          <button onClick={() => setView('side')} className="rounded bg-white/90 px-1 py-0.5 shadow">Side</button>
        </div>
      </div>
      {cutzParam != null && (
        <div className="pointer-events-auto absolute left-2 top-2 z-10 rounded bg-white/90 px-2 py-1 text-xs shadow">
          <div className="mb-1 font-medium">Section plane Z</div>
          <input type="range" min={(-length/2).toFixed(2)} max={(length/2).toFixed(2)} step="0.1" value={String(cutz ?? 0)} onChange={(e) => updatePlane(Number((e.target as HTMLInputElement).value))} />
          <div className="mt-1 text-right text-[10px] text-zinc-700">{(cutz ?? 0).toFixed(2)} m</div>
        </div>
      )}
      {cutxParam != null && (
        <div className="pointer-events-auto absolute left-2 top-20 z-10 rounded bg-white/90 px-2 py-1 text-xs shadow">
          <div className="mb-1 font-medium">Section plane X</div>
          <input type="range" min={(-width/2).toFixed(2)} max={(width/2).toFixed(2)} step="0.1" value={String(cutx ?? 0)} onChange={(e) => updatePlaneX(Number((e.target as HTMLInputElement).value))} />
          <div className="mt-1 text-right text-[10px] text-zinc-700">{(cutx ?? 0).toFixed(2)} m</div>
        </div>
      )}
      {cutyParam != null && (
        <div className="pointer-events-auto absolute left-2 top-36 z-10 rounded bg-white/90 px-2 py-1 text-xs shadow">
          <div className="mb-1 font-medium">Section plane Y</div>
          <input type="range" min={0} max={Math.max(eaveHeight, 10)} step="0.1" value={String(cuty ?? 0)} onChange={(e) => updatePlaneY(Number((e.target as HTMLInputElement).value))} />
          <div className="mt-1 text-right text-[10px] text-zinc-700">{(cuty ?? 0).toFixed(2)} m</div>
        </div>
      )}
      {/* UC Legend */}
      <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-md bg-white/90 p-2 text-[10px] shadow">
        <div className="mb-1 font-medium">UC Legend</div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-28 bg-gradient-to-r from-green-500 via-yellow-400 to-red-500" />
          <div className="flex gap-3 text-zinc-700">
            <span>0.0</span>
            <span>0.5</span>
            <span>1.0+</span>
          </div>
        </div>
      </div>
      {/* Dimensions Overlay */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-md bg-white/90 p-2 text-[10px] shadow">
        <div className="font-medium">Dimensions</div>
        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-zinc-700">
          <div>Frames</div><div className="text-right">{bays}</div>
          <div>Bay spacing</div><div className="text-right">{spacing.toFixed(2)} m</div>
          <div>Total length</div><div className="text-right">{length.toFixed(2)} m</div>
          <div>Width (span)</div><div className="text-right">{width.toFixed(2)} m</div>
          {selIndex >= 0 && <><div>Selected</div><div className="text-right">Frame {selIndex + 1}</div></>}
        </div>
      </div>
      {/* UC overlay */}
      {Array.isArray(ucByFrame) && ucByFrame.length > 0 && (
        <div className="pointer-events-none absolute left-1/2 bottom-2 z-10 -translate-x-1/2 rounded-md bg-white/90 p-2 text-[10px] shadow">
          <div className="mb-1 font-medium">Frame UC</div>
          <div className="flex flex-wrap gap-1 max-w-[360px]">
            {ucByFrame.map((v, i) => (
              <span key={i} className={`rounded px-1 py-0.5 ${i===selIndex ? 'bg-zinc-900 text-white' : 'bg-zinc-100'}`}>F{i+1}:{v.toFixed(2)}</span>
            ))}
          </div>
        </div>
      )}
  <Canvas gl={{ localClippingEnabled: true }} onPointerMove={(e: any) => {
        if (!measureMode) return
        const ray = e.ray
        if (!ray) return
        const t = -ray.origin.y / ray.direction.y
        const x = ray.origin.x + ray.direction.x * t
        const z = ray.origin.z + ray.direction.z * t
        if (snapMode !== 'none') {
          // gather simple snap points from frame nodes (column bases/tops and ridge)
          const half = width / 2
          const ridgeY = eaveHeight + width / roofSlope / 2
          const pts: [number, number, number][] = []
          zs.forEach((zz) => {
            // endpoints
            pts.push([-half, 0, zz], [-half, eaveHeight, zz], [half, 0, zz], [half, eaveHeight, zz])
            // midpoints if enabled
            if (snapMode === 'mid') {
              pts.push([0, eaveHeight/2, zz]) // column mid between bases and tops (simplified)
            }
            // ridge
            pts.push([0, ridgeY, zz])
          })
          let best: [number, number, number] | undefined
          let bestD = Infinity
          for (const p of pts) {
            const d = Math.hypot(p[0] - x, p[2] - z)
            if (d < bestD) { bestD = d; best = p }
          }
          if (best && bestD <= 0.6) setHoverSnap(best)
          else setHoverSnap(undefined)
        } else {
          setHoverSnap(undefined)
        }
      }} onPointerDown={(e: any) => {
        if (!measureMode) return
        // place points on ground plane (y=0) using ray
        const ray = e.ray
        if (!ray) return
        const t = -ray.origin.y / ray.direction.y
        const x = ray.origin.x + ray.direction.x * t
        const z = ray.origin.z + ray.direction.z * t
        const chosen: [number, number, number] = hoverSnap ? hoverSnap : [x, 0, z]
        if (!measure.a) setMeasure({ a: chosen })
        else if (!measure.b) setMeasure({ a: measure.a, b: chosen })
        else setMeasure({ a: chosen, b: undefined })
      }}>
        {ortho ? (
          <OrthographicCamera makeDefault position={[Math.max(width, 12), Math.max(eaveHeight, 8), Math.max(length / 2, 12)]} zoom={40} />
        ) : (
          <PerspectiveCamera makeDefault position={[Math.max(width, 12), Math.max(eaveHeight, 8), Math.max(length / 2, 12)]} fov={50} />
        )}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        {/* Ground grid for context */}
        <gridHelper args={[Math.max(length * 1.2, width * 2), Math.max(8, (bays || 1) * 2)]} position={[0, 0, 0]} />
        {zs.map((z, i) => {
          if (cutzParam != null && (z > (cutz ?? 0))) return null
          if (cutzParam == null && cut && selIndex >= 0 && i > selIndex) return null
          const uc = ucByFrame && ucByFrame[i] != null ? ucByFrame[i] : 0.6
          const color = ucToColor(uc)
          return <Frame key={i} span={width} height={eaveHeight} slope={roofSlope} z={z} color={color} selected={i===selIndex} clippingPlanes={clippingPlanes} onClick={() => selectFrame(i)} />
        })}
        {/* section plane visuals */}
        {cutzParam != null && (
          <mesh position={[0, eaveHeight/2, cutz ?? 0]}>
            <boxGeometry args={[width * 1.2, eaveHeight * 1.05, 0.02]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.2} />
          </mesh>
        )}
        {cutxParam != null && (
          <mesh position={[cutx ?? 0, eaveHeight/2, 0]}>
            <boxGeometry args={[0.02, eaveHeight * 1.05, length * 1.2]} />
            <meshStandardMaterial color="#6366f1" transparent opacity={0.2} />
          </mesh>
        )}
        {cutyParam != null && (
          <mesh position={[0, cuty ?? 0, 0]}>
            <boxGeometry args={[width * 1.2, 0.02, length * 1.2]} />
            <meshStandardMaterial color="#22c55e" transparent opacity={0.2} />
          </mesh>
        )}
        {/* Openings on left wall (x = -width/2) */}
        {Array.isArray(openings?.doors) && openings!.doors!.map((d, i) => {
          const w = Math.max(0.3, Number(d.w) || 0)
          const h = Math.max(0.3, Number(d.h) || 0)
          // center at z, clamp within length
          const zc = Math.min(length/2 - w/2, Math.max(-length/2 + w/2, Number(d.z) || 0))
          if (cutzParam != null && (zc > (cutz ?? 0))) return null
          const y = h/2
          return (
            <mesh key={`door-${i}`} position={[-width/2 + 0.02, y, zc]}>
              <boxGeometry args={[0.04, h, w]} />
              <meshStandardMaterial color="#60a5fa" transparent opacity={0.4} clippingPlanes={clippingPlanes} />
            </mesh>
          )
        })}
        {Array.isArray(openings?.windows) && openings!.windows!.map((win, i) => {
          const w = Math.max(0.3, Number(win.w) || 0)
          const h = Math.max(0.3, Number(win.h) || 0)
          const sill = Math.max(0, Number(win.sill) || 0)
          const zc = Math.min(length/2 - w/2, Math.max(-length/2 + w/2, Number(win.z) || 0))
          if (cutzParam != null && (zc > (cutz ?? 0))) return null
          const y = sill + h/2
          return (
            <mesh key={`win-${i}`} position={[-width/2 + 0.02, y, zc]}>
              <boxGeometry args={[0.04, h, w]} />
              <meshStandardMaterial color="#22d3ee" transparent opacity={0.45} clippingPlanes={clippingPlanes} />
            </mesh>
          )
        })}
        {/* measurement markers */}
        {measure.a && (
          <mesh position={measure.a}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#10b981" />
          </mesh>
        )}
        {measure.b && (
          <mesh position={measure.b}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        )}
        {measure.a && measure.b && (
          <mesh>
            {(() => {
              const ax = measure.a![0], ay = measure.a![1], az = measure.a![2]
              const bx = measure.b![0], by = measure.b![1], bz = measure.b![2]
              const len = Math.hypot(bx-ax, by-ay, bz-az)
              // Draw a thin cylinder from A to B
              // Position at midpoint
              const mx = (ax+bx)/2, my=(ay+by)/2, mz=(az+bz)/2
              // Direction vector
              const dx = bx-ax, dy=by-ay, dz=bz-az
              const dir = new THREE.Vector3(dx, dy, dz).normalize()
              const up = new THREE.Vector3(0,1,0)
              const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)
              return (
                <group position={[mx,my,mz]} quaternion={quat as any}>
                  <cylinderGeometry args={[0.03, 0.03, len, 8]} />
                  <meshStandardMaterial color="#0ea5e9" />
                </group>
              )
            })()}
          </mesh>
        )}
        {measureMode && hoverSnap && (
          <mesh position={hoverSnap}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        )}
  <OrbitControls ref={controls} />
      </Canvas>
      {measure.a && measure.b && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded bg-white/90 px-2 py-1 text-xs shadow">
          {(() => {
            const dx = measure.b![0]-measure.a![0]
            const dy = measure.b![1]-measure.a![1]
            const dz = measure.b![2]-measure.a![2]
            const plan = Math.hypot(dx, dz)
            const d3 = Math.hypot(dx, dy, dz)
            return `Distance: ${plan.toFixed(2)} m (plan) · ${d3.toFixed(2)} m (3D)`
          })()}
        </div>
      )}
      {/* Shortcuts help */}
      <div className="pointer-events-none absolute right-2 bottom-2 z-10 rounded bg-white/80 px-2 py-1 text-[10px] shadow">
        F: Focus · 1/2/3: Top/Front/Side · M: Measure · S: Snap · C: Cut · P: Z Plane · X/Y: X/Y Plane · R: Reset
      </div>
    </div>
  )
}
