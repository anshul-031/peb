export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { pdf, Document, Page, Text, View, StyleSheet, Svg, Rect, Line } from '@react-pdf/renderer'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({ title: 'ApexStruct Report', sections: [] }))
  const { title = 'ApexStruct Report', sections = [] } = body

  const styles = StyleSheet.create({
    page: { padding: 24 },
    h1: { fontSize: 18, marginBottom: 8 },
    p: { fontSize: 12, marginBottom: 6 },
  })

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{title}</Text>
        {sections.map((s: any, i: number) => (
          <View key={i}>
            <Text style={styles.p}>{s.heading}</Text>
            <Text style={styles.p}>{s.content}</Text>
          </View>
        ))}
      </Page>
    </Document>
  )

  const nodeBuffer = (await pdf(doc).toBuffer()) as unknown as Uint8Array
  return new Response(nodeBuffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="report.pdf"',
    },
  })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })
  const sp = new URL(req.url).searchParams
  const projectId = sp.get('projectId')
  const type = sp.get('type') || 'full'
  if (!projectId) return new Response('projectId required', { status: 400 })
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { owner: { email: session.user.email } },
        { collaborators: { some: { user: { email: session.user.email } } } },
      ],
    },
    select: { projectName: true, designCode: true, unitSystem: true, buildingData: true, loadData: true, analysisResults: true, connectionDesigns: true, foundationDesigns: true },
  })
  if (!project) return new Response('Not found', { status: 404 })

  const styles = StyleSheet.create({ page: { padding: 24 }, h1: { fontSize: 18, marginBottom: 8 }, h2: { fontSize: 14, marginTop: 8, marginBottom: 4 }, p: { fontSize: 10, marginBottom: 4 }, code: { fontSize: 9, color: '#444' } })
  const dims = (project.buildingData as any)?.dimensions || {}
  const sec = (project.buildingData as any)?.secondary || {}
  const openings = (project.buildingData as any)?.openings || {}
  const items = [
    { part: 'Rafter', size: 'Tapered', qty: 2 * (((dims.bays || 0) + 1) || 1), length_m: Number(dims.width || 0) || 10 },
    { part: 'Column', size: 'Tapered', qty: 2 * (((dims.bays || 0) + 1) || 1), length_m: Number(dims.eaveHeight || 0) || 6 },
    { part: 'Purlin', size: 'Z200', qty: Math.max(Math.round((Number(dims.length || 0) || 24) / 1.5), 12), length_m: 6 },
  ] as { part: string; size: string; qty: number; length_m: number }[]
  const unitMass: Record<string, number> = { 'Rafter|Tapered': 35, 'Column|Tapered': 45, 'Purlin|Z200': 16 }
  const withCalcs = items.map(it => {
    const key = `${it.part}|${it.size}`
    const um = unitMass[key] ?? 25
    const totalLen = it.qty * it.length_m
    const estKg = totalLen * um
    return { ...it, totalLen_m: totalLen, unitMass_kg_per_m: um, estWeight_kg: estKg }
  })
  const bomTotals = withCalcs.reduce((acc, it) => { acc.qty += it.qty; acc.len += it.totalLen_m; acc.kg += it.estWeight_kg; return acc }, { qty: 0, len: 0, kg: 0 })
  const ld = (project.loadData as any) || {}
  const combos = Array.isArray(ld.combos) ? ld.combos as string[] : []
  const wind = ld.wind || {}
  // Optional condensed BOM-only report
  if (type === 'bom') {
    const doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>{project.projectName} — BOM</Text>
          <Text style={styles.p}>Totals: pieces {bomTotals.qty}, total length {bomTotals.len.toFixed(1)} m, est. weight {(bomTotals.kg/1000).toFixed(2)} t</Text>
          {withCalcs.map((it, idx) => (
            <Text key={idx} style={styles.p}>
              {it.part} {it.size} · qty {it.qty} · L {it.length_m} m · total {it.totalLen_m.toFixed(1)} m · {it.unitMass_kg_per_m.toFixed(1)} kg/m · est {it.estWeight_kg.toFixed(0)} kg
            </Text>
          ))}
        </Page>
      </Document>
    )
    const nodeBuffer = (await pdf(doc).toBuffer()) as unknown as Uint8Array
    try {
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${encodeURIComponent(projectId)}/logs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'info', source: 'api/reports/pdf', message: 'BOM PDF generated' })
      }).catch(()=>{})
    } catch {}
    return new Response(nodeBuffer as any, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="bom.pdf"' } })
  }

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{project.projectName}</Text>
        <Text style={styles.p}>Code: {project.designCode} · Units: {project.unitSystem}</Text>
  <Text style={styles.h2}>Building</Text>
  <Text style={styles.p}>Width: {dims.width ?? '—'} m · Length: {dims.length ?? '—'} m · Eave ht: {dims.eaveHeight ?? '—'} m · Roof slope: {dims.roofSlope ?? '—'} · Bays: {dims.bays ?? '—'}</Text>
  <Text style={styles.p}>Secondary: purlin {sec.pSection ?? '—'} @ {sec.purlin ?? '—'} m · girt {sec.gSection ?? '—'} @ {sec.girt ?? '—'} m · bracing {sec.bracing ?? '—'}</Text>
  <Text style={styles.h2}>Loads</Text>
        <Text style={styles.p}>Design code: {(ld.designCode || project.designCode) ?? '—'}</Text>
        <Text style={styles.p}>Wind: V={wind.V ?? '—'} · Exposure={wind.exposure ?? '—'} · I={wind.I ?? '—'} · Kd={wind.Kd ?? '—'} · Ke={wind.Ke ?? '—'}</Text>
        {combos.length>0 ? (
          <>
            <Text style={styles.p}>Load combinations ({combos.length}):</Text>
            {combos.slice(0, 18).map((c, i) => (<Text key={i} style={styles.code}>{c}</Text>))}
            {combos.length>18 && <Text style={styles.code}>… {combos.length-18} more</Text>}
          </>
        ) : (
          <Text style={styles.p}>No combinations saved.</Text>
        )}
  <Text style={styles.h2}>Analysis</Text>
        <Text style={styles.p}>{JSON.stringify(project.analysisResults)}</Text>
  <Text style={styles.h2}>BOM (estimate)</Text>
        <Text style={styles.p}>Totals: pieces {bomTotals.qty}, total length {bomTotals.len.toFixed(1)} m, est. weight {(bomTotals.kg/1000).toFixed(2)} t</Text>
        {withCalcs.map((it, idx) => (
          <Text key={idx} style={styles.p}>
            {it.part} {it.size} · qty {it.qty} · L {it.length_m} m · total {it.totalLen_m.toFixed(1)} m · {it.unitMass_kg_per_m.toFixed(1)} kg/m · est {it.estWeight_kg.toFixed(0)} kg
          </Text>
        ))}
        {/* Simple cost summary (using same mass assumptions) */}
        {(() => {
          const rate = 65, miscPct = 0.1
          const material = bomTotals.kg * rate
          const misc = material * miscPct
          const totalCost = material + misc
          return <Text style={styles.p}>Cost (rough): rate {rate}/kg · misc {(miscPct*100).toFixed(0)}% → material {material.toFixed(0)}, misc {misc.toFixed(0)}, total {totalCost.toFixed(0)}</Text>
        })()}
        <Text style={styles.h2}>Connections</Text>
        <Text style={styles.p}>Summary: joints {Array.isArray((project.connectionDesigns as any)?.joints) ? (project.connectionDesigns as any).joints.length : 0} · status {(project.connectionDesigns as any)?.status || '—'}</Text>
        {Array.isArray((project.connectionDesigns as any)?.joints)
          ? (project.connectionDesigns as any).joints.slice(0, 4).map((j: any, idx: number) => (
              <Text key={idx} style={styles.p}>• {j.type}: bolts {j.design?.bolts?.count}×{j.design?.bolts?.diameter}, plate {j.design?.plate?.size} t{j.design?.plate?.thickness}, weld {j.design?.weld?.size} ({j.design?.weld?.length}); top UC {((j.design?.checks||[])[0]?.utilization ?? '—')}</Text>
            ))
          : null}
        <Text style={styles.h2}>Foundations</Text>
        <Text style={styles.p}>Summary: qAllow {(project.foundationDesigns as any)?.qAllow ?? '—'} kPa · footing {(project.foundationDesigns as any)?.footingSize ?? '—'}</Text>
        {Array.isArray((project.foundationDesigns as any)?.design?.checks)
          ? (project.foundationDesigns as any).design.checks.slice(0, 4).map((c: any, idx: number) => (
              <Text key={idx} style={styles.p}>• {c.type}: UC {c.utilization ?? '—'}</Text>
            ))
          : <Text style={styles.p}>No foundation checks.</Text>}
        {/* Vector drawings */}
        <Text style={styles.h2}>Frame Elevation (vector)</Text>
        {(() => {
          const W = Number(dims.width || 12)
          const H = Number(dims.eaveHeight || 6)
          const slope = Number(dims.roofSlope || 10)
          const rise = slope > 0 ? (W / 2) / slope : 0
          const ridge = H + rise
          // simple scale to fit width ~360
          const sx = 360 / Math.max(W, 1)
          const sy = 100 / Math.max(Math.max(H, ridge), 1)
          const s = Math.min(sx, sy)
          return (
            <View style={{ border: '1pt solid #ddd', padding: 4, marginBottom: 6 }}>
              <Svg width={400} height={140} viewBox={`0 0 400 140`}>
                <Rect x={0} y={0} width={400} height={140} fill="#fff" />
                {/* Ground line */}
                <Line x1={20} y1={120} x2={380} y2={120} stroke="#888" strokeWidth={1} />
                {/* Columns */}
                <Line x1={20 + 20} y1={120} x2={20 + 20} y2={120 - H * s} stroke="#111" strokeWidth={2} />
                <Line x1={20 + 20 + W * s} y1={120} x2={20 + 20 + W * s} y2={120 - H * s} stroke="#111" strokeWidth={2} />
                {/* Rafters to ridge */}
                <Line x1={20 + 20} y1={120 - H * s} x2={20 + 20 + (W * s) / 2} y2={120 - ridge * s} stroke="#111" strokeWidth={2} />
                <Line x1={20 + 20 + W * s} y1={120 - H * s} x2={20 + 20 + (W * s) / 2} y2={120 - ridge * s} stroke="#111" strokeWidth={2} />
              </Svg>
            </View>
          )
        })()}
        <Text style={styles.h2}>Roof Framing Plan (vector)</Text>
        {(() => {
          const W = Number(dims.width || 12)
          const L = Number(dims.length || 24)
          const bays = Number(dims.bays || 4)
          const purlin = Number(sec.purlin || 1.5)
          const sx = 360 / Math.max(W, 1)
          const sy = 100 / Math.max(L, 1)
          const s = Math.min(sx, sy)
          const count = Math.max(Math.round(L / Math.max(0.5, purlin)), 1)
          return (
            <View style={{ border: '1pt solid #ddd', padding: 4 }}>
              <Svg width={400} height={140} viewBox={`0 0 400 140`}>
                <Rect x={0} y={0} width={400} height={140} fill="#fff" />
                {/* Perimeter */}
                <Line x1={20} y1={20} x2={20 + W * s} y2={20} stroke="#111" strokeWidth={2} />
                <Line x1={20 + W * s} y1={20} x2={20 + W * s} y2={20 + L * s} stroke="#111" strokeWidth={2} />
                <Line x1={20 + W * s} y1={20 + L * s} x2={20} y2={20 + L * s} stroke="#111" strokeWidth={2} />
                <Line x1={20} y1={20 + L * s} x2={20} y2={20} stroke="#111" strokeWidth={2} />
                {/* Bay lines */}
                {Array.from({ length: bays + 1 }, (_, i) => i).map(i => (
                  <Line key={i} x1={20} y1={20 + (L / bays) * i * s} x2={20 + W * s} y2={20 + (L / bays) * i * s} stroke="#999" strokeWidth={1} />
                ))}
                {/* Purlin lines across width */}
                {Array.from({ length: count + 1 }, (_, i) => i).map(i => (
                  <Line key={i} x1={20} y1={20 + (L / count) * i * s} x2={20 + W * s} y2={20 + (L / count) * i * s} stroke="#1f2937" strokeWidth={1} />
                ))}
              </Svg>
            </View>
          )
        })()}
        <Text style={styles.h2}>Footing Layout (vector)</Text>
        {(() => {
          const W = Number(dims.width || 12)
          const L = Number(dims.length || 24)
          const bays = Math.max(Number(dims.bays || 4), 1)
          const sx = 360 / Math.max(W, 1)
          const sy = 100 / Math.max(L, 1)
          const s = Math.min(sx, sy)
          const frames = bays + 1
          const fx = 20, fy = 20
          const colXLeft = fx + 0
          const colXRight = fx + W * s
          return (
            <View style={{ border: '1pt solid #ddd', padding: 4 }}>
              <Svg width={400} height={140} viewBox={`0 0 400 140`}>
                <Rect x={0} y={0} width={400} height={140} fill="#fff" />
                {/* Perimeter */}
                <Line x1={fx} y1={fy} x2={fx + W * s} y2={fy} stroke="#111" strokeWidth={2} />
                <Line x1={fx + W * s} y1={fy} x2={fx + W * s} y2={fy + L * s} stroke="#111" strokeWidth={2} />
                <Line x1={fx + W * s} y1={fy + L * s} x2={fx} y2={fy + L * s} stroke="#111" strokeWidth={2} />
                <Line x1={fx} y1={fy + L * s} x2={fx} y2={fy} stroke="#111" strokeWidth={2} />
                {/* Footings as small squares at each frame line */}
                {Array.from({ length: frames }, (_, i) => i).map(i => {
                  const z = fy + (L * s) * (i / bays)
                  const size = 8
                  return (
                    <Svg key={i}>
                      <Rect x={colXLeft - size/2} y={z - size/2} width={size} height={size} fill="#93c5fd" stroke="#1d4ed8" strokeWidth={1} />
                      <Rect x={colXRight - size/2} y={z - size/2} width={size} height={size} fill="#93c5fd" stroke="#1d4ed8" strokeWidth={1} />
                    </Svg>
                  )
                })}
              </Svg>
            </View>
          )
        })()}
        {/* Openings summary */}
        {((openings?.doors && openings.doors.length) || (openings?.windows && openings.windows.length)) ? (
          <>
            <Text style={styles.h2}>Openings</Text>
            {Array.isArray(openings.doors) && openings.doors.map((o: any, i: number) => (
              <Text key={`d-${i}`} style={styles.p}>Door W{o.w}×H{o.h} @Z{o.z}</Text>
            ))}
            {Array.isArray(openings.windows) && openings.windows.map((o: any, i: number) => (
              <Text key={`w-${i}`} style={styles.p}>Window W{o.w}×H{o.h} Sill{o.sill} @Z{o.z}</Text>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  )
  const nodeBuffer = (await pdf(doc).toBuffer()) as unknown as Uint8Array
  // Append project log (fire-and-forget)
  try {
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${encodeURIComponent(projectId)}/logs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'info', source: 'api/reports/pdf', message: 'Report PDF generated' })
    }).catch(()=>{})
  } catch {}
  return new Response(nodeBuffer as any, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="report.pdf"' } })
}
