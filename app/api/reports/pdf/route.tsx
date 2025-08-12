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

  const styles = StyleSheet.create({ page: { padding: 24 }, h1: { fontSize: 18, marginBottom: 8 }, h2: { fontSize: 14, marginTop: 8, marginBottom: 4 }, p: { fontSize: 10, marginBottom: 4 } })
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{project.projectName}</Text>
        <Text style={styles.p}>Code: {project.designCode} · Units: {project.unitSystem}</Text>
        <Text style={styles.h2}>Building</Text>
        <Text style={styles.p}>{JSON.stringify(project.buildingData)}</Text>
        <Text style={styles.h2}>Loads</Text>
        <Text style={styles.p}>{JSON.stringify(project.loadData)}</Text>
        <Text style={styles.h2}>Analysis</Text>
        <Text style={styles.p}>{JSON.stringify(project.analysisResults)}</Text>
        <Text style={styles.h2}>Connections</Text>
        <Text style={styles.p}>{JSON.stringify(project.connectionDesigns)}</Text>
        <Text style={styles.h2}>Foundations</Text>
        <Text style={styles.p}>{JSON.stringify(project.foundationDesigns)}</Text>
      </Page>
    </Document>
  )
  const nodeBuffer = (await pdf(doc).toBuffer()) as unknown as Uint8Array
  return new Response(nodeBuffer as any, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="report.pdf"' } })
}
