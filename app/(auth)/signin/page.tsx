"use client"
import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await signIn('credentials', { redirect: false, email, password })
    setLoading(false)
    if (res?.error) setError('Invalid email or password')
    else window.location.href = '/app/projects'
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-center text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-center text-sm text-zinc-600">Sign in to continue to ApexStruct</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input className="w-full rounded-md border px-3 py-2" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full rounded-md border px-3 py-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button disabled={loading} className="w-full rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
        <div className="flex justify-between text-sm">
          <a className="underline" href="/signup">Create account</a>
          <a className="underline" href="/reset/request">Forgot password?</a>
        </div>
      </form>
    </main>
  )
}
