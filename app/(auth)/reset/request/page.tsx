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
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-center text-3xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-center text-sm text-zinc-600">Enter your email to receive a reset link</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input className="w-full rounded-md border px-3 py-2" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <button disabled={loading} className="w-full rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-60">{loading ? 'Sending…' : 'Send reset link'}</button>
        {msg && <div className="text-sm text-green-600">{msg}</div>}
      </form>
    </main>
  )
}
