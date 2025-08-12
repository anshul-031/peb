import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const { Queue } = await import('bullmq')
  const { default: IORedis } = await import('ioredis')
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
  const connection = new IORedis(redisUrl)
  const queue = new Queue('analysis', { connection })
  const job = await queue.getJob(jobId)
  if (!job) return NextResponse.json({ jobId, state: 'not_found' }, { status: 404 })
  const state = await job.getState()
  const progress = job.progress ?? null
  const result = job.returnvalue ?? null
  return NextResponse.json({ jobId, state, progress, result })
}
