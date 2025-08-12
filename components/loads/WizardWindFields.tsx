"use client"
import { useState } from 'react'
import QzPreview from './QzPreview'

type Props = {
  defaults?: {
    windSpeed?: number
    exposure?: 'B'|'C'|'D'
    importance?: number
    directionality?: number
    topography?: number
    eaveHeight_m?: number
  }
}

export default function WizardWindFields({ defaults }: Props) {
  const [windSpeed, setWindSpeed] = useState<number>(defaults?.windSpeed ?? 90)
  const [exposure, setExposure] = useState<'B'|'C'|'D'>((defaults?.exposure as any) ?? 'C')
  const [importance, setImportance] = useState<number>(defaults?.importance ?? 1.0)
  const [directionality, setDirectionality] = useState<number>(defaults?.directionality ?? 0.85)
  const [topography, setTopography] = useState<number>(defaults?.topography ?? 1.0)
  const eaveHeight_m = defaults?.eaveHeight_m ?? 6

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="flex flex-col text-sm">Basic wind speed (mph)
        <input name="windSpeed" type="number" step="1" value={windSpeed} onChange={e=>setWindSpeed(Number(e.target.value))} className="mt-1 rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col text-sm">Exposure
        <select name="exposure" value={exposure} onChange={e=>setExposure(e.target.value as any)} className="mt-1 rounded border px-2 py-1">
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </label>
      <label className="flex flex-col text-sm">Importance I
        <input name="importance" type="number" step="0.05" value={importance} onChange={e=>setImportance(Number(e.target.value))} className="mt-1 rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col text-sm">Directionality Kd
        <input name="directionality" type="number" step="0.05" value={directionality} onChange={e=>setDirectionality(Number(e.target.value))} className="mt-1 rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col text-sm">Topography Ke
        <input name="topography" type="number" step="0.05" value={topography} onChange={e=>setTopography(Number(e.target.value))} className="mt-1 rounded border px-2 py-1" />
      </label>
      <div className="col-span-2">
        <QzPreview windSpeed={windSpeed} exposure={exposure} importance={importance} directionality={directionality} topography={topography} eaveHeight_m={eaveHeight_m} />
      </div>
    </div>
  )
}
