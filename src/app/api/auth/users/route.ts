import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, forbidden } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== 'admin') return forbidden()

  const users = await sql`
    SELECT u.id, u.name, u.email, u.role, u.ambassador_id, u.active, u.created_at,
      ARRAY_AGG(uc.chapter_id ORDER BY uc.chapter_id) FILTER (WHERE uc.chapter_id IS NOT NULL) AS chapter_ids,
      a.first_name || ' ' || a.last_name AS ambassador_name
    FROM users u
    LEFT JOIN user_chapters uc ON uc.user_id = u.id
    LEFT JOIN ambassadors a ON a.id = u.ambassador_id
    GROUP BY u.id, a.first_name, a.last_name
    ORDER BY u.created_at DESC
  `
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== 'admin') return forbidden()

  const { name, email, password, role, chapter_ids = [], ambassador_id } = await req.json()
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 12)
  const [user] = await sql`
    INSERT INTO users (name, email, password_hash, role, ambassador_id)
    VALUES (${name}, ${email.toLowerCase().trim()}, ${hash}, ${role}, ${ambassador_id ?? null})
    RETURNING id
  ` as Record<string, unknown>[]

  for (const cid of chapter_ids as number[]) {
    await sql`
      INSERT INTO user_chapters (user_id, chapter_id) VALUES (${user.id as number}, ${cid})
      ON CONFLICT DO NOTHING
    `
  }

  return NextResponse.json({ id: user.id }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== 'admin') return forbidden()

  const { id, name, email, role, chapter_ids = [], ambassador_id, password, active } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  if (password) {
    const hash = await bcrypt.hash(password, 12)
    await sql`
      UPDATE users SET name=${name}, email=${email.toLowerCase().trim()}, role=${role},
        ambassador_id=${ambassador_id ?? null}, active=${active ?? true}, password_hash=${hash}
      WHERE id=${id}
    `
  } else {
    await sql`
      UPDATE users SET name=${name}, email=${email.toLowerCase().trim()}, role=${role},
        ambassador_id=${ambassador_id ?? null}, active=${active ?? true}
      WHERE id=${id}
    `
  }

  await sql`DELETE FROM user_chapters WHERE user_id = ${id}`
  for (const cid of chapter_ids as number[]) {
    await sql`
      INSERT INTO user_chapters (user_id, chapter_id) VALUES (${id}, ${cid})
      ON CONFLICT DO NOTHING
    `
  }

  return NextResponse.json({ ok: true })
}
