"use client"
import { useState } from 'react'

export default function ResetRequestPage() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    const res = await fetch('/api/auth/reset/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    setLoading(false)
    const json = await res.json()
    setMsg(json.resetUrl ? `Reset link: ${json.resetUrl}` : 'If that email exists, a reset link was sent.')
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border bg-white/80 p-8 shadow-sm backdrop-blur">
        <h1 className="text-center text-3xl font-semibold">Reset your password</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">Enter your email to receive a reset link</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium">Email
            <input className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20" placeholder="you@company.com" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </label>
          <button disabled={loading} className="w-full rounded-md bg-zinc-900 px-4 py-2 text-white shadow hover:bg-zinc-800 disabled:opacity-60">{loading ? 'Sending…' : 'Send reset link'}</button>
          {msg && <div className="rounded-md bg-green-50 p-2 text-sm text-green-700">{msg}</div>}
        </form>
      </div>
    </main>
  )
}
