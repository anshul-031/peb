"use client"
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo } from 'react'

type Props = {
  width?: number // m
  length?: number // m
  eaveHeight?: number // m
  roofSlope?: number // 1:x
  bays?: number // count
  ucByFrame?: number[] // utilization per frame index (0..bays-1)
}

function Frame({ span = 10, height = 6, slope = 10, z = 0, color = '#3b82f6' }: { span?: number; height?: number; slope?: number; z?: number; color?: string }) {
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
    <group>
      {nodes.map((n, i) => (
        <mesh key={i} position={[n.position[0], (n.position[1] || 0) + (i < 2 ? n.size[1] / 2 : 0), n.position[2]]}>
          <boxGeometry args={n.size as any} />
          <meshStandardMaterial color={color} />
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

export default function Viewer3D({ width = 10, length = 24, eaveHeight = 6, roofSlope = 10, bays = 4, ucByFrame }: Props) {
  const spacing = length / (bays || 1)
  const zs = useMemo(() => Array.from({ length: bays || 1 }, (_, i) => -length / 2 + i * spacing), [bays, length, spacing])
  return (
    <div className="h-80 w-full overflow-hidden rounded-md border">
      <Canvas camera={{ position: [Math.max(width, 12), Math.max(eaveHeight, 8), Math.max(length / 2, 12)], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        {zs.map((z, i) => {
          const uc = ucByFrame && ucByFrame[i] != null ? ucByFrame[i] : 0.6
          const color = ucToColor(uc)
          return <Frame key={i} span={width} height={eaveHeight} slope={roofSlope} z={z} color={color} />
        })}
        <OrbitControls />
      </Canvas>
    </div>
  )
}
