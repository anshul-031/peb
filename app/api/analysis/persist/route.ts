import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({} as any))
  const { projectId, results, note } = body || {}
  if (!projectId || !results) return NextResponse.json({ error: 'projectId and results required' }, { status: 400 })
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { owner: { email: session.user.email } },
        { collaborators: { some: { user: { email: session.user.email } } } },
      ],
    },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email! }, select: { id: true } })
  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: projectId }, data: { analysisResults: results } })
    const agg = await tx.projectVersion.aggregate({ where: { projectId }, _max: { versionNumber: true } })
    const nextVersion = (agg._max.versionNumber ?? 0) + 1
    const current = await tx.project.findUnique({ where: { id: projectId }, select: { buildingData: true } })
    await tx.projectVersion.create({ data: { projectId, versionNumber: nextVersion, buildingData: current?.buildingData as any, analysisResults: results as any, createdByUserId: user?.id ?? null, notes: note || 'Queued analysis' } })
  })
  try {
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${encodeURIComponent(projectId)}/logs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'info', source: 'api/analysis/persist', message: 'Queued results persisted' })
    }).catch(()=>{})
  } catch {}
  return NextResponse.json({ ok: true })
}
