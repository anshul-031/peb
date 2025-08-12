import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type LogEntry = {
  time: string
  level: 'info' | 'warn' | 'error' | 'debug'
  source: string
  message: string
  meta?: any
}

async function getProjectIfAuthorized(projectId: string, email?: string | null) {
  if (!email) return null
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { owner: { email } },
        { collaborators: { some: { user: { email } } } },
      ],
    },
    select: { id: true, buildingData: true },
  })
}

function clampLogs(logs: LogEntry[], max = 500): LogEntry[] {
  if (logs.length <= max) return logs
  return logs.slice(logs.length - max)
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const proj = await getProjectIfAuthorized(params.id, session.user.email)
  if (!proj) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const bd = (proj.buildingData as any) || {}
  const logs: LogEntry[] = Array.isArray(bd.logs) ? bd.logs : []
  // Optional slicing
  const sp = new URL(req.url).searchParams
  const limit = Number(sp.get('limit') || 200)
  const level = sp.get('level') as LogEntry['level'] | null
  const source = sp.get('source') || null
  const filtered = logs.filter(l => (!level || l.level === level) && (!source || l.source === source))
  const out = filtered.slice(Math.max(0, filtered.length - limit))
  return NextResponse.json({ count: filtered.length, logs: out })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const proj = await getProjectIfAuthorized(params.id, session.user.email)
  if (!proj) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const entry: LogEntry = {
    time: new Date().toISOString(),
    level: (body.level as any) || 'info',
    source: String(body.source || 'api/logs'),
    message: String(body.message || ''),
    meta: body.meta ?? undefined,
  }
  const bd = (proj.buildingData as any) || {}
  const cur: LogEntry[] = Array.isArray(bd.logs) ? bd.logs : []
  const nextLogs = clampLogs([...cur, entry])
  const nextBD = { ...bd, logs: nextLogs }
  await prisma.project.update({ where: { id: proj.id }, data: { buildingData: nextBD } })
  return NextResponse.json({ ok: true, count: nextLogs.length })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const proj = await getProjectIfAuthorized(params.id, session.user.email)
  if (!proj) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Clear all logs
  const bd = (proj.buildingData as any) || {}
  const nextBD = { ...bd, logs: [] }
  await prisma.project.update({ where: { id: proj.id }, data: { buildingData: nextBD } })
  return NextResponse.json({ ok: true })
}
