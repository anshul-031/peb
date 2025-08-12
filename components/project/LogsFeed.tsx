"use client"
import { useEffect, useMemo, useRef, useState } from 'react'

type LogEntry = {
  time: string
  level: 'info' | 'warn' | 'error' | 'debug'
  source: string
  message: string
  meta?: any
}

export default function LogsFeed({ projectId, initialLogs = [] as LogEntry[], pollMs = 5000 }: { projectId: string, initialLogs?: LogEntry[], pollMs?: number }) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs)
  const [level, setLevel] = useState<'' | LogEntry['level']>('')
  const [source, setSource] = useState<string>('')
  const [limit, setLimit] = useState<number>(200)
  const timer = useRef<number | null>(null)

  const sources = useMemo(() => {
    const uniq = new Set<string>()
    logs.forEach(l => uniq.add(l.source))
    return Array.from(uniq).sort()
  }, [logs])

  async function fetchLogs() {
    const params = new URLSearchParams()
    if (limit) params.set('limit', String(limit))
    if (level) params.set('level', level)
    if (source) params.set('source', source)
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/logs?` + params.toString(), { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    setLogs(data.logs || [])
  }

  useEffect(() => {
    // Immediate fetch on filter changes
    fetchLogs()
    // Clear any existing interval
    if (timer.current) window.clearInterval(timer.current)
    // Polling
    timer.current = window.setInterval(fetchLogs, pollMs) as unknown as number
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, source, limit, projectId, pollMs])

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          <div className="text-[11px] text-zinc-500">Level</div>
          <select value={level} onChange={e => setLevel(e.target.value as any)} className="mt-0.5 rounded border px-2 py-1 text-sm">
            <option value="">All</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
            <option value="debug">debug</option>
          </select>
        </label>
        <label className="text-xs">
          <div className="text-[11px] text-zinc-500">Source</div>
          <select value={source} onChange={e => setSource(e.target.value)} className="mt-0.5 min-w-[14ch] rounded border px-2 py-1 text-sm">
            <option value="">All</option>
            {sources.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <div className="text-[11px] text-zinc-500">Limit</div>
          <input type="number" min={50} step={50} value={limit} onChange={e => setLimit(Number(e.target.value) || 200)} className="mt-0.5 w-24 rounded border px-2 py-1 text-sm" />
        </label>
        <button onClick={fetchLogs} className="ml-auto rounded border px-2 py-1 text-sm">Refresh</button>
      </div>
      <ul className="mt-3 space-y-2 text-xs">
        {logs.length === 0 && <li className="rounded border bg-white p-3">No logs yet.</li>}
        {logs.slice().reverse().map((l, i) => (
          <li key={i} className="rounded border bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[11px] text-zinc-600">{l.time}</div>
              <div className={`rounded px-1 py-0.5 text-[10px] ${l.level==='error'?'bg-red-100 text-red-800':l.level==='warn'?'bg-amber-100 text-amber-800':l.level==='debug'?'bg-zinc-100 text-zinc-800':'bg-emerald-100 text-emerald-800'}`}>{l.level}</div>
            </div>
            <div className="mt-1 font-medium">{l.source}</div>
            <div className="text-zinc-700">{l.message}</div>
            {l.meta && <pre className="mt-1 overflow-auto rounded bg-zinc-50 p-2">{JSON.stringify(l.meta, null, 2)}</pre>}
          </li>
        ))}
      </ul>
    </div>
  )
}
