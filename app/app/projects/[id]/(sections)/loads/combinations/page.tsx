import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

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
  const combos = (ld.combos as string[]) || []

  return (
    <div>
      <h3 className="text-lg font-semibold">Custom Load Combinations</h3>
      <p className="mt-1 text-sm text-zinc-600">One combination per line, e.g., 1.2D + 1.6L + 0.5S</p>
      <form action={saveCombos.bind(null, project.id)} className="mt-4">
        <textarea name="combos" defaultValue={combos.join('\n')} className="h-56 w-full rounded border p-2 font-mono text-sm" />
        <div className="mt-3">
          <button className="rounded bg-zinc-900 px-4 py-2 text-white">Save Combos</button>
        </div>
      </form>
    </div>
  )
}
