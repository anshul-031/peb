"use client"
import { useState } from 'react'
import CombosEditor from './CombosEditor'

export default function CombosFormBody({ initial, designCode }: { initial: string[]; designCode?: string }) {
  const [invalid, setInvalid] = useState(0)
  const [text, setText] = useState(initial.join('\n'))
  return (
    <div>
      <CombosEditor initial={initial} designCode={designCode} onValidityChange={setInvalid} onTextChange={setText} />
      <div className="mt-3 flex items-center gap-3">
        <button disabled={invalid>0} className={`rounded px-4 py-2 text-white ${invalid>0? 'bg-zinc-400 cursor-not-allowed':'bg-zinc-900'}`}>Save Combos</button>
        <span className="text-xs text-zinc-500">{invalid>0? `${invalid} issue(s) to fix before saving.` : 'You can apply presets, normalize, and validate before saving.'}</span>
      </div>
    </div>
  )
}
