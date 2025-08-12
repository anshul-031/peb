import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import CombosFormBody from '@/components/loads/CombosFormBody'

async function saveCombos(projectId: string, formData: FormData) {
  'use server'
  const raw = String(formData.get('combos') || '')
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const body = { combos: lines }
  await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${projectId}/loads`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  redirect(`/app/projects/${projectId}/loads`)
}

export default async function LoadCombinationsEditor({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return <div className="py-10 text-center">Please sign in.</div>
  const project = await prisma.project.findFirst({
    where: {
      id: params.id,
      OR: [
        { owner: { email: session.user.email } },
        { collaborators: { some: { user: { email: session.user.email } } } },
      ],
    },
    select: { id: true, loadData: true },
  })
  if (!project) return <div className="py-10 text-center">Not found</div>
  const ld = (project.loadData as any) || {}
  let combos = (ld.combos as string[]) || []
  // Support preset via query (?code=ASCE%207-16)
  try {
    const url = new URL(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/load-combinations`)
    url.searchParams.set('designCode', (ld.designCode || 'ASCE 7-16'))
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ designCode: ld.designCode || 'ASCE 7-16' }) })
    const js = await res.json()
    if (Array.isArray(js.combinations) && combos.length === 0) combos = js.combinations
  } catch {}

  return (
    <div>
      <h3 className="text-lg font-semibold">Custom Load Combinations</h3>
  <p className="mt-1 text-sm text-zinc-600">One combination per line, e.g., 1.2D + 1.6L + 0.5S</p>
  <div className="mt-2 text-xs text-zinc-600">Tip: Visit this page after the wizard to auto-fill presets for your selected code.</div>
      <form action={saveCombos.bind(null, project.id)} className="mt-4">
        <CombosFormBody initial={combos} designCode={ld.designCode || 'ASCE 7-16'} />
      </form>
    </div>
  )
}
