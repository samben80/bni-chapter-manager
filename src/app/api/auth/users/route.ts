import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, forbidden } from '@/lib/auth'
import bcrypt from 'bcryptjs'

async function runMigrations() {
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  TEXT`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS company    TEXT`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone      TEXT`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS amb_role TEXT CHECK (amb_role IN ('onboarding','coach_business','both'))`
    await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`
    await sql`ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin','codir','amb','dc','dz','dr'))`
  } catch { /* non-fatal if already applied */ }
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== 'admin') return forbidden()

  await runMigrations()

  const users = await sql`
    SELECT u.id, u.name, u.first_name, u.last_name, u.email, u.role, u.amb_role,
           u.company, u.phone, u.ambassador_id, u.active, u.created_at,
           ARRAY_AGG(uc.chapter_id ORDER BY uc.chapter_id)
             FILTER (WHERE uc.chapter_id IS NOT NULL) AS chapter_ids
    FROM users u
    LEFT JOIN user_chapters uc ON uc.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== 'admin') return forbidden()

  const body = await req.json()
  const { email, password, role, chapter_ids = [], amb_role } = body
  const firstName: string = (body.first_name ?? '').trim()
  const lastName: string  = (body.last_name  ?? '').trim()
  const company: string   = (body.company ?? '').trim()
  const phone: string     = (body.phone   ?? '').trim()
  const fullName = `${firstName} ${lastName}`.trim()

  if (!firstName || !lastName || !email || !password || !role) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }
  if (role === 'amb' && !amb_role) {
    return NextResponse.json({ error: 'Type ambassadeur requis' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 12)
  const [user] = await sql`
    INSERT INTO users (name, first_name, last_name, company, phone, email, password_hash, role, amb_role)
    VALUES (${fullName}, ${firstName}, ${lastName}, ${company}, ${phone},
            ${email.toLowerCase().trim()}, ${hash}, ${role}, ${role === 'amb' ? amb_role : null})
    RETURNING id
  ` as Record<string, unknown>[]

  const userId = user.id as number

  for (const cid of chapter_ids as number[]) {
    await sql`
      INSERT INTO user_chapters (user_id, chapter_id) VALUES (${userId}, ${cid})
      ON CONFLICT DO NOTHING
    `
  }

  if (role === 'amb') {
    await syncAmbassador(userId, null, { firstName, lastName, company, email, phone, amb_role, chapter_ids })
  }

  return NextResponse.json({ id: userId }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== 'admin') return forbidden()

  const body = await req.json()
  const { id, email, role, chapter_ids = [], amb_role, password, active } = body
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const firstName: string = (body.first_name ?? '').trim()
  const lastName: string  = (body.last_name  ?? '').trim()
  const company: string   = (body.company ?? '').trim()
  const phone: string     = (body.phone   ?? '').trim()
  const fullName = `${firstName} ${lastName}`.trim()

  if (role === 'amb' && !amb_role) {
    return NextResponse.json({ error: 'Type ambassadeur requis' }, { status: 400 })
  }

  // Fetch current ambassador_id
  const [current] = await sql`SELECT ambassador_id FROM users WHERE id = ${id}` as Record<string, unknown>[]
  const currentAmbId = current?.ambassador_id as number | null

  if (password) {
    const hash = await bcrypt.hash(password, 12)
    await sql`
      UPDATE users SET name=${fullName}, first_name=${firstName}, last_name=${lastName},
        company=${company}, phone=${phone}, email=${email.toLowerCase().trim()},
        role=${role}, amb_role=${role === 'amb' ? amb_role : null},
        active=${active ?? true}, password_hash=${hash}
      WHERE id=${id}
    `
  } else {
    await sql`
      UPDATE users SET name=${fullName}, first_name=${firstName}, last_name=${lastName},
        company=${company}, phone=${phone}, email=${email.toLowerCase().trim()},
        role=${role}, amb_role=${role === 'amb' ? amb_role : null},
        active=${active ?? true}
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

  if (role === 'amb') {
    await syncAmbassador(id, currentAmbId, { firstName, lastName, company, email, phone, amb_role, chapter_ids })
  }

  return NextResponse.json({ ok: true })
}

/** Auto-create or update the ambassadors record linked to this user. */
async function syncAmbassador(
  userId: number,
  currentAmbId: number | null,
  data: { firstName: string; lastName: string; company: string; email: string; phone: string; amb_role: string; chapter_ids: number[] }
) {
  const { firstName, lastName, company, email, phone, amb_role, chapter_ids } = data

  if (currentAmbId) {
    await sql`
      UPDATE ambassadors SET
        first_name = ${firstName}, last_name = ${lastName},
        company = ${company}, email = ${email}, phone = ${phone},
        role = ${amb_role}
      WHERE id = ${currentAmbId}
    `
    await sql`DELETE FROM ambassador_chapters WHERE ambassador_id = ${currentAmbId}`
    for (const cid of chapter_ids) {
      await sql`
        INSERT INTO ambassador_chapters (ambassador_id, chapter_id) VALUES (${currentAmbId}, ${cid})
        ON CONFLICT DO NOTHING
      `
    }
  } else {
    const [amb] = await sql`
      INSERT INTO ambassadors (first_name, last_name, company, email, phone, role)
      VALUES (${firstName}, ${lastName}, ${company}, ${email}, ${phone}, ${amb_role})
      RETURNING id
    ` as Record<string, unknown>[]
    const ambId = amb.id as number
    for (const cid of chapter_ids) {
      await sql`
        INSERT INTO ambassador_chapters (ambassador_id, chapter_id) VALUES (${ambId}, ${cid})
        ON CONFLICT DO NOTHING
      `
    }
    await sql`UPDATE users SET ambassador_id = ${ambId} WHERE id = ${userId}`
  }
}
