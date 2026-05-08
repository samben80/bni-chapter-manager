import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { signToken, SESSION_COOKIE, SessionPayload } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)
    const email = (params.get('email') ?? '').toLowerCase().trim()
    const password = params.get('password') ?? ''

    if (!email || !password) {
      return NextResponse.redirect(new URL('/login?error=missing_fields', req.url), { status: 302 })
    }

    const [user] = await sql`
      SELECT id, name, email, password_hash, role, ambassador_id, active
      FROM users WHERE email = ${email}
    ` as Record<string, unknown>[]

    if (!user || !user.active) {
      return NextResponse.redirect(new URL('/login?error=invalid', req.url), { status: 302 })
    }

    const valid = await bcrypt.compare(password, user.password_hash as string)
    if (!valid) {
      return NextResponse.redirect(new URL('/login?error=invalid', req.url), { status: 302 })
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

    const res = NextResponse.redirect(new URL(destination, req.url), { status: 302 })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (e) {
    console.error('[login-form]', e)
    return NextResponse.redirect(new URL('/login?error=server', req.url), { status: 302 })
  }
}
