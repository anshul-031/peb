import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  const collabs = await prisma.projectCollaborator.findMany({ where: { projectId: params.id }, include: { user: true } })
  return NextResponse.json({ collaborators: collabs })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { email, userId, role } = await req.json()
  const owner = await prisma.project.findUnique({ where: { id: params.id }, include: { owner: true } })
  if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (owner.owner.email !== session.user.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (userId) {
    await prisma.projectCollaborator.update({ where: { projectId_userId: { projectId: params.id, userId } }, data: { role } })
  } else {
    const user = await prisma.user.upsert({ where: { email }, update: {}, create: { email } })
    await prisma.projectCollaborator.upsert({
      where: { projectId_userId: { projectId: params.id, userId: user.id } },
      update: { role },
      create: { projectId: params.id, userId: user.id, role },
    })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId } = await req.json()
  const owner = await prisma.project.findUnique({ where: { id: params.id }, include: { owner: true } })
  if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (owner.owner.email !== session.user.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.projectCollaborator.delete({ where: { projectId_userId: { projectId: params.id, userId } } })
  return NextResponse.json({ ok: true })
}
