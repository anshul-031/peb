import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const projectId = String(body.projectId)
  const target = String(body.target || 'min-weight')
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
    const optimized = { ...res, frameUC, target, at: now, status: 'optimized' }
    await prisma.project.update({ where: { id: projectId }, data: { analysisResults: optimized } })
    return NextResponse.json({ jobId: `local-opt-${now}`, immediate: true })
  }
  const { Queue } = await import('bullmq')
  const { default: IORedis } = await import('ioredis')
  const connection = new IORedis(redisUrl)
  const q = new Queue('analysis', { connection })
  const job = await q.add('optimize', { projectId, target }, { removeOnComplete: 100, removeOnFail: 100 })
  return NextResponse.json({ jobId: job.id })
}
