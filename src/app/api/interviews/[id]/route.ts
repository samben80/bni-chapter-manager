import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [interview] = await sql`
    SELECT i.*,
      m.first_name || ' ' || m.last_name AS member_name,
      m.company, m.intro_date, m.activity, m.bni_activity, m.email, m.phone,
      a.first_name || ' ' || a.last_name AS ambassador_name
    FROM interviews i
    JOIN members m ON m.id = i.member_id
    LEFT JOIN ambassadors a ON a.id = i.ambassador_id
    WHERE i.id = ${id}
  `

  if (!interview) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(interview)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const {
    ambassador_id, scheduled_date, completed_date, status,
    form_data, committee_member1, committee_member1_opinion,
    committee_member2, committee_member2_opinion,
    positive_points, concerns, notes
  } = body

  await sql`
    UPDATE interviews SET
      ambassador_id = ${ambassador_id},
      scheduled_date = ${scheduled_date},
      completed_date = ${completed_date},
      status = ${status},
      form_data = ${form_data ? JSON.stringify(form_data) : null},
      committee_member1 = ${committee_member1},
      committee_member1_opinion = ${committee_member1_opinion},
      committee_member2 = ${committee_member2},
      committee_member2_opinion = ${committee_member2_opinion},
      positive_points = ${positive_points},
      concerns = ${concerns},
      notes = ${notes},
      updated_at = NOW()
    WHERE id = ${id}
  `

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM interviews WHERE id = ${id}`
  return NextResponse.json({ success: true })
}
