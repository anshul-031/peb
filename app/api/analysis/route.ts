import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, options } = body
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  const redisUrl = process.env.REDIS_URL
  // Check project preference; if analysisMode==='local', force local regardless of REDIS_URL
  let forceLocal = false
  try {
    const p = await prisma.project.findUnique({ where: { id: projectId } })
    const mode = ((p?.buildingData as any)?.settings?.analysisMode) as string | undefined
    if (mode === 'local') forceLocal = true
  } catch {}
  if (!redisUrl || forceLocal) {
    // Fallback: run a quick mock analysis and persist results immediately
    const now = Date.now()
    const jobId = `local-${now}`
    let frameCount = 4
    try {
      const p = await prisma.project.findUnique({ where: { id: projectId } })
      const bays = Number(((p?.buildingData as any)?.dimensions?.bays) ?? 3)
      frameCount = (Number.isFinite(bays) ? bays : 3) + 1
    } catch {}
    const frameUC = Array.from({ length: frameCount }, (_, i) => Number((0.5 + 0.1 * Math.sin(i)).toFixed(2)))
    const diagrams = { M: [0, 10, -5, 15, 0], V: [5, -5, 5, -5, 5], N: [20, 18, 15, 18, 20], deflection: [0, 5, 10, 5, 0] }
    await prisma.project.update({ where: { id: projectId }, data: { analysisResults: { frameUC, diagrams, status: 'done', at: now } as any } })
    return NextResponse.json({ jobId, immediate: true })
  }
  const { Queue } = await import('bullmq')
  const { default: IORedis } = await import('ioredis')
  const connection = new IORedis(redisUrl)
  const queue = new Queue('analysis', { connection })
  const job = await queue.add('run-analysis', { projectId, options })
  return NextResponse.json({ jobId: job.id })
}
