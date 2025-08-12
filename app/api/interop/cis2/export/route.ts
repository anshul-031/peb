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
  const slope = Number(dims.roofSlope || 10)
  const rise = slope > 0 ? (W / 2) / slope : 0
  const ridge = H + rise
  const frames = Array.from({ length: bays + 1 }, (_, i) => (L / bays) * i)

  let out = `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('CIS/2 minimal export'), '2;1');\nFILE_NAME('${project.projectName}','',('ApexStruct'),('ApexStruct'),'','ApexStruct','');\nFILE_SCHEMA(('CIS2'));\nENDSEC;\nDATA;\n`;
  let eid = 1
  const ent = (s: string) => { out += `#${eid++}=${s};\n` }
  frames.forEach((y, idx) => {
    ent(`MEMBER('COL-L-${idx}','COLUMN',(0.,${y},0.),(0.,${y},${H}))`)
    ent(`MEMBER('COL-R-${idx}','COLUMN',(${W},${y},0.),(${W},${y},${H}))`)
    ent(`MEMBER('RAF-L-${idx}','BEAM',(0.,${y},${H}),(${W/2},${y},${ridge}))`)
    ent(`MEMBER('RAF-R-${idx}','BEAM',(${W},${y},${H}),(${W/2},${y},${ridge}))`)
  })
  out += 'ENDSEC;\nEND-ISO-10303-21;\n'
  try {
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${encodeURIComponent(projectId)}/logs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'info', source: 'api/interop/cis2', message: 'CIS/2 export generated' })
    }).catch(()=>{})
  } catch {}
  return new Response(out, { headers: { 'Content-Type': 'text/plain', 'Content-Disposition': 'attachment; filename="model.stp"' } })
}
