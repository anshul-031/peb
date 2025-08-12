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
    setMsg('Account created. You can sign in now.')
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-center text-3xl font-semibold">Create your account</h1>
      <p className="mt-2 text-center text-sm text-zinc-600">Start designing steel buildings in minutes</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input className="w-full rounded-md border px-3 py-2" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
        <input className="w-full rounded-md border px-3 py-2" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full rounded-md border px-3 py-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-green-600">{msg}</div>}
        <button disabled={loading} className="w-full rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-60">{loading ? 'Creating…' : 'Sign up'}</button>
        <div className="text-center text-sm">
          <a className="underline" href="/signin">Already have an account? Sign in</a>
        </div>
      </form>
    </main>
  )
}
