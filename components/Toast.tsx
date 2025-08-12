"use client"
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = { id: number; text: string; tone?: 'info' | 'warn' | 'error' }
const ToastCtx = createContext<{ push: (t: Omit<Toast,'id'>) => void } | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((t: Omit<Toast,'id'>) => {
    const id = Date.now()
    setItems((prev) => [...prev, { id, ...t }])
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 3500)
  }, [])
  const ctx = useMemo(() => ({ push }), [push])
  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {items.map(i => (
          <div key={i.id} className={`rounded border px-3 py-2 text-sm shadow ${i.tone==='error' ? 'border-red-200 bg-red-50 text-red-700' : i.tone==='warn' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-zinc-200 bg-white text-zinc-800'}`}>{i.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
