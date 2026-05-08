'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import { signToken, SESSION_COOKIE, SessionPayload } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function loginAction(prevState: string | null, formData: FormData) {
  const email = (formData.get('email') as string ?? '').toLowerCase().trim()
  const password = formData.get('password') as string ?? ''

  if (!email || !password) return 'Email et mot de passe requis'

  let redirectTo = '/'

  try {
    const [user] = await sql`
      SELECT id, name, email, password_hash, role, ambassador_id, active
      FROM users WHERE email = ${email}
    ` as Record<string, unknown>[]

    if (!user || !user.active) return 'Email ou mot de passe incorrect'

    const valid = await bcrypt.compare(password, user.password_hash as string)
    if (!valid) return 'Email ou mot de passe incorrect'

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
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    if (user.role === 'amb' && user.ambassador_id) {
      redirectTo = `/ambassadeurs/${user.ambassador_id}`
    }
  } catch (e) {
    console.error('[loginAction]', e)
    return 'Erreur serveur'
  }

  // redirect() must be outside try/catch — it throws internally
  redirect(redirectTo)
}
