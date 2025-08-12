import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })
  const sp = new URL(req.url).searchParams
  const projectId = sp.get('projectId')
  if (!projectId) return new Response('projectId required', { status: 400 })
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { owner: { email: session.user.email } },
        { collaborators: { some: { user: { email: session.user.email } } } },
      ],
    },
    select: { projectName: true, buildingData: true },
  })
  if (!project) return new Response('Not found', { status: 404 })
  const dims = (project.buildingData as any)?.dimensions || {}
  const W = Number(dims.width || 12)
  const L = Number(dims.length || 24)
  const H = Number(dims.eaveHeight || 6)
  const bays = Number(dims.bays || 4)
  const slope = Number(dims.roofSlope || 10) // 1:x
  const rise = slope > 0 ? (W / 2) / slope : 0
  const ridge = H + rise
  const frames = Array.from({ length: bays + 1 }, (_, i) => (L / bays) * i)
  // Minimal analytical elements (Columns, Rafters)
  const elements: any[] = []
  frames.forEach((y, idx) => {
    // Columns (left/right)
    elements.push({ id: `COL-L-${idx}`, type: 'Column', from: [0, y, 0], to: [0, y, H] })
    elements.push({ id: `COL-R-${idx}`, type: 'Column', from: [W, y, 0], to: [W, y, H] })
    // Rafters to ridge
    elements.push({ id: `RAF-L-${idx}`, type: 'Beam', from: [0, y, H], to: [W/2, y, ridge] })
    elements.push({ id: `RAF-R-${idx}`, type: 'Beam', from: [W, y, H], to: [W/2, y, ridge] })
  })
  const ifcJson = {
    schema: 'IFC-JSON-minimal',
    project: project.projectName,
    units: { length: 'm' },
    elements,
  }
  const content = JSON.stringify(ifcJson, null, 2) + '\n'
  try {
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${encodeURIComponent(projectId)}/logs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'info', source: 'api/interop/ifc', message: 'IFC export generated' })
    }).catch(()=>{})
  } catch {}
  return new Response(content, { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="model.ifc.json"' } })
}
