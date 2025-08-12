import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string, versionId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const version = await prisma.projectVersion.findFirst({
    where: { id: Number(params.versionId), projectId: params.id },
  })
  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.project.update({
    where: { id: params.id },
    // Cast to any to satisfy Prisma JSON input types
    data: { buildingData: version.buildingData as any, analysisResults: version.analysisResults as any },
  })
  return NextResponse.json({ ok: true })
}
