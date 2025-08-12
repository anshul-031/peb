import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { Queue } = await import('bullmq')
  const { default: IORedis } = await import('ioredis')
  const connection = new IORedis(process.env.REDIS_URL as string)
  const queue = new Queue('analysis', { connection })
  const body = await req.json()
  const { projectId, options } = body
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const job = await queue.add('run-analysis', { projectId, options })
  return NextResponse.json({ jobId: job.id })
}
