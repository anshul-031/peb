"use client"
import { useEffect, useState } from 'react'

export default function JobStatusPage() {
  const [info, setInfo] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const jobId = sp.get('jobId')
  const pid = sp.get('projectId')
  setProjectId(pid)
    if (!jobId) {
      setErr('Missing jobId')
      return
    }
    const t = setInterval(async () => {
      try {
    const q = new URLSearchParams({ jobId })
    if (pid) q.set('projectId', pid)
    const res = await fetch(`/api/analysis/status?${q.toString()}`)
        const json = await res.json()
        setInfo(json)
      } catch (e: any) {
        setErr(e?.message || 'Failed to fetch')
      }
    }, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Analysis Job Status</h1>
      {err && <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      {info && (
        <div className="mt-4 rounded border bg-white p-3 text-sm">
          <div><span className="text-zinc-500">Job:</span> <span className="font-mono">{info.jobId}</span></div>
          <div className="mt-1"><span className="text-zinc-500">State:</span> <span className="font-medium">{info.state}</span>{typeof info.progress === 'number' ? <span className="ml-2 text-zinc-500">({info.progress}%)</span> : null}</div>
          {info.state === 'completed' && projectId && (
            (() => {
              const id = String(info.jobId||'')
              const isLocal = id.startsWith('local')
              const isOpt = id.includes('opt')
              const notice = isOpt ? (isLocal ? 'optimize-done-local' : 'optimize-done') : (isLocal ? 'analysis-done-local' : 'analysis-done')
              return <a href={`/app/projects/${projectId}/results?notice=${encodeURIComponent(notice)}`} className="mt-2 inline-block rounded bg-zinc-900 px-3 py-1 text-white hover:bg-zinc-800">View Results</a>
            })()
          )}
        </div>
      )}
      <pre className="mt-6 overflow-auto rounded border bg-zinc-50 p-4 text-xs">{JSON.stringify(info, null, 2)}</pre>
    </main>
  )
}
