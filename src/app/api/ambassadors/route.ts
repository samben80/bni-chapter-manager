import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

function parseChapters(raw: string | null) {
  if (!raw) return []
  return raw.split('||').filter(Boolean).map(s => {
    const idx = s.indexOf(':')
    return { id: Number(s.slice(0, idx)), name: s.slice(idx + 1) }
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')

  const rows = role
    ? await sql`
        SELECT a.*,
          (a.first_name || ' ' || a.last_name) AS full_name,
          STRING_AGG(ac.chapter_id::text || ':' || c.name, '||') AS chapters_raw
        FROM ambassadors a
        LEFT JOIN ambassador_chapters ac ON ac.ambassador_id = a.id
        LEFT JOIN chapters c ON c.id = ac.chapter_id
        WHERE a.active = 1 AND (a.role = ${role} OR a.role = 'both')
        GROUP BY a.id
        ORDER BY a.last_name, a.first_name
      `
    : await sql`
        SELECT a.*,
          (a.first_name || ' ' || a.last_name) AS full_name,
          STRING_AGG(ac.chapter_id::text || ':' || c.name, '||') AS chapters_raw
        FROM ambassadors a
        LEFT JOIN ambassador_chapters ac ON ac.ambassador_id = a.id
        LEFT JOIN chapters c ON c.id = ac.chapter_id
        WHERE a.active = 1
        GROUP BY a.id
        ORDER BY a.last_name, a.first_name
      `

  const ambassadors = rows.map((r: Record<string, unknown>) => ({
    ...r,
    chapters: parseChapters((r.chapters_raw as string | null) ?? null),
    chapters_raw: undefined,
  }))
  return NextResponse.json(ambassadors)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { first_name, last_name, company, email, phone, role, chapter_ids = [] }: {
    first_name: string; last_name: string; company?: string; email?: string
    phone?: string; role: string; chapter_ids: number[]
  } = body

  const [ambassador] = await sql`
    INSERT INTO ambassadors (first_name, last_name, company, email, phone, role)
    VALUES (${first_name}, ${last_name}, ${company || null}, ${email || null}, ${phone || null}, ${role})
    RETURNING id
  `
  const ambassadorId = ambassador.id

  for (const cid of chapter_ids) {
    await sql`
      INSERT INTO ambassador_chapters (ambassador_id, chapter_id)
      VALUES (${ambassadorId}, ${cid})
      ON CONFLICT DO NOTHING
    `
  }

  return NextResponse.json({ id: ambassadorId }, { status: 201 })
}
