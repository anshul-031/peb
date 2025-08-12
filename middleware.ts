import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const baseUrl = `${req.nextUrl.origin}`
  const callbackUrl = encodeURIComponent(`${pathname}${search}`)

  // Try to decode token; if it fails (e.g., missing NEXTAUTH_SECRET), fall back to cookie presence
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const hasSessionCookie = !!(req.cookies.get('next-auth.session-token') || req.cookies.get('__Secure-next-auth.session-token'))
  const isAuthed = !!(token || hasSessionCookie)

  // Protect app routes
  if (pathname.startsWith('/app')) {
    if (!isAuthed) {
      const url = new URL(`/signin?callbackUrl=${callbackUrl}`, baseUrl)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Redirect away from auth pages when already signed in
  if (pathname === '/signin' || pathname === '/signup') {
    if (isAuthed) {
      const to = new URL('/app/projects', baseUrl)
      return NextResponse.redirect(to)
    }
  }

  return NextResponse.next()
}

export const config = { matcher: ['/app/:path*', '/signin', '/signup'] }
