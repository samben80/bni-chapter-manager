import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

function parseChapters(raw: string | null) {
  if (!raw) return []
  return raw.split('||').filter(Boolean).map(s => {
    const idx = s.indexOf(':')
    return { id: Number(s.slice(0, idx)), name: s.slice(idx + 1) }
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [row] = await sql`
    SELECT a.*,
      (a.first_name || ' ' || a.last_name) AS full_name,
      STRING_AGG(ac.chapter_id::text || ':' || c.name, '||') AS chapters_raw
    FROM ambassadors a
    LEFT JOIN ambassador_chapters ac ON ac.ambassador_id = a.id
    LEFT JOIN chapters c ON c.id = ac.chapter_id
    WHERE a.id = ${id}
    GROUP BY a.id
  ` as (Record<string, unknown> & { chapters_raw: string | null })[]

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const assignments = await sql`
    SELECT aa.id, aa.role, aa.start_date,
      m.id AS member_id,
      m.first_name || ' ' || m.last_name AS member_name,
      m.company, m.intro_date,
      FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int AS months_since_intro,
      ch.name AS chapter_name
    FROM ambassador_assignments aa
    JOIN members m ON m.id = aa.member_id
    LEFT JOIN chapters ch ON ch.id = m.chapter_id
    WHERE aa.ambassador_id = ${id} AND aa.end_date IS NULL AND m.status = 'active'
    ORDER BY aa.role, m.last_name
  `

  const [stats] = await sql`
    SELECT
      COUNT(DISTINCT aa.member_id) AS total_members,
      SUM(CASE WHEN aa.role = 'onboarding' THEN 1 ELSE 0 END) AS onboarding_count,
      SUM(CASE WHEN aa.role = 'coach_business' THEN 1 ELSE 0 END) AS coach_count
    FROM ambassador_assignments aa
    JOIN members m ON m.id = aa.member_id
    WHERE aa.ambassador_id = ${id} AND aa.end_date IS NULL AND m.status = 'active'
  `

  return NextResponse.json({
    ...row,
    chapters: parseChapters(row.chapters_raw),
    chapters_raw: undefined,
    assignments,
    stats,
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { first_name, last_name, company, email, phone, role, chapter_ids } = body

  await sql`
    UPDATE ambassadors SET
      first_name = ${first_name}, last_name = ${last_name},
      company = ${company || null}, email = ${email || null},
      phone = ${phone || null}, role = ${role}
    WHERE id = ${id}
  `

  if (Array.isArray(chapter_ids)) {
    await sql`DELETE FROM ambassador_chapters WHERE ambassador_id = ${id}`
    for (const cid of chapter_ids) {
      await sql`
        INSERT INTO ambassador_chapters (ambassador_id, chapter_id)
        VALUES (${id}, ${cid})
        ON CONFLICT DO NOTHING
      `
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`UPDATE ambassadors SET active = 0 WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
