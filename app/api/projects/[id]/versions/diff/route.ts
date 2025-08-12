import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function diffObjects(a: any, b: any, path: string[] = [], out: any[] = []) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})])
  for (const k of keys) {
    const pa = [...path, k]
    const va = a?.[k]
    const vb = b?.[k]
    if (typeof va === 'object' && va && typeof vb === 'object' && vb) {
      diffObjects(va, vb, pa, out)
    } else if (JSON.stringify(va) !== JSON.stringify(vb)) {
      out.push({ path: pa.join('.'), a: va, b: vb })
    }
  }
  return out
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const from = Number(searchParams.get('from'))
  const to = Number(searchParams.get('to'))
  const [va, vb] = await Promise.all([
    prisma.projectVersion.findFirst({ where: { id: from, projectId: params.id } }),
    prisma.projectVersion.findFirst({ where: { id: to, projectId: params.id } }),
  ])
  if (!va || !vb) return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  const differences = diffObjects(va, vb)
  return NextResponse.json({ differences })
}
