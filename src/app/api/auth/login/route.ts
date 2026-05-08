import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { signToken, SESSION_COOKIE, SessionPayload } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const [user] = await sql`
      SELECT id, name, email, password_hash, role, ambassador_id, active
      FROM users
      WHERE email = ${email.toLowerCase().trim()}
    ` as Record<string, unknown>[]

    if (!user || !user.active) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash as string)
    if (!valid) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
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
    const res = NextResponse.json({
      ok: true,
      role: user.role,
      ambassadorId: user.ambassador_id ?? null,
    })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
