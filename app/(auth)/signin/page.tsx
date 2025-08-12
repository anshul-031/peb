"use client"
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

export default function SignInPage() {
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get('email') || '')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const callbackUrl = params.get('callbackUrl') || '/app/projects'
  const successMsg = useMemo(() => {
    if (params.get('signup') === '1') return 'Account created. Sign in to continue.'
    if (params.get('reset') === '1') return 'Password updated. Sign in to continue.'
    return ''
  }, [params])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await signIn('credentials', { redirect: false, email, password, callbackUrl })
    setLoading(false)
    if (res?.error) setError('Invalid email or password')
    else window.location.href = callbackUrl
  }

  async function demoLogin() {
    setError(null)
    setLoading(true)
    try {
      const seeded = await fetch('/api/dev/seed', { method: 'POST' }).then(r => r.json())
      const res = await signIn('credentials', { redirect: false, email: seeded.email, password: seeded.password, callbackUrl })
      if (res?.error) setError('Demo sign-in failed')
      else window.location.href = callbackUrl
    } catch {
      setError('Demo sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border bg-white/80 p-8 shadow-sm backdrop-blur">
        <h1 className="text-center text-3xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">Sign in to continue to ApexStruct</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium">Email
            <input className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20" placeholder="you@company.com" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium">Password
            <div className="mt-1 flex items-center gap-2">
              <input className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20" placeholder="••••••••" type={showPass ? 'text' : 'password'} value={password} onChange={e=>setPassword(e.target.value)} required />
              <button type="button" onClick={()=>setShowPass(s=>!s)} className="rounded border px-2 py-1 text-xs">{showPass ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          {successMsg ? <div className="rounded-md bg-green-50 p-2 text-sm text-green-700">{successMsg}</div> : null}
          {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</div>}
          <button disabled={loading} className="w-full rounded-md bg-zinc-900 px-4 py-2 text-white shadow hover:bg-zinc-800 disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
          <button type="button" onClick={demoLogin} disabled={loading} className="w-full rounded-md border px-4 py-2 text-sm hover:border-indigo-300">Explore with demo data</button>
          <div className="flex justify-between text-sm text-zinc-600">
            <a className="underline" href="/signup">Create account</a>
            <a className="underline" href="/reset/request">Forgot password?</a>
          </div>
        </form>
      </div>
    </main>
  )
}
