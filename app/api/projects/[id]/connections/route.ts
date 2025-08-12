import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })

  const body = await req.json()
  console.log('[CONN][SAVE] project', params.id, 'keys', Object.keys(body || {}))
  const proj = await prisma.project.findFirst({
    where: {
      id: params.id,
      OR: [
        { owner: { email: session.user.email } },
        { collaborators: { some: { user: { email: session.user.email } } } },
      ],
    },
    select: { id: true },
  })
  if (!proj) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: params.id }, data: { connectionDesigns: body } })
    const agg = await tx.projectVersion.aggregate({ where: { projectId: params.id }, _max: { versionNumber: true } })
    const nextVersion = (agg._max.versionNumber ?? 0) + 1
    const current = await tx.project.findUnique({ where: { id: params.id }, select: { buildingData: true, analysisResults: true } })
    await tx.projectVersion.create({
      data: {
        projectId: params.id,
        versionNumber: nextVersion,
        buildingData: current?.buildingData as any,
        analysisResults: current?.analysisResults as any,
        createdByUserId: user?.id ?? null,
        notes: 'Connections updated',
      },
    })
  })
  // Log
  try {
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${params.id}/logs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'info', source: 'api/connections', message: 'Connections updated' })
    }).catch(()=>{})
  } catch {}
  return NextResponse.json({ ok: true })
}
