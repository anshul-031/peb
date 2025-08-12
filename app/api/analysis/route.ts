import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  console.log('[ANALYSIS][POST] incoming')
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { projectId, options } = body
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  // Access check
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { owner: { email: session.user.email } },
        { collaborators: { some: { user: { email: session.user.email } } } },
      ],
    },
    select: { id: true, buildingData: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const redisUrl = process.env.REDIS_URL
  // Check project preference; if analysisMode==='local', force local regardless of REDIS_URL
  let forceLocal = false
  try {
    const mode = ((project?.buildingData as any)?.settings?.analysisMode) as string | undefined
    if (mode === 'local') forceLocal = true
  } catch {}
  if (!redisUrl || forceLocal) {
    // Fallback: run a quick mock analysis and persist results immediately
    const now = Date.now()
    const jobId = `local-${now}`
    let frameCount = 4
    try {
      const bays = Number(((project?.buildingData as any)?.dimensions?.bays) ?? 3)
      frameCount = (Number.isFinite(bays) ? bays : 3) + 1
    } catch {}
  const frameUC = Array.from({ length: frameCount }, (_, i) => Number((0.5 + 0.1 * Math.sin(i)).toFixed(2)))
  const diagrams = { M: [0, 10, -5, 15, 0], V: [5, -5, 5, -5, 5], N: [20, 18, 15, 18, 20], deflection: [0, 5, 10, 5, 0] }
  const maxUC = frameUC.length ? Math.max(...frameUC) : null
  const maxUCFrame = maxUC != null ? frameUC.indexOf(maxUC) : null
  const governingCombo = (options && typeof options.governingCombo === 'string') ? options.governingCombo : '1.2D + 1.6L (demo)'
  const updatedResults = { frameUC, diagrams, maxUC, maxUCFrame, governingCombo, status: 'done-local', at: now } as any
    const user = await prisma.user.findUnique({ where: { email: session.user.email! }, select: { id: true } })
    await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id: projectId }, data: { analysisResults: updatedResults } })
      const agg = await tx.projectVersion.aggregate({ where: { projectId }, _max: { versionNumber: true } })
      const nextVersion = (agg._max.versionNumber ?? 0) + 1
      const current = await tx.project.findUnique({ where: { id: projectId }, select: { buildingData: true } })
  await tx.projectVersion.create({ data: { projectId, versionNumber: nextVersion, buildingData: current?.buildingData as any, analysisResults: updatedResults as any, createdByUserId: user?.id ?? null, notes: 'Local analysis' } })
    })
    // Fire-and-forget log append
    try {
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${projectId}/logs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'info', source: 'api/analysis', message: 'Local analysis completed', meta: { frameUC } })
      }).catch(()=>{})
    } catch {}
    return NextResponse.json({ jobId, immediate: true })
  }
  const { Queue } = await import('bullmq')
  const { default: IORedis } = await import('ioredis')
  const connection = new IORedis(redisUrl)
  const queue = new Queue('analysis', { connection })
  const job = await queue.add('run-analysis', { projectId, options })
  return NextResponse.json({ jobId: job.id })
}
