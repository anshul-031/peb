import { Worker } from 'bullmq'
import IORedis from 'ioredis'
// Work around TS typing mismatch for PrismaClient in worker build
// @ts-ignore
import * as PrismaNS from '@prisma/client'
const PrismaClient = (PrismaNS as any).PrismaClient as new (...args: any[]) => any

const connection = new IORedis(process.env.REDIS_URL as string)

async function run() {
  const prisma = new PrismaClient({ log: ['error', 'warn'] })
  const worker = new Worker('analysis', async (job) => {
    const { projectId } = job.data as { projectId: string }
    if (job.name === 'optimize') {
      // Simulate optimization iterations
      let best = { weight: Infinity, config: null as any }
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 500))
        const trialWeight = Math.round(1000 + Math.random() * 300) // kg
        if (trialWeight < best.weight) best = { weight: trialWeight, config: { iteration: i + 1 } }
        await job.updateProgress(Math.round(((i + 1) / 5) * 100))
      }
        // derive frame count for mock UC
        let bays = 4
        try {
          const p = await prisma.project.findUnique({ where: { id: projectId } })
          const d = (p?.buildingData as any)?.dimensions
          bays = Number(d?.bays ?? bays)
        } catch {}
  const frameUC = Array.from({ length: Math.max(1, bays) }, () => Number((0.7 + Math.random() * 0.6).toFixed(2)))
  const nOpt = 40
  const xOpt = Array.from({ length: nOpt }, (_, i) => i / (nOpt - 1))
  const MOpt = xOpt.map((xi) => Number((90 * Math.sin(Math.PI * xi)).toFixed(2)))
  const VOpt = xOpt.map((xi) => Number((90 * Math.cos(Math.PI * xi)).toFixed(2)))
  const NOpt = xOpt.map((xi) => Number((45 + 12 * Math.sin(2 * Math.PI * xi)).toFixed(2)))
  const defOpt = xOpt.map((xi) => Number((18 * (xi * (1 - xi))).toFixed(3)))
  const diagrams = { x: xOpt, M: MOpt, V: VOpt, N: NOpt, deflection: defOpt }
  const results = { status: 'ok', projectId, optimize: true, bestWeight: best.weight, config: best.config, frameUC, diagrams }
      try {
        await prisma.$transaction(async (tx: any) => {
          await tx.project.update({ where: { id: projectId }, data: { analysisResults: results } })
          const versionCount = await tx.projectVersion.count({ where: { projectId } })
          await tx.projectVersion.create({ data: { projectId, versionNumber: versionCount + 1, analysisResults: results, buildingData: null, createdByUserId: null, notes: `Optimize best=${best.weight}kg` } })
        })
      } catch (e) {
        console.error('[optimize] persist failed', e)
      }
      return results
    }

    if (job.name === 'opensees') {
      // Simulate an OpenSees run with progress updates
      for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r, 400))
        await job.updateProgress(Math.round(((i + 1) / 4) * 100))
      }
      // derive frame count for mock UC
      let bays = 4
      try {
        const p = await prisma.project.findUnique({ where: { id: projectId } })
        const d = (p?.buildingData as any)?.dimensions
        bays = Number(d?.bays ?? bays)
      } catch {}
  const frameUC = Array.from({ length: Math.max(1, bays) }, () => Number((0.7 + Math.random() * 0.7).toFixed(2)))
  const nO = 60
  const xO = Array.from({ length: nO }, (_, i) => i / (nO - 1))
  const MO = xO.map((xi) => Number((120 * Math.sin(Math.PI * xi)).toFixed(2)))
  const VO = xO.map((xi) => Number((120 * Math.cos(Math.PI * xi)).toFixed(2)))
  const NO = xO.map((xi) => Number((60 + 15 * Math.sin(2 * Math.PI * xi)).toFixed(2)))
  const defO = xO.map((xi) => Number((25 * (xi * (1 - xi))).toFixed(3)))
  const diagramsO = { x: xO, M: MO, V: VO, N: NO, deflection: defO }
  const results = { status: 'ok', projectId, engine: 'OpenSees', summary: { modes: 3, maxDrift: 0.008 }, frameUC, diagrams: diagramsO }
      try {
        await prisma.$transaction(async (tx: any) => {
          await tx.project.update({ where: { id: projectId }, data: { analysisResults: results } })
          const versionCount = await tx.projectVersion.count({ where: { projectId } })
          await tx.projectVersion.create({ data: { projectId, versionNumber: versionCount + 1, buildingData: null, analysisResults: results, createdByUserId: null, notes: 'OpenSees analysis' } })
        })
      } catch (e) {
        console.error('[opensees] Failed to persist results', e)
      }
      return results
    }

    // Default: single analysis
    await new Promise((r) => setTimeout(r, 1500))
    // derive frame count for mock UC
    let bays = 4
    try {
      const p = await prisma.project.findUnique({ where: { id: projectId } })
      const d = (p?.buildingData as any)?.dimensions
      bays = Number(d?.bays ?? bays)
    } catch {}
  const frameUC = Array.from({ length: Math.max(1, bays) }, () => Number((0.6 + Math.random() * 0.8).toFixed(2)))
  const n = 50
  const x = Array.from({ length: n }, (_, i) => i / (n - 1))
  const M = x.map((xi) => Number((100 * Math.sin(Math.PI * xi)).toFixed(2)))
  const V = x.map((xi) => Number((100 * Math.cos(Math.PI * xi)).toFixed(2)))
  const N = x.map((xi) => Number((50 + 10 * Math.sin(2 * Math.PI * xi)).toFixed(2)))
  const deflection = x.map((xi) => Number((20 * (xi * (1 - xi))).toFixed(3)))
  const diagrams = { x, M, V, N, deflection }
  const results = { status: 'ok', projectId, maxDeflection: 12.3, unityChecks: [], frameUC, diagrams }
    try {
      await prisma.$transaction(async (tx: any) => {
        await tx.project.update({ where: { id: projectId }, data: { analysisResults: results } })
        const versionCount = await tx.projectVersion.count({ where: { projectId } })
        await tx.projectVersion.create({ data: { projectId, versionNumber: versionCount + 1, buildingData: null, analysisResults: results, createdByUserId: null } })
      })
    } catch (e) {
      console.error('[analysis] Failed to persist results', e)
    }
    return results
  }, { connection })

  worker.on('completed', (job, result) => {
    console.log(`[analysis] job ${job.id} completed`, result)
  })

  worker.on('failed', (job, err) => {
    console.error(`[analysis] job ${job?.id} failed`, err)
  })
}

run().catch((e) => {
  console.error('Worker failed to start', e)
  process.exit(1)
})
