import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function POST(req: NextRequest) {
  // Idempotent demo user and project seeding
  const email = 'demo@apexstruct.test'
  const password = 'Demo@1234'
  const name = 'Demo User'

  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    const passwordHash = await hash(password, 10)
    user = await prisma.user.create({ data: { email, name, passwordHash } })
  }

  // Ensure at least one project exists for the demo user
  const anyProject = await prisma.project.findFirst({ where: { ownerId: user.id } })
  if (!anyProject) {
    await prisma.project.create({
      data: {
        ownerId: user!.id,
        projectName: 'Demo PEB Project',
        buildingType: 'PEB',
        clientName: 'Demo Client',
        designerName: 'Demo Engineer',
        location: 'Remote',
        designCode: 'ASCE 7-16',
        unitSystem: 'Metric',
        buildingData: { dimensions: { width: 18, length: 36, eaveHeight: 6, roofSlope: 10, bays: 6 } },
        loadData: { dead: 0.5, live: 0.57, windSpeed: 90, exposure: 'C' },
        analysisResults: { frameUC: [0.6, 0.72, 0.55, 0.81, 0.64, 0.59] },
      },
    })
  }

  return NextResponse.json({ ok: true, email, password })
}
