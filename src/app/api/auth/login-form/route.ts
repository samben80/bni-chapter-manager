import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { signToken, SESSION_COOKIE, SessionPayload } from '@/lib/auth'
import bcrypt from 'bcryptjs'

function htmlRedirect(destination: string, req: NextRequest, cookieHeader?: string): Response {
  const safe = destination.replace(/"/g, '%22')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${safe}">
</head><body><script>window.location.replace(${JSON.stringify(safe)})</script></body></html>`
  const headers: Record<string, string> = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  }
  if (cookieHeader) headers['Set-Cookie'] = cookieHeader
  return new Response(html, { status: 200, headers })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)
    const email = (params.get('email') ?? '').toLowerCase().trim()
    const password = params.get('password') ?? ''

    if (!email || !password) {
      return htmlRedirect('/login?error=missing_fields', req)
    }

    const [user] = await sql`
      SELECT id, name, email, password_hash, role, ambassador_id, active
      FROM users WHERE email = ${email}
    ` as Record<string, unknown>[]

    if (!user || !user.active) {
      return htmlRedirect('/login?error=invalid', req)
    }

    const valid = await bcrypt.compare(password, user.password_hash as string)
    if (!valid) {
      return htmlRedirect('/login?error=invalid', req)
    }

    const chapterRows = await sql`
      SELECT chapter_id FROM user_chapters WHERE user_id = ${user.id as number}
    `
    const chapterIds = chapterRows.map(r => Number(r.chapter_id))

    const payload: SessionPayload = {
      userId: user.id as number,
      name: user.name as string,
      email: user.email as string,
      role: user.role as SessionPayload['role'],
      chapterIds,
      ambassadorId: user.ambassador_id ? Number(user.ambassador_id) : undefined,
    }

    const token = await signToken(payload)

    let destination = '/'
    if (user.role === 'amb' && user.ambassador_id) {
      destination = `/ambassadeurs/${user.ambassador_id}`
    }

    const isProduction = process.env.NODE_ENV === 'production'
    const maxAge = 7 * 24 * 60 * 60
    const cookieHeader = [
      `${SESSION_COOKIE}=${token}`,
      'Path=/',
      `Max-Age=${maxAge}`,
      'HttpOnly',
      'SameSite=Lax',
      ...(isProduction ? ['Secure'] : []),
    ].join('; ')

    return htmlRedirect(destination, req, cookieHeader)
  } catch (e) {
    console.error('[login-form]', e)
    return htmlRedirect('/login?error=server', req)
  }
}

