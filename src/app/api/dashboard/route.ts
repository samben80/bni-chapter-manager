import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    return await dashboardHandler(req)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const stack = e instanceof Error ? e.stack : undefined
    console.error('[dashboard] UNCAUGHT ERROR:', msg, stack)
    return NextResponse.json(
      { error: msg, stack, stats: { totalMembers: 0, pendingInterviews: 0, completedThisMonth: 0, overdueCount: 0 }, upcoming: [], recent: [], byChapterPhase: [] },
      { status: 200 }
    )
  }
}

async function dashboardHandler(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  let session
  try {
    session = await getSession(req)
  } catch (e) {
    console.error('[dashboard] getSession threw:', e)
    return unauthorized()
  }
  if (!session) return unauthorized()

  console.log('[dashboard] session ok, role:', session.role)

  // ── DIAGNOSTIC: skip all DB calls, return test data ───────────────────────
  console.log('[dashboard] chapterIds:', session.chapterIds, 'type:', typeof session.chapterIds, 'isArray:', Array.isArray(session.chapterIds))
  return NextResponse.json({
    _debug: 'no-db-test',
    stats: { totalMembers: 99, pendingInterviews: 0, completedThisMonth: 0, overdueCount: 0 },
    upcoming: [],
    recent: [],
    byChapterPhase: [],
  })

  const isAdmin = session.role === 'admin'
  const ids: number[] = session.chapterIds ?? []

  // ── Overdue update ────────────────────────────────────────────────────────
  try {
    await sql.query(
      `UPDATE interviews SET status = 'overdue'
       WHERE status IN ('pending','scheduled')
         AND scheduled_date < CURRENT_DATE
         AND scheduled_date IS NOT NULL`
    )
  } catch (e) {
    console.error('[dashboard] overdue update:', e)
  }

  // ── Helper: chapter filter snippet ───────────────────────────────────────
  // Returns {sql: string, params: unknown[]} with $n starting at offset+1
  function chapterClause(alias: string, offset: number) {
    if (isAdmin || ids.length === 0) return { sql: '', params: [] }
    return {
      sql: ` AND ${alias}.chapter_id = ANY($${offset + 1})`,
      params: [ids],
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  let totalMembers = 0
  let overdueCount = 0
  let pendingInterviews = 0
  let completedThisMonth = 0

  try {
    const ch = chapterClause('m', 0)
    const r = await sql.query(
      `SELECT COUNT(*) AS c FROM members m
       WHERE m.status IN ('Actif','Renouvellement en cours','Postulation en cours')${ch.sql}`,
      ch.params
    )
    totalMembers = Number((r as any)[0]?.c ?? 0)
    console.log('[dashboard] totalMembers:', totalMembers)
  } catch (e) { console.error('[dashboard] totalMembers:', e) }

  try {
    const ch = chapterClause('m', 0)
    const r = await sql.query(
      `SELECT COUNT(*) AS c FROM interviews i
       JOIN members m ON m.id = i.member_id
       WHERE i.status = 'overdue'${ch.sql}`,
      ch.params
    )
    overdueCount = Number((r as any)[0]?.c ?? 0)
  } catch (e) { console.error('[dashboard] overdueCount:', e) }

  try {
    const ch = chapterClause('m', 0)
    const r = await sql.query(
      `SELECT COUNT(*) AS c FROM interviews i
       JOIN members m ON m.id = i.member_id
       WHERE i.status IN ('pending','scheduled')${ch.sql}`,
      ch.params
    )
    pendingInterviews = Number((r as any)[0]?.c ?? 0)
  } catch (e) { console.error('[dashboard] pendingInterviews:', e) }

  try {
    const ch = chapterClause('m', 0)
    const r = await sql.query(
      `SELECT COUNT(*) AS c FROM interviews i
       JOIN members m ON m.id = i.member_id
       WHERE i.status = 'completed'
         AND DATE_TRUNC('month', i.completed_date) = DATE_TRUNC('month', CURRENT_DATE)${ch.sql}`,
      ch.params
    )
    completedThisMonth = Number((r as any)[0]?.c ?? 0)
  } catch (e) { console.error('[dashboard] completedThisMonth:', e) }

  // ── Upcoming ──────────────────────────────────────────────────────────────
  let upcoming: unknown[] = []
  try {
    const ch = chapterClause('m', 0)
    const r = await sql.query(
      `SELECT i.id, i.member_id, i.type, i.scheduled_date, i.completed_date,
              i.status, i.created_at, i.updated_at,
              (m.first_name || ' ' || m.last_name) AS member_name,
              m.company, m.intro_date
       FROM interviews i
       JOIN members m ON m.id = i.member_id
       WHERE i.status IN ('pending','scheduled','overdue')${ch.sql}
       ORDER BY CASE WHEN i.status='overdue' THEN 0 ELSE 1 END,
                i.scheduled_date ASC NULLS LAST
       LIMIT 10`,
      ch.params
    )
    upcoming = (r as unknown as unknown[]) ?? []
  } catch (e) { console.error('[dashboard] upcoming:', e) }

  // ── Recent ────────────────────────────────────────────────────────────────
  let recent: unknown[] = []
  try {
    const ch = chapterClause('m', 0)
    const r = await sql.query(
      `SELECT i.id, i.member_id, i.type, i.completed_date, i.status,
              i.created_at, i.updated_at,
              (m.first_name || ' ' || m.last_name) AS member_name,
              m.company
       FROM interviews i
       JOIN members m ON m.id = i.member_id
       WHERE i.status = 'completed'${ch.sql}
       ORDER BY i.completed_date DESC NULLS LAST
       LIMIT 5`,
      ch.params
    )
    recent = (r as unknown as unknown[]) ?? []
  } catch (e) { console.error('[dashboard] recent:', e) }

  // ── Members by chapter × phase ────────────────────────────────────────────
  let byChapterPhase: unknown[] = []
  try {
    const ch = chapterClause('m', 0)
    const r = await sql.query(
      `SELECT c.name AS chapter_name,
              CASE
                WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - m.intro_date)) / 2592000 < 3  THEN 'Onboarding'
                WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - m.intro_date)) / 2592000 < 6  THEN '3 mois'
                WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - m.intro_date)) / 2592000 < 10 THEN '7 mois'
                ELSE 'Renouvellement'
              END AS phase,
              COUNT(*)::int AS count
       FROM members m
       JOIN chapters c ON c.id = m.chapter_id
       WHERE m.status IN ('Actif','Renouvellement en cours','Postulation en cours')${ch.sql}
       GROUP BY c.name, 2
       ORDER BY c.name`,
      ch.params
    )
    byChapterPhase = (r as unknown as unknown[]) ?? []
  } catch (e) { console.error('[dashboard] byChapterPhase:', e) }

  return NextResponse.json({
    stats: { totalMembers, pendingInterviews, completedThisMonth, overdueCount },
    upcoming,
    recent,
    byChapterPhase,
  })
}
