import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized, resolveAmbassadorRole, ONBOARDING_INTERVIEW_TYPES } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') // 'pending' | 'overdue' | 'completed_this_month'
  if (!filter) return NextResponse.json({ error: 'filter required' }, { status: 400 })

  const isAdmin = session.role === 'admin'
  const ids: number[] = Array.isArray(session.chapterIds) ? session.chapterIds : []

  const ambRole = await resolveAmbassadorRole(session)
  const isOnboarding = session.role === 'amb' && ambRole === 'onboarding'
  const typeFilter = isOnboarding
    ? sql`AND i.type = ANY(${[...ONBOARDING_INTERVIEW_TYPES]})`
    : sql``

  const chapterFilter = (!isAdmin && ids.length > 0)
    ? sql`AND m.chapter_id = ANY(${ids})`
    : sql``

  // Preboarding visibility: show in overdue list only if 6 months–1 year overdue
  const prebOverdueInclude = sql`
    AND (i.type != 'preboarding' OR (
          i.scheduled_date <  CURRENT_DATE - INTERVAL '6 months'
      AND i.scheduled_date >= CURRENT_DATE - INTERVAL '1 year'))`

  let rows: unknown[] = []

  if (filter === 'pending') {
    rows = await sql`
      SELECT i.id, i.type, i.status, i.scheduled_date,
             m.first_name || ' ' || m.last_name AS member_name,
             m.id AS member_id, m.company,
             c.name AS chapter_name
      FROM interviews i
      JOIN members m ON m.id = i.member_id
      LEFT JOIN chapters c ON c.id = m.chapter_id
      WHERE i.status IN ('pending', 'scheduled')
      ${chapterFilter}
      ${typeFilter}
      ORDER BY i.scheduled_date ASC NULLS LAST
    `
  } else if (filter === 'overdue') {
    rows = await sql`
      SELECT i.id, i.type, i.status, i.scheduled_date,
             m.first_name || ' ' || m.last_name AS member_name,
             m.id AS member_id, m.company,
             c.name AS chapter_name
      FROM interviews i
      JOIN members m ON m.id = i.member_id
      LEFT JOIN chapters c ON c.id = m.chapter_id
      WHERE i.status = 'overdue'
      ${prebOverdueInclude}
      ${chapterFilter}
      ${typeFilter}
      ORDER BY i.scheduled_date ASC NULLS LAST
    `
  } else if (filter === 'completed_this_month') {
    rows = await sql`
      SELECT i.id, i.type, i.status, i.completed_date,
             m.first_name || ' ' || m.last_name AS member_name,
             m.id AS member_id, m.company,
             c.name AS chapter_name
      FROM interviews i
      JOIN members m ON m.id = i.member_id
      LEFT JOIN chapters c ON c.id = m.chapter_id
      WHERE i.status = 'completed'
        AND DATE_TRUNC('month', i.completed_date) = DATE_TRUNC('month', CURRENT_DATE)
      ${chapterFilter}
      ${typeFilter}
      ORDER BY i.completed_date DESC
    `
  } else {
    return NextResponse.json({ error: 'Invalid filter' }, { status: 400 })
  }

  return NextResponse.json(rows)
}
