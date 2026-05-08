import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('member_id')
  const type = searchParams.get('type')
  const status = searchParams.get('status')

  const parts: string[] = []
  const vals: unknown[] = []

  if (memberId) { vals.push(Number(memberId)); parts.push(`i.member_id = $${vals.length}`) }
  if (type) { vals.push(type); parts.push(`i.type = $${vals.length}`) }
  if (status) { vals.push(status); parts.push(`i.status = $${vals.length}`) }

  const where = parts.length ? `WHERE ${parts.join(' AND ')}` : ''
  const query = `
    SELECT i.*,
      m.first_name || ' ' || m.last_name AS member_name,
      m.company, m.intro_date, m.chapter_id,
      a.first_name || ' ' || a.last_name AS ambassador_name
    FROM interviews i
    JOIN members m ON m.id = i.member_id
    LEFT JOIN ambassadors a ON a.id = i.ambassador_id
    ${where}
    ORDER BY CASE WHEN i.scheduled_date IS NULL THEN '9999-12-31'::date ELSE i.scheduled_date END ASC
  `

  const interviews = await sql.query(query, vals as unknown[])
  return NextResponse.json(interviews.rows ?? interviews)
}
