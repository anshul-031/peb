import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })
  const sp = new URL(req.url).searchParams
  const projectId = sp.get('projectId')
  const sheet = (sp.get('sheet') || 'anchor') as 'anchor'|'frame-elev'|'roof-plan'|'footing-layout'
  if (!projectId) return new NextResponse('projectId required', { status: 400 })
  const project = await prisma.project.findFirst({
    where: { id: projectId, OR: [
      { owner: { email: session.user.email } },
      { collaborators: { some: { user: { email: session.user.email } } } },
    ] },
    select: { buildingData: true, projectName: true },
  })
  if (!project) return new NextResponse('Not found', { status: 404 })
  const d = (project.buildingData as any)?.dimensions || {}
  const W = Number(d.width || 12)
  const L = Number(d.length || 24)
  const bays = Number(d.bays || 4)
  const grid = Array.from({ length: bays + 1 }, (_, i) => i)
  // Simple DXF: draw a rectangle and anchor bolt circles at each frame column base (4 anchors)
  const s: string[] = []
  const push = (line: string) => s.push(line)
  // Minimal LAYER table
  push('0'); push('SECTION'); push('2'); push('TABLES')
  push('0'); push('TABLE'); push('2'); push('LAYER'); push('70'); push('3')
  // Layer: A-OUTLINE
  push('0'); push('LAYER'); push('2'); push('A-OUTLINE'); push('70'); push('0'); push('62'); push('7'); push('6'); push('CONTINUOUS')
  // Layer: A-ANCHOR
  push('0'); push('LAYER'); push('2'); push('A-ANCHOR'); push('70'); push('0'); push('62'); push('1'); push('6'); push('CONTINUOUS')
  // Layer: A-TITLE
  push('0'); push('LAYER'); push('2'); push('A-TITLE'); push('70'); push('0'); push('62'); push('8'); push('6'); push('CONTINUOUS')
  // Layer: A-DIMS
  push('0'); push('LAYER'); push('2'); push('A-DIMS'); push('70'); push('0'); push('62'); push('2'); push('6'); push('CONTINUOUS')
  // Layer: A-FOOTING
  push('0'); push('LAYER'); push('2'); push('A-FOOTING'); push('70'); push('0'); push('62'); push('3'); push('6'); push('CONTINUOUS')
  push('0'); push('ENDTAB'); push('0'); push('ENDSEC')
  // Entities section
  push('0'); push('SECTION'); push('2'); push('ENTITIES')
  if (sheet === 'anchor') {
    // Plan rectangle and anchor layout
    const rectPts = [ [0,0], [W,0], [W,L], [0,L], [0,0] ]
    for (let i=0;i<rectPts.length-1;i++) {
      const [x1,y1] = rectPts[i]; const [x2,y2] = rectPts[i+1]
      push('0'); push('LINE'); push('8'); push('A-OUTLINE')
      push('10'); push(String(x1)); push('20'); push(String(y1))
      push('11'); push(String(x2)); push('21'); push(String(y2))
    }
    // Anchor bolts at each grid line at x=0 and x=W (4 per base)
    const offset = 0.3
    const boltR = 0.0125
    for (const i of grid) {
      const y = (L / bays) * i
      for (const x of [0, W]) {
        for (const [dx,dy] of [[-offset/2,-offset/2],[offset/2,-offset/2],[-offset/2,offset/2],[offset/2,offset/2]]) {
          push('0'); push('CIRCLE'); push('8'); push('A-ANCHOR')
          push('10'); push(String(x+dx)); push('20'); push(String(y+dy))
          push('40'); push(String(boltR))
        }
      }
    }
    // Dimensions
    const dimOff = 0.5
    // width along bottom
    push('0'); push('LINE'); push('8'); push('A-DIMS'); push('10'); push('0'); push('20'); push(String(0)); push('11'); push('0'); push('21'); push(String(-dimOff))
    push('0'); push('LINE'); push('8'); push('A-DIMS'); push('10'); push(String(W)); push('20'); push(String(0)); push('11'); push(String(W)); push('21'); push(String(-dimOff))
    push('0'); push('LINE'); push('8'); push('A-DIMS'); push('10'); push('0'); push('20'); push(String(-dimOff)); push('11'); push(String(W)); push('21'); push(String(-dimOff))
    push('0'); push('TEXT'); push('8'); push('A-DIMS'); push('10'); push(String(W/2)); push('20'); push(String(-dimOff - 0.2)); push('40'); push('0.18'); push('1'); push(`W = ${W.toFixed(2)} m`)
    // length along right side
    push('0'); push('LINE'); push('8'); push('A-DIMS'); push('10'); push(String(W)); push('20'); push('0'); push('11'); push(String(W+dimOff)); push('21'); push('0')
    push('0'); push('LINE'); push('8'); push('A-DIMS'); push('10'); push(String(W)); push('20'); push(String(L)); push('11'); push(String(W+dimOff)); push('21'); push(String(L))
    push('0'); push('LINE'); push('8'); push('A-DIMS'); push('10'); push(String(W+dimOff)); push('20'); push('0'); push('11'); push(String(W+dimOff)); push('21'); push(String(L))
    push('0'); push('TEXT'); push('8'); push('A-DIMS'); push('10'); push(String(W+dimOff+0.2)); push('20'); push(String(L/2)); push('40'); push('0.18'); push('50'); push('90'); push('1'); push(`L = ${L.toFixed(2)} m`)
  } else if (sheet === 'frame-elev') {
    // Simple single-frame elevation at mid-length
    const H = Number(d.eaveHeight || 6)
    const slope = Number(d.roofSlope || 10)
    const rise = slope > 0 ? (W / 2) / slope : 0
    const ridge = H + rise
    // Column lines
    push('0'); push('LINE'); push('8'); push('A-OUTLINE'); push('10'); push('0'); push('20'); push('0'); push('11'); push('0'); push('21'); push(String(H))
    push('0'); push('LINE'); push('8'); push('A-OUTLINE'); push('10'); push(String(W)); push('20'); push('0'); push('11'); push(String(W)); push('21'); push(String(H))
    // Rafters
    push('0'); push('LINE'); push('8'); push('A-OUTLINE'); push('10'); push('0'); push('20'); push(String(H)); push('11'); push(String(W/2)); push('21'); push(String(ridge))
    push('0'); push('LINE'); push('8'); push('A-OUTLINE'); push('10'); push(String(W)); push('20'); push(String(H)); push('11'); push(String(W/2)); push('21'); push(String(ridge))
    // Base line
    push('0'); push('LINE'); push('8'); push('A-DIMS'); push('10'); push('0'); push('20'); push('0'); push('11'); push(String(W)); push('21'); push('0')
    // Height dimension at left
    const dimOffX = -0.6
    push('0'); push('LINE'); push('8'); push('A-DIMS'); push('10'); push('0'); push('20'); push('0'); push('11'); push(String(dimOffX)); push('21'); push('0')
    push('0'); push('LINE'); push('8'); push('A-DIMS'); push('10'); push('0'); push('20'); push(String(H)); push('11'); push(String(dimOffX)); push('21'); push(String(H))
    push('0'); push('LINE'); push('8'); push('A-DIMS'); push('10'); push(String(dimOffX)); push('20'); push('0'); push('11'); push(String(dimOffX)); push('21'); push(String(H))
    push('0'); push('TEXT'); push('8'); push('A-DIMS'); push('10'); push(String(dimOffX - 0.4)); push('20'); push(String(H/2)); push('40'); push('0.18'); push('50'); push('90'); push('1'); push(`H = ${H.toFixed(2)} m`)
  } else if (sheet === 'roof-plan') {
    // Roof purlin lines across width at spacing
    const purlin = Number(((project.buildingData as any)?.secondary?.purlin) || 1.5)
    const count = Math.max(Math.round(L / Math.max(0.5, purlin)), 1)
    for (let i = 0; i <= count; i++) {
      const y = (L / count) * i
      push('0'); push('LINE'); push('8'); push('A-OUTLINE'); push('10'); push('0'); push('20'); push(String(y)); push('11'); push(String(W)); push('21'); push(String(y))
    }
    // Perimeter
    const rectPts = [ [0,0], [W,0], [W,L], [0,L], [0,0] ]
    for (let i=0;i<rectPts.length-1;i++) {
      const [x1,y1] = rectPts[i]; const [x2,y2] = rectPts[i+1]
      push('0'); push('LINE'); push('8'); push('A-OUTLINE')
      push('10'); push(String(x1)); push('20'); push(String(y1))
      push('11'); push(String(x2)); push('21'); push(String(y2))
    }
  } else if (sheet === 'footing-layout') {
    // Draw footing squares at each base (x=0 and x=W along gridlines)
    const fSize = Number(((project.buildingData as any)?.foundation?.footingSize) || 0.8) // edge length in meters
    const half = fSize / 2
    // Perimeter for reference
    const rectPts = [ [0,0], [W,0], [W,L], [0,L], [0,0] ]
    for (let i=0;i<rectPts.length-1;i++) {
      const [x1,y1] = rectPts[i]; const [x2,y2] = rectPts[i+1]
      push('0'); push('LINE'); push('8'); push('A-OUTLINE')
      push('10'); push(String(x1)); push('20'); push(String(y1))
      push('11'); push(String(x2)); push('21'); push(String(y2))
    }
    for (const i of grid) {
      const y = (L / bays) * i
      for (const x of [0, W]) {
        const corners: [number,number][][] = [
          [[x - half, y - half],[x + half, y - half],[x + half, y + half],[x - half, y + half],[x - half, y - half]],
        ]
        for (const poly of corners) {
          for (let k=0;k<poly.length-1;k++) {
            const [x1,y1] = poly[k]; const [x2,y2] = poly[k+1]
            push('0'); push('LINE'); push('8'); push('A-FOOTING')
            push('10'); push(String(x1)); push('20'); push(String(y1))
            push('11'); push(String(x2)); push('21'); push(String(y2))
          }
        }
      }
    }
    // Simple label
    push('0'); push('TEXT'); push('8'); push('A-DIMS')
    push('10'); push(String(W/2)); push('20'); push(String(-0.6))
    push('40'); push('0.18')
    push('1'); push(`Footing size ${fSize.toFixed(2)} m`)
  }
  // Simple title block frame at right of model
  const tbx0 = W + 0.8, tby0 = 0.2, tbx1 = W + 5.0, tby1 = 2.2
  const tbRect = [ [tbx0,tby0],[tbx1,tby0],[tbx1,tby1],[tbx0,tby1],[tbx0,tby0] ]
  for (let i=0;i<tbRect.length-1;i++) {
    const [x1,y1] = tbRect[i]; const [x2,y2] = tbRect[i+1]
    push('0'); push('LINE'); push('8'); push('A-TITLE')
    push('10'); push(String(x1)); push('20'); push(String(y1))
    push('11'); push(String(x2)); push('21'); push(String(y2))
  }
  // Title text and metadata inside title block
  const today = new Date().toISOString().slice(0,10)
  push('0'); push('TEXT'); push('8'); push('A-TITLE')
  push('10'); push(String(tbx0 + 0.2)); push('20'); push(String(tby1 - 0.4))
  push('40'); push('0.22')
  push('1'); push(`${(project.projectName||'Anchor Bolt Plan').replace(/[^a-z0-9-_ ]/gi,' ')}`)
  push('0'); push('TEXT'); push('8'); push('A-TITLE')
  push('10'); push(String(tbx0 + 0.2)); push('20'); push(String(tby1 - 0.9))
  push('40'); push('0.18')
  push('1'); push(`Size: ${W.toFixed(2)}m x ${L.toFixed(2)}m`)
  push('0'); push('TEXT'); push('8'); push('A-TITLE')
  push('10'); push(String(tbx0 + 0.2)); push('20'); push(String(tby1 - 1.3))
  push('40'); push('0.18')
  push('1'); push(`Date: ${today}`)
  // End section
  push('0'); push('ENDSEC'); push('0'); push('EOF')
  const dxf = s.join('\n') + '\n'
  try {
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${encodeURIComponent(projectId)}/logs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'info', source: 'api/drawings/dxf', message: `DXF generated: ${sheet}` })
    }).catch(()=>{})
  } catch {}
  const fname = sheet === 'anchor' ? 'anchor-plan' : sheet === 'frame-elev' ? 'frame-elevation' : sheet === 'roof-plan' ? 'roof-plan' : 'footing-layout'
  return new NextResponse(dxf, { headers: { 'Content-Type': 'application/dxf', 'Content-Disposition': `attachment; filename="${(project.projectName||fname).replace(/[^a-z0-9-_]+/gi,'_')}_${fname}.dxf"` } })
}
