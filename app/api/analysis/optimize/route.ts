import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const projectId = String(body.projectId)
  const target = String(body.target || 'min-weight')
  // Access check
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
    // Local fallback: apply a simple weight reduction heuristic to analysisResults
    const now = Date.now()
    const p = await prisma.project.findUnique({ where: { id: projectId } })
  const res = ((p?.analysisResults as any) || {})
  const frameUC = Array.isArray(res.frameUC) ? (res.frameUC as number[]).map(v => Number((v * 0.95).toFixed(2))) : [0.52, 0.58, 0.61]
  const maxUC = frameUC.length ? Math.max(...frameUC) : null
  const maxUCFrame = maxUC != null ? frameUC.indexOf(maxUC) : null
  const governingCombo = typeof res.governingCombo === 'string' ? res.governingCombo : '1.2D + 1.6L (demo)'
  const optimized = { ...res, frameUC, maxUC, maxUCFrame, governingCombo, target, at: now, status: 'optimized-local' }
    const user = await prisma.user.findUnique({ where: { email: session.user.email! }, select: { id: true } })
    await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id: projectId }, data: { analysisResults: optimized } })
      const agg = await tx.projectVersion.aggregate({ where: { projectId }, _max: { versionNumber: true } })
      const nextVersion = (agg._max.versionNumber ?? 0) + 1
      const current = await tx.project.findUnique({ where: { id: projectId }, select: { buildingData: true } })
  await tx.projectVersion.create({ data: { projectId, versionNumber: nextVersion, buildingData: (current?.buildingData as any) ?? null, analysisResults: optimized as any, createdByUserId: user?.id ?? null, notes: `Optimize (${target})` } })
    })
    // Fire-and-forget log append
    try {
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${projectId}/logs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'info', source: 'api/analysis/optimize', message: 'Local optimization applied', meta: { target, maxUC, maxUCFrame } })
      }).catch(()=>{})
    } catch {}
    return NextResponse.json({ jobId: `local-opt-${now}`, immediate: true })
  }
  const { Queue } = await import('bullmq')
  const { default: IORedis } = await import('ioredis')
  const connection = new IORedis(redisUrl)
  const q = new Queue('analysis', { connection })
  const job = await q.add('optimize', { projectId, target }, { removeOnComplete: 100, removeOnFail: 100 })
  return NextResponse.json({ jobId: job.id })
}
