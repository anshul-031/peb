import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })
  const ifcContent = '{ "ifc": "stub" }\n'
  return new Response(ifcContent, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="model.ifc.json"'
    }
  })
}
