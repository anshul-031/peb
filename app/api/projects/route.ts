import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: me.id },
        { collaborators: { some: { userId: me.id } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const me = await prisma.user.upsert({
    where: { email: session.user.email },
    update: {},
    create: { email: session.user.email, name: session.user.name || undefined },
  })
  const body = await req.json()
  const { projectName, designCode, unitSystem, clientName, designerName, location } = body
  if (!projectName) return NextResponse.json({ error: 'Missing projectName' }, { status: 400 })
  const project = await prisma.project.create({
    data: {
      projectName,
      designCode,
      unitSystem,
      ownerId: me.id,
      clientName,
      designerName,
      location,
    },
  })
  return NextResponse.json({ project }, { status: 201 })
}
