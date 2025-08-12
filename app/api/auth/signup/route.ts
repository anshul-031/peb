import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const email = String(body.email || '')
  const password = String(body.password || '')
  const name = String(body.name || '')
  console.log('[AUTH][SIGNUP] incoming', { email, hasPassword: !!password, name: !!name })
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  const exists = await prisma.user.findUnique({ where: { email } })
  console.log('[AUTH][SIGNUP] exists?', !!exists)
  if (exists) return NextResponse.json({ error: 'Account exists' }, { status: 409 })
  const passwordHash = await hash(password, 10)
  const user = await prisma.user.create({ data: { email, name, passwordHash } })
  console.log('[AUTH][SIGNUP] created', { id: user.id })
  return NextResponse.json({ id: user.id, email: user.email })
}
