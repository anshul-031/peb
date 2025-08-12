"use client"
import { useCallback, useEffect, useMemo, useState } from 'react'

export type CombosEditorProps = {
  initial: string[]
  designCode?: string
  onSubmit?: () => void
  onValidityChange?: (invalidCount: number) => void
  onTextChange?: (text: string) => void
}

const KNOWN_CODES = [
  'ASCE 7-16',
  'ASCE 7-22',
  'IS 875',
  'EN 1990',
]

function validateCombo(line: string): string | null {
  // Very light validation: must start with a factor (e.g., 1.2) and contain load symbols separated by + or -
  // Allowed tokens: D, L, S, R, W, E, H, F, T, ( )
  const trimmed = line.replace(/\s+/g, ' ').trim()
  if (!trimmed) return 'Empty line'
  if (!/^[-+\d\.\sDLRSWEHFT()]+$/i.test(trimmed)) return 'Contains invalid characters'
  if (!/\d/.test(trimmed)) return 'Missing numeric factor'
  if (!/[DLRSWEHFT]/i.test(trimmed)) return 'Missing load symbol'
  return null
}

export default function CombosEditor({ initial, designCode, onSubmit, onValidityChange, onTextChange }: CombosEditorProps) {
  const [text, setText] = useState(initial.join('\n'))
  const [code, setCode] = useState<string>(designCode || KNOWN_CODES[0])
  const lines = useMemo(() => text.split('\n'), [text])
  const errors = useMemo(() => lines.map(l => validateCombo(l.trim())), [lines])
  const invalidCount = errors.filter(Boolean).length

  const loadPresets = useCallback(async (selected: string) => {
    try {
      const res = await fetch('/api/load-combinations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ designCode: selected }) })
      const js = await res.json()
      if (Array.isArray(js.combinations)) {
        const next = js.combinations.join('\n')
        setText(next)
        onTextChange?.(next)
      }
    } catch {}
  }, [onTextChange])

  function normalize() {
    const norm = lines.map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
    setText(norm)
    onTextChange?.(norm)
  }

  function clearAll() { setText(''); onTextChange?.('') }

  useEffect(() => { if (!text && designCode) { loadPresets(designCode) } }, [designCode, text, loadPresets])
  useEffect(() => { onValidityChange?.(invalidCount) }, [invalidCount, onValidityChange])

  return (
    <div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">Use preset
          <select value={code} onChange={(e)=>setCode(e.target.value)} className="rounded border px-2 py-1">
            {KNOWN_CODES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button type="button" onClick={()=>loadPresets(code)} className="rounded bg-zinc-100 px-3 py-1">Apply</button>
        <button type="button" onClick={normalize} className="rounded bg-zinc-100 px-3 py-1">Normalize</button>
        <button type="button" onClick={clearAll} className="rounded bg-zinc-100 px-3 py-1">Clear</button>
        <span className={`ml-auto text-xs ${invalidCount? 'text-red-600':'text-emerald-600'}`}>{invalidCount? `${invalidCount} invalid line(s)` : 'All lines look OK'}</span>
      </div>
      <div className="mt-2">
        <textarea name="combos" value={text} onChange={(e)=>{ setText(e.target.value); onTextChange?.(e.target.value) }} className="h-56 w-full rounded border p-2 font-mono text-sm" />
      </div>
      {invalidCount>0 && (
        <div className="mt-2 text-xs text-red-600">
          {lines.map((l, i) => errors[i] ? <div key={i}>Line {i+1}: {errors[i]}</div> : null)}
        </div>
      )}
    </div>
  )
}
