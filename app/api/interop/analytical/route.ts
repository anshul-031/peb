import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  const model = {
    version: 1,
    nodes: [
      { id: 1, x: 0, y: 0, z: 0 },
      { id: 2, x: 10, y: 0, z: 0 }
    ],
    members: [
      { id: 1, i: 1, j: 2, section: 'Tapered' }
    ]
  }
  return new Response(JSON.stringify(model), { headers: { 'Content-Type': 'application/json' } })
}
