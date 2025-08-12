import { Worker, QueueEvents, Job } from 'bullmq'
import IORedis from 'ioredis'

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  console.error('[worker] REDIS_URL not set. Exiting.')
  process.exit(1)
}

const connection = new IORedis(redisUrl)

const worker = new Worker('analysis', async (job: Job) => {
  const { name, data } = job
  console.log('[worker] job', job.id, name)
  if (name === 'run-analysis') {
    // synthetic compute
    const bays: number = Number((data?.options?.bays) || 3)
    const frames = (Number.isFinite(bays) ? bays : 3) + 1
    const frameUC = Array.from({ length: frames }, (_, i) => Number((0.6 + 0.1 * Math.cos(i)).toFixed(2)))
    const diagrams = { M: [0, 8, -4, 12, 0], V: [4, -4, 4, -4, 4], N: [18, 16, 14, 16, 18], deflection: [0, 4, 8, 4, 0] }
    const maxUC = Math.max(...frameUC)
    const maxUCFrame = frameUC.indexOf(maxUC)
    const governingCombo = '1.2D + 1.0W'
    return { frameUC, diagrams, maxUC, maxUCFrame, governingCombo, status: 'done-queued', at: Date.now() }
  }
  if (name === 'opensees') {
    // placeholder for OpenSees run
    const model = data?.model ?? null
    return { model, status: 'opensees-queued', at: Date.now() }
  }
  if (name === 'optimize') {
    const best = Number((data?.best || 1.0) * 0.95)
    return { best, status: 'optimize-queued', at: Date.now() }
  }
  return { status: 'unknown', at: Date.now() }
}, { connection })

const events = new QueueEvents('analysis', { connection })
events.on('completed', ({ jobId, returnvalue }) => {
  console.log('[worker] completed', jobId, returnvalue)
})
events.on('failed', ({ jobId, failedReason }) => {
  console.error('[worker] failed', jobId, failedReason)
})

console.log('[worker] started')
