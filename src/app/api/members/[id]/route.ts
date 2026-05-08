import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [member] = await sql`
    SELECT m.*,
      (m.first_name || ' ' || m.last_name) AS full_name,
      FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int AS months_since_intro,
      c.name AS chapter_name
    FROM members m
    LEFT JOIN chapters c ON c.id = m.chapter_id
    WHERE m.id = ${id}
  `

  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const interviews = await sql`
    SELECT i.*, a.first_name || ' ' || a.last_name AS ambassador_name
    FROM interviews i
    LEFT JOIN ambassadors a ON a.id = i.ambassador_id
    WHERE i.member_id = ${id}
    ORDER BY CASE i.type
      WHEN 'preboarding' THEN 1
      WHEN '3months' THEN 2
      WHEN '7months' THEN 3
      WHEN '10months' THEN 4
    END
  `

  const assignments = await sql`
    SELECT aa.*, a.first_name || ' ' || a.last_name AS ambassador_name, aa.role
    FROM ambassador_assignments aa
    JOIN ambassadors a ON a.id = aa.ambassador_id
    WHERE aa.member_id = ${id}
  `

  const history = await sql`
    SELECT m2.id, m2.first_name, m2.last_name, m2.intro_date, m2.renewal_date,
      m2.status, m2.bni_role, m2.company, m2.activity,
      c.name AS chapter_name
    FROM members m2
    LEFT JOIN chapters c ON c.id = m2.chapter_id
    WHERE m2.first_name = ${member.first_name}
      AND m2.last_name  = ${member.last_name}
      AND m2.id != ${id}
    ORDER BY m2.intro_date DESC
  `

  return NextResponse.json({ ...member, interviews, assignments, history })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { first_name, last_name, company, activity, bni_activity, email, phone, intro_date, status } = body

  await sql`
    UPDATE members SET
      first_name = ${first_name}, last_name = ${last_name},
      company = ${company}, activity = ${activity}, bni_activity = ${bni_activity},
      email = ${email}, phone = ${phone}, intro_date = ${intro_date}, status = ${status}
    WHERE id = ${id}
  `

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status } = await req.json()
  const allowed = ['Actif', 'Arrêté', 'Annulé', 'Renouvellement en cours', 'Postulation en cours']
  if (!allowed.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  await sql`UPDATE members SET status = ${status} WHERE id = ${id}`
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM members WHERE id = ${id}`
  return NextResponse.json({ success: true })
}
