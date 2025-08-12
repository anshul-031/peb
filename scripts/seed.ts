import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

async function main() {
  const demoEmail = 'demo@apexstruct.test'
  const demoPass = 'Demo@1234'
  const demoName = 'Demo User'
  let user = await prisma.user.findUnique({ where: { email: demoEmail } })
  if (!user) {
    user = await prisma.user.create({ data: { email: demoEmail, name: demoName, passwordHash: await hash(demoPass, 10) } })
  }
  const existing = await prisma.project.findFirst({ where: { ownerId: user.id } })
  if (!existing) {
    await prisma.project.create({
      data: {
        ownerId: user.id,
        projectName: 'Seeded Demo Project',
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
}

main().then(()=>process.exit(0)).catch(err=>{ console.error(err); process.exit(1) })
