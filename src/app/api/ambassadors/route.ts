import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized } from '@/lib/auth'

function parseChapters(raw: string | null) {
  if (!raw) return []
  return raw.split('||').filter(Boolean).map(s => {
    const idx = s.indexOf(':')
    return { id: Number(s.slice(0, idx)), name: s.slice(idx + 1) }
  })
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')

  const vals: unknown[] = []
  const conditions: string[] = ['a.active = 1']

  if (role) {
    vals.push(role)
    conditions.push(`(a.role = $${vals.length} OR a.role = 'both')`)
  }

  // DC: only ambassadors belonging to their chapters
  if (session.role === 'dc') {
    if (session.chapterIds.length === 0) return NextResponse.json([])
    vals.push(session.chapterIds)
    conditions.push(`EXISTS (
      SELECT 1 FROM ambassador_chapters ac2
      WHERE ac2.ambassador_id = a.id AND ac2.chapter_id = ANY($${vals.length})
    )`)
  }

  // AMB: only their own record
  if (session.role === 'amb' && session.ambassadorId) {
    vals.push(session.ambassadorId)
    conditions.push(`a.id = $${vals.length}`)
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const query = `
    SELECT a.*,
      (a.first_name || ' ' || a.last_name) AS full_name,
      STRING_AGG(ac.chapter_id::text || ':' || c.name, '||') AS chapters_raw
    FROM ambassadors a
    LEFT JOIN ambassador_chapters ac ON ac.ambassador_id = a.id
    LEFT JOIN chapters c ON c.id = ac.chapter_id
    ${where}
    GROUP BY a.id
    ORDER BY a.last_name, a.first_name
  `

  const rows = await sql.query(query, vals).then(r => r.rows ?? r)
  const ambassadors = rows.map((r: Record<string, unknown>) => ({
    ...r,
    chapters: parseChapters((r.chapters_raw as string | null) ?? null),
    chapters_raw: undefined,
  }))
  return NextResponse.json(ambassadors)
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()
  if (session.role === 'amb') return Response.json({ error: 'Accès refusé' }, { status: 403 })

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
