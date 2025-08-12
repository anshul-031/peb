import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const token = String(body.token || '')
  const password = String(body.password || '')
  console.log('[AUTH][RESET][CONFIRM] incoming', { hasToken: !!token, hasPassword: !!password })
  if (!token || !password) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const user = await prisma.user.findFirst({ where: { resetToken: token, resetTokenExpiry: { gt: new Date() } } })
  console.log('[AUTH][RESET][CONFIRM] user found?', !!user)
  if (!user) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  const passwordHash = await hash(password, 10)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, resetToken: null, resetTokenExpiry: null } })
  console.log('[AUTH][RESET][CONFIRM] updated password', { id: user.id })
  return NextResponse.json({ ok: true })
}
