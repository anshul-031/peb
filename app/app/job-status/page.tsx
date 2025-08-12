"use client"
import { useEffect, useState } from 'react'

export default function JobStatusPage() {
  const [info, setInfo] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const jobId = sp.get('jobId')
    if (!jobId) {
      setErr('Missing jobId')
      return
    }
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/analysis/status?jobId=${encodeURIComponent(jobId)}`)
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
      <pre className="mt-6 overflow-auto rounded border bg-zinc-50 p-4 text-xs">{JSON.stringify(info, null, 2)}</pre>
    </main>
  )
}
