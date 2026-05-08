import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('member_id')
  const type = searchParams.get('type')
  const status = searchParams.get('status')

  const parts: string[] = []
  const vals: unknown[] = []

  if (memberId) { vals.push(Number(memberId)); parts.push(`i.member_id = $${vals.length}`) }
  if (type) { vals.push(type); parts.push(`i.type = $${vals.length}`) }
  if (status) { vals.push(status); parts.push(`i.status = $${vals.length}`) }

  if (session.role !== 'admin') {
    if (session.chapterIds.length === 0) return NextResponse.json([])
    vals.push(session.chapterIds)
    parts.push(`m.chapter_id = ANY($${vals.length})`)
  }

  const where = parts.length ? `WHERE ${parts.join(' AND ')}` : ''
  const query = `
    SELECT i.*,
      m.first_name || ' ' || m.last_name AS member_name,
      m.company, m.intro_date, m.chapter_id,
      c.name AS chapter_name,
      a.first_name || ' ' || a.last_name AS ambassador_name
    FROM interviews i
    JOIN members m ON m.id = i.member_id
    LEFT JOIN chapters c ON c.id = m.chapter_id
    LEFT JOIN ambassadors a ON a.id = i.ambassador_id
    ${where}
    ORDER BY CASE WHEN i.scheduled_date IS NULL THEN '9999-12-31'::date ELSE i.scheduled_date END ASC
  `

  const interviews = await sql.query(query, vals)
  return NextResponse.json(interviews.rows ?? interviews)
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()

  const { ids }: { ids: number[] } = await req.json()
  if (!ids?.length) return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
  await sql.query(`DELETE FROM interviews WHERE id = ANY($1)`, [ids])
  return NextResponse.json({ deleted: ids.length })
}
