import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const email = String(body.email || '')
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ ok: true }) // don't leak
  const token = Math.random().toString(36).slice(2)
  const expiry = new Date(Date.now() + 1000 * 60 * 30)
  await prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpiry: expiry } })
  // In production, email this link to the user
  return NextResponse.json({ ok: true, resetUrl: `/auth/reset/${token}` })
}
