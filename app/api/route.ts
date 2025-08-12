import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ status: 'ok', info: 'Use POST /api/reports to generate a PDF.' })
}
