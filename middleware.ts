import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SESSION_COOKIE = 'bni-session'

async function getSession(token: string) {
  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET ?? 'bni-fallback-secret-please-set-AUTH_SECRET!!'
    )
    const { payload } = await jwtVerify(token, secret)
    return payload as { role: string; ambassadorId?: number }
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl

    // Public paths — no auth needed
    if (
      pathname.startsWith('/login') ||
      pathname.startsWith('/api/auth') ||
      pathname === '/api/setup'
    ) {
      return NextResponse.next()
    }

    const token = req.cookies.get(SESSION_COOKIE)?.value
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const session = await getSession(token)
    if (!session) {
      const res = NextResponse.redirect(new URL('/login', req.url))
      res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
      return res
    }

    // AMB: restrict to their own ambassador page only
    if (session.role === 'amb' && session.ambassadorId) {
      const allowed = `/ambassadeurs/${session.ambassadorId}`
      if (!pathname.startsWith('/api/') && !pathname.startsWith(allowed)) {
        return NextResponse.redirect(new URL(allowed, req.url))
      }
    }

    return NextResponse.next()
  } catch (e) {
    // Never crash the middleware — fall through on unexpected error
    console.error('[middleware]', e)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico).*)'],
}
