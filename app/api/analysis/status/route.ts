import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl || jobId.startsWith('local-')) {
    // Local fallback: consider analysis done once analysisResults exist
    const projectId = searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId required for local jobs' }, { status: 400 })
    const proj = await prisma.project.findUnique({ where: { id: projectId } })
    const result = (proj?.analysisResults as any) ?? null
    const state = result ? 'completed' : 'queued'
    return NextResponse.json({ jobId, state, progress: result ? 100 : 10, result })
  }

  const { Queue } = await import('bullmq')
  const { default: IORedis } = await import('ioredis')
  const connection = new IORedis(redisUrl)
  const queue = new Queue('analysis', { connection })
  const job = await queue.getJob(jobId)
  if (!job) return NextResponse.json({ jobId, state: 'not_found' }, { status: 404 })
  const state = await job.getState()
  const progress = job.progress ?? null
  const result = job.returnvalue ?? null
  return NextResponse.json({ jobId, state, progress, result })
}
