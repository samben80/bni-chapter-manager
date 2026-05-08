import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const isAdmin = session.role === 'admin'
  const vals: unknown[] = []
  const conditions: string[] = []

  if (status) {
    vals.push(status)
    conditions.push(`m.status = $${vals.length}`)
  }

  if (!isAdmin) {
    if (session.chapterIds.length === 0) return NextResponse.json([])
    vals.push(session.chapterIds)
    conditions.push(`m.chapter_id = ANY($${vals.length})`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const query = `
    SELECT m.*,
      (m.first_name || ' ' || m.last_name) AS full_name,
      FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int AS months_since_intro,
      c.name AS chapter_name,
      a_ob.first_name || ' ' || a_ob.last_name AS onboarding_ambassador,
      a_cb.first_name || ' ' || a_cb.last_name AS coach_ambassador
    FROM members m
    LEFT JOIN chapters c ON c.id = m.chapter_id
    LEFT JOIN ambassador_assignments aa_ob ON aa_ob.member_id = m.id AND aa_ob.role = 'onboarding' AND aa_ob.end_date IS NULL
    LEFT JOIN ambassadors a_ob ON a_ob.id = aa_ob.ambassador_id
    LEFT JOIN ambassador_assignments aa_cb ON aa_cb.member_id = m.id AND aa_cb.role = 'coach_business' AND aa_cb.end_date IS NULL
    LEFT JOIN ambassadors a_cb ON a_cb.id = aa_cb.ambassador_id
    ${where}
    ORDER BY m.intro_date DESC
  `

  const result = await sql.query(query, vals)
  return NextResponse.json(result.rows ?? result)
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()
  if (session.role === 'amb') return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await req.json()
  const { ids }: { ids: number[] } = body
  if (!ids?.length) return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
  for (const id of ids) {
    await sql`DELETE FROM members WHERE id = ${id}`
  }
  return NextResponse.json({ deleted: ids.length })
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()
  if (session.role === 'amb') return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await req.json()
  const {
    chapter_id = 1, first_name, last_name, company, activity,
    bni_activity, email, phone, intro_date,
    onboarding_ambassador_id, coach_ambassador_id
  } = body

  const [member] = await sql`
    INSERT INTO members (chapter_id, first_name, last_name, company, activity, bni_activity, email, phone, intro_date)
    VALUES (${chapter_id}, ${first_name}, ${last_name}, ${company}, ${activity}, ${bni_activity}, ${email}, ${phone}, ${intro_date})
    RETURNING id
  `
  const memberId = member.id

  const scheduleOffsets: [string, number][] = [
    ['preboarding', 0], ['3months', 3], ['7months', 7], ['10months', 10]
  ]
  for (const [type, offset] of scheduleOffsets) {
    const interval = `${offset} months`
    await sql`
      INSERT INTO interviews (member_id, type, scheduled_date, status)
      VALUES (${memberId}, ${type}, (${intro_date}::date + ${interval}::interval)::date, 'scheduled')
      ON CONFLICT (member_id, type) DO NOTHING
    `
  }

  if (onboarding_ambassador_id) {
    await sql`
      INSERT INTO ambassador_assignments (member_id, ambassador_id, role, start_date)
      VALUES (${memberId}, ${onboarding_ambassador_id}, 'onboarding', ${intro_date})
    `
  }
  if (coach_ambassador_id) {
    await sql`
      INSERT INTO ambassador_assignments (member_id, ambassador_id, role, start_date)
      VALUES (${memberId}, ${coach_ambassador_id}, 'coach_business', (${intro_date}::date + interval '6 months')::date)
    `
  }

  return NextResponse.json({ id: memberId }, { status: 201 })
}
