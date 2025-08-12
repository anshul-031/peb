import { NextRequest, NextResponse } from 'next/server'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = typeof process !== 'undefined' && process.env.REDIS_URL ? new IORedis(process.env.REDIS_URL) : undefined

export async function POST(req: NextRequest) {
  const body = await req.json()
  const projectId = String(body.projectId)
  const target = String(body.target || 'min-weight')
  if (!connection) return NextResponse.json({ error: 'Queue not available' }, { status: 500 })
  const q = new Queue('analysis', { connection })
  const job = await q.add('optimize', { projectId, target }, { removeOnComplete: 100, removeOnFail: 100 })
  return NextResponse.json({ jobId: job.id })
}
