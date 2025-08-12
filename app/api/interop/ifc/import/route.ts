import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })
  // For now, accept JSON payload and echo a parsed geometry summary
  const url = new URL(req.url)
  const projectId = url.searchParams.get('projectId')
  const body = await req.json().catch(() => ({} as any))
  const summary = {
    status: 'parsed',
    nodes: Array.isArray(body?.nodes) ? body.nodes.length : 0,
    members: Array.isArray(body?.members) ? body.members.length : 0,
  }
  // Minimal mapping: if projectId is given and payload has meta dims, persist into buildingData
  if (projectId) {
    const proj = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { owner: { email: session.user.email } },
          { collaborators: { some: { user: { email: session.user.email } } } },
        ],
      },
    })
    if (proj) {
      const dims = body?.dimensions
      if (dims && (dims.width || dims.length || dims.eaveHeight || dims.bays)) {
        const prev = (proj.buildingData as any) || {}
        const next = { ...prev, dimensions: { ...prev.dimensions, ...dims } }
        await prisma.project.update({ where: { id: proj.id }, data: { buildingData: next } })
        ;(summary as any).saved = true
      }
    }
  }
  return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json' } })
}
