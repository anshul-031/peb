import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })
  // For now, accept JSON payload and echo a parsed geometry summary
  const body = await req.json().catch(() => ({} as any))
  const summary = {
    status: 'parsed',
    nodes: Array.isArray(body?.nodes) ? body.nodes.length : 0,
    members: Array.isArray(body?.members) ? body.members.length : 0,
  }
  return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json' } })
}
