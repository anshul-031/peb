import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })
  const cis2 = 'CIS/2 STUB FILE\n; Entities would go here.'
  return new Response(cis2, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="model.stp"'
    }
  })
}
