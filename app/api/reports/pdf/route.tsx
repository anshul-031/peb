export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
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
        <Text style={styles.p}>{JSON.stringify(project.connectionDesigns)}</Text>
  <Text style={styles.p}>Summary: joints {Array.isArray((project.connectionDesigns as any)?.joints) ? (project.connectionDesigns as any).joints.length : 0} · status {(project.connectionDesigns as any)?.status || '—'}</Text>
  <Text style={styles.h2}>Foundations</Text>
  {/* Roof framing plan note */}
  <Text style={styles.h2}>Roof Framing Plan (overview)</Text>
  <Text style={styles.p}>Rectangular roof {dims.width ?? '—'} m x {dims.length ?? '—'} m with approx. purlin spacing {sec.purlin ?? '—'} m.</Text>
        <Text style={styles.p}>{JSON.stringify(project.foundationDesigns)}</Text>
  <Text style={styles.p}>Summary: qAllow {(project.foundationDesigns as any)?.qAllow ?? '—'} kPa · footing {(project.foundationDesigns as any)?.footingSize ?? '—'}</Text>
      </Page>
    </Document>
  )
  const nodeBuffer = (await pdf(doc).toBuffer()) as unknown as Uint8Array
  return new Response(nodeBuffer as any, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="report.pdf"' } })
}
