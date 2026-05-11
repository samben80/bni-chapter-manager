import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  let session
  try {
    session = await getSession(req)
  } catch (e) {
    console.error('[dashboard] getSession error:', e)
    return unauthorized()
  }
  if (!session) return unauthorized()

  const isAdmin = session.role === 'admin'
  const chapterFilter = !isAdmin && session.chapterIds.length > 0

  // Build chapter-filter snippet for parameterized queries
  // We'll use $1 for chapterIds array if needed
  const baseParam = chapterFilter ? [session.chapterIds] : []
  const chapterWhere = chapterFilter ? ' AND m.chapter_id = ANY($1)' : ''

  // ── Overdue update ────────────────────────────────────────────────────────
  try {
    await sql.query(
      `UPDATE interviews SET status = 'overdue'
       WHERE status = ANY($1)
         AND scheduled_date < CURRENT_DATE
         AND scheduled_date IS NOT NULL`,
      [['pending', 'scheduled']]
    )
  } catch (e) {
    console.error('[dashboard] overdue update error:', e)
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  let totalMembers = 0
  let overdueCount = 0
  let pendingInterviews = 0
  let completedThisMonth = 0

  try {
    const r = await sql.query(
      `SELECT COUNT(*) AS c FROM members m
       WHERE m.status = ANY($${baseParam.length + 1})${chapterWhere}`,
      [...baseParam, ['Actif', 'Renouvellement en cours', 'Postulation en cours']]
    )
    totalMembers = Number((r as any)[0]?.c ?? 0)
  } catch (e) {
    console.error('[dashboard] totalMembers error:', e)
  }

  try {
    const r = await sql.query(
      `SELECT COUNT(*) AS c FROM interviews i
       JOIN members m ON m.id = i.member_id
       WHERE i.status = 'overdue'${chapterWhere}`,
      baseParam
    )
    overdueCount = Number((r as any)[0]?.c ?? 0)
  } catch (e) {
    console.error('[dashboard] overdueCount error:', e)
  }

  try {
    const r = await sql.query(
      `SELECT COUNT(*) AS c FROM interviews i
       JOIN members m ON m.id = i.member_id
       WHERE i.status IN ('pending', 'scheduled')${chapterWhere}`,
      baseParam
    )
    pendingInterviews = Number((r as any)[0]?.c ?? 0)
  } catch (e) {
    console.error('[dashboard] pendingInterviews error:', e)
  }

  try {
    const r = await sql.query(
      `SELECT COUNT(*) AS c FROM interviews i
       JOIN members m ON m.id = i.member_id
       WHERE i.status = 'completed'
         AND DATE_TRUNC('month', i.completed_date) = DATE_TRUNC('month', CURRENT_DATE)${chapterWhere}`,
      baseParam
    )
    completedThisMonth = Number((r as any)[0]?.c ?? 0)
  } catch (e) {
    console.error('[dashboard] completedThisMonth error:', e)
  }

  // ── Upcoming interviews (pending/scheduled/overdue, soonest first) ────────
  let upcoming: unknown[] = []
  try {
    const r = await sql.query(
      `SELECT i.id, i.member_id, i.type, i.scheduled_date, i.completed_date,
              i.status, i.created_at, i.updated_at,
              (m.first_name || ' ' || m.last_name) AS member_name,
              m.company, m.intro_date
       FROM interviews i
       JOIN members m ON m.id = i.member_id
       WHERE i.status IN ('pending', 'scheduled', 'overdue')${chapterWhere}
       ORDER BY
         CASE WHEN i.status = 'overdue' THEN 0 ELSE 1 END,
         i.scheduled_date ASC NULLS LAST
       LIMIT 10`,
      baseParam
    )
    upcoming = (r as unknown as any[]) ?? []
  } catch (e) {
    console.error('[dashboard] upcoming error:', e)
  }

  // ── Recent completed interviews ───────────────────────────────────────────
  let recent: unknown[] = []
  try {
    const r = await sql.query(
      `SELECT i.id, i.member_id, i.type, i.completed_date, i.status,
              i.created_at, i.updated_at,
              (m.first_name || ' ' || m.last_name) AS member_name,
              m.company
       FROM interviews i
       JOIN members m ON m.id = i.member_id
       WHERE i.status = 'completed'${chapterWhere}
       ORDER BY i.completed_date DESC NULLS LAST
       LIMIT 5`,
      baseParam
    )
    recent = (r as unknown as any[]) ?? []
  } catch (e) {
    console.error('[dashboard] recent error:', e)
  }

  // ── Members by chapter × phase ────────────────────────────────────────────
  let byChapterPhase: unknown[] = []
  try {
    const r = await sql.query(
      `SELECT
         c.name AS chapter_name,
         CASE
           WHEN FLOOR((CURRENT_DATE - m.intro_date) / 30.44) < 3  THEN 'Onboarding'
           WHEN FLOOR((CURRENT_DATE - m.intro_date) / 30.44) < 6  THEN '3 mois'
           WHEN FLOOR((CURRENT_DATE - m.intro_date) / 30.44) < 10 THEN '7 mois'
           ELSE 'Renouvellement'
         END AS phase,
         COUNT(*) AS count
       FROM members m
       JOIN chapters c ON c.id = m.chapter_id
       WHERE m.status = ANY($${baseParam.length + 1})${chapterWhere}
       GROUP BY c.name, 2
       ORDER BY c.name`,
      [...baseParam, ['Actif', 'Renouvellement en cours', 'Postulation en cours']]
    )
    byChapterPhase = (r as unknown as any[]) ?? []
  } catch (e) {
    console.error('[dashboard] byChapterPhase error:', e)
  }

  return NextResponse.json({
    stats: { totalMembers, pendingInterviews, completedThisMonth, overdueCount },
    upcoming,
    recent,
    byChapterPhase,
  })
}
