"use client"
import { useState } from 'react'

export default function ResetPage({ params }: { params: { token: string } }) {
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    setLoading(true)
    const res = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: params.token, password }) })
    setLoading(false)
    if (!res.ok) { setErr('Reset failed'); return }
    setMsg('Password updated. You can sign in now.')
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-center text-3xl font-semibold">Set a new password</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input className="w-full rounded-md border px-3 py-2" placeholder="New password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-green-600">{msg}</div>}
        <button disabled={loading} className="w-full rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-60">{loading ? 'Updating…' : 'Update password'}</button>
      </form>
    </main>
  )
}
