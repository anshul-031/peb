import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

async function createProject(formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    // Require sign-in to create projects
    return
  }
  const name = String(formData.get('name') || '')
  const buildingType = (formData.get('buildingType') as string) || 'PEB'
  const clientName = String(formData.get('clientName') || '')
  if (!name) return
  const owner = await prisma.user.upsert({ where: { email: session.user.email! }, update: {}, create: { email: session.user.email!, name: session.user.name || null } })
  await prisma.project.create({
  data: { projectName: name, clientName, ownerId: owner.id, designCode: 'AISC 360-16', unitSystem: 'Metric', buildingType: buildingType as any },
  })
  revalidatePath('/app/projects')
}

async function duplicateProject(id: string) {
  'use server'
  const p = await prisma.project.findUnique({ where: { id } })
  if (!p) return
  const copy = await prisma.project.create({
    data: {
      ownerId: p.ownerId,
      projectName: `${p.projectName} (Copy)`,
      designCode: p.designCode,
      unitSystem: p.unitSystem,
  buildingData: p.buildingData as any,
  loadData: p.loadData as any,
  analysisResults: p.analysisResults as any,
  connectionDesigns: p.connectionDesigns as any,
  foundationDesigns: p.foundationDesigns as any,
    },
  })
  revalidatePath('/app/projects')
}

export default async function ProjectsPage({ searchParams }: { searchParams?: { q?: string, status?: string, client?: string } }) {
  const session = await getServerSession(authOptions)
  const q = searchParams?.q?.toLowerCase() || ''
  const status = searchParams?.status as any
  const client = searchParams?.client || ''
  const where: any = {}
  if (q) where.OR = [{ projectName: { contains: q, mode: 'insensitive' } }, { designCode: { contains: q, mode: 'insensitive' } }]
  if (status) where.status = status
  if (client) where.clientName = { contains: client, mode: 'insensitive' }
  // Scope to user if signed in
  if (session?.user?.email) {
    where.OR = [
      ...(where.OR || []),
      { owner: { email: session.user.email } },
      { collaborators: { some: { user: { email: session.user.email } } } },
    ]
  }
  const projects = await prisma.project.findMany({ where: Object.keys(where).length ? where : undefined, orderBy: { createdAt: 'desc' } })
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <form className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
        <input name="q" placeholder="Search by name or code" defaultValue={q} className="rounded border px-3 py-2 w-full" />
        <input name="client" placeholder="Client" defaultValue={client} className="rounded border px-3 py-2 w-full" />
        <select name="status" defaultValue={status || ''} className="rounded border px-3 py-2">
          <option value="">All</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <button className="rounded border px-3">Filter</button>
      </form>

      {session?.user?.email ? (
        <form action={createProject} className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input name="name" placeholder="New project name" className="rounded border px-3 py-2" />
          <input name="clientName" placeholder="Client" className="rounded border px-3 py-2" />
          <select name="buildingType" className="rounded border px-3 py-2">
            <option value="PEB">PEB</option>
            <option value="LGS">LGS</option>
          </select>
          <button type="submit" className="rounded bg-zinc-900 px-4 py-2 text-white">Create</button>
        </form>
      ) : (
        <div className="mt-6 text-sm">
          <Link href="/signin" className="underline">Sign in</Link> to create and manage projects.
        </div>
      )}

  <ul className="mt-8 space-y-2">
        {projects.map((p: any) => (
          <li key={p.id} className="rounded border p-3">
            <a href={`/app/projects/${p.id}`} className="font-medium hover:underline">{p.projectName}</a>
    <div className="text-xs text-zinc-600">{p.designCode} · {p.unitSystem} · {p.clientName || '—'}</div>
            <form action={duplicateProject.bind(null, p.id)} className="mt-2">
              <button className="text-xs underline">Duplicate</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  )
}
