import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const projectId = String(body.projectId || '')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  // Access check (owner or collaborator)
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
  const redisUrl = process.env.REDIS_URL
  let forceLocal = false
  try {
    const p = await prisma.project.findUnique({ where: { id: projectId } })
    const mode = ((p?.buildingData as any)?.settings?.analysisMode) as string | undefined
    if (mode === 'local') forceLocal = true
  } catch {}
  if (!redisUrl || forceLocal) {
    // Local fallback: persist a synthetic modal response
    const now = Date.now()
    const updated = { ...(body?.model ? { model: body.model } : {}), status: 'opensees-local', at: now } as any
    const user = await prisma.user.findUnique({ where: { email: session.user.email! }, select: { id: true } })
    await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id: projectId }, data: { analysisResults: updated } })
      const agg = await tx.projectVersion.aggregate({ where: { projectId }, _max: { versionNumber: true } })
      const nextVersion = (agg._max.versionNumber ?? 0) + 1
      const current = await tx.project.findUnique({ where: { id: projectId }, select: { buildingData: true } })
      await tx.projectVersion.create({ data: { projectId, versionNumber: nextVersion, buildingData: (current?.buildingData as any) ?? null, analysisResults: updated as any, createdByUserId: user?.id ?? null } })
    })
    return NextResponse.json({ jobId: `local-opensees-${now}`, immediate: true })
  }
  const { Queue } = await import('bullmq')
  const { default: IORedis } = await import('ioredis')
  const connection = new IORedis(redisUrl)
  const queue = new Queue('analysis', { connection })
  const job = await queue.add('opensees', { projectId, model: body?.model ?? null }, { removeOnComplete: 100, removeOnFail: 100 })
  return NextResponse.json({ jobId: job.id })
}
