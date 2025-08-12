"use client"
import { useState } from 'react'

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setLoading(true)
    const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) })
    setLoading(false)
    if (!res.ok) { setErr('Signup failed'); return }
  // Redirect to sign in with prefilled email and success flag
  window.location.href = `/signin?email=${encodeURIComponent(email)}&signup=1`
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border bg-white/80 p-8 shadow-sm backdrop-blur">
        <h1 className="text-center text-3xl font-semibold">Create your account</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">Start designing steel buildings in minutes</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium">Name
            <input className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium">Email
            <input className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20" placeholder="you@company.com" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium">Password
            <input className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20" placeholder="••••••••" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </label>
          {err && <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">{err}</div>}
          {msg && <div className="rounded-md bg-green-50 p-2 text-sm text-green-700">{msg}</div>}
          <button disabled={loading} className="w-full rounded-md bg-zinc-900 px-4 py-2 text-white shadow hover:bg-zinc-800 disabled:opacity-60">{loading ? 'Creating…' : 'Sign up'}</button>
          <div className="text-center text-sm text-zinc-600">
            <a className="underline" href="/signin">Already have an account? Sign in</a>
          </div>
        </form>
      </div>
    </main>
  )
}
