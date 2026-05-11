import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()

  const isAdmin = session.role === 'admin'
  const ids: number[] = Array.isArray(session.chapterIds) ? session.chapterIds : []

  // ── Overdue update ──────────────────────────────────────────────────────
  try {
    await sql`
      UPDATE interviews SET status = 'overdue'
      WHERE status IN ('pending','scheduled')
        AND scheduled_date < CURRENT_DATE
        AND scheduled_date IS NOT NULL`
  } catch { /* non-fatal */ }

  // ── Stats ────────────────────────────────────────────────────────────────
  let totalMembers = 0
  let overdueCount = 0
  let pendingInterviews = 0
  let completedThisMonth = 0

  try {
    const r = isAdmin
      ? await sql`SELECT COUNT(*)::int AS c FROM members m
                  WHERE m.status IN ('Actif','Renouvellement en cours','Postulation en cours')`
      : ids.length === 0 ? []
      : await sql`SELECT COUNT(*)::int AS c FROM members m
                  WHERE m.status IN ('Actif','Renouvellement en cours','Postulation en cours')
                    AND m.chapter_id = ANY(${ids})`
    totalMembers = Number((r as { c: number }[])[0]?.c ?? 0)
  } catch { /* non-fatal */ }

  try {
    const r = isAdmin
      ? await sql`SELECT COUNT(*)::int AS c FROM interviews i
                  JOIN members m ON m.id = i.member_id
                  WHERE i.status = 'overdue'`
      : ids.length === 0 ? []
      : await sql`SELECT COUNT(*)::int AS c FROM interviews i
                  JOIN members m ON m.id = i.member_id
                  WHERE i.status = 'overdue'
                    AND m.chapter_id = ANY(${ids})`
    overdueCount = Number((r as { c: number }[])[0]?.c ?? 0)
  } catch { /* non-fatal */ }

  try {
    const r = isAdmin
      ? await sql`SELECT COUNT(*)::int AS c FROM interviews i
                  JOIN members m ON m.id = i.member_id
                  WHERE i.status IN ('pending','scheduled')`
      : ids.length === 0 ? []
      : await sql`SELECT COUNT(*)::int AS c FROM interviews i
                  JOIN members m ON m.id = i.member_id
                  WHERE i.status IN ('pending','scheduled')
                    AND m.chapter_id = ANY(${ids})`
    pendingInterviews = Number((r as { c: number }[])[0]?.c ?? 0)
  } catch { /* non-fatal */ }

  try {
    const r = isAdmin
      ? await sql`SELECT COUNT(*)::int AS c FROM interviews i
                  JOIN members m ON m.id = i.member_id
                  WHERE i.status = 'completed'
                    AND DATE_TRUNC('month', i.completed_date) = DATE_TRUNC('month', CURRENT_DATE)`
      : ids.length === 0 ? []
      : await sql`SELECT COUNT(*)::int AS c FROM interviews i
                  JOIN members m ON m.id = i.member_id
                  WHERE i.status = 'completed'
                    AND DATE_TRUNC('month', i.completed_date) = DATE_TRUNC('month', CURRENT_DATE)
                    AND m.chapter_id = ANY(${ids})`
    completedThisMonth = Number((r as { c: number }[])[0]?.c ?? 0)
  } catch { /* non-fatal */ }

  // ── Upcoming interviews ──────────────────────────────────────────────────
  let upcoming: unknown[] = []
  try {
    upcoming = isAdmin
      ? await sql`
          SELECT i.id, i.member_id, i.type, i.scheduled_date, i.completed_date,
                 i.status, i.created_at, i.updated_at,
                 (m.first_name || ' ' || m.last_name) AS member_name,
                 m.company, m.intro_date
          FROM interviews i
          JOIN members m ON m.id = i.member_id
          WHERE i.status IN ('pending','scheduled','overdue')
          ORDER BY CASE WHEN i.status='overdue' THEN 0 ELSE 1 END,
                   i.scheduled_date ASC NULLS LAST
          LIMIT 10`
      : ids.length === 0 ? []
      : await sql`
          SELECT i.id, i.member_id, i.type, i.scheduled_date, i.completed_date,
                 i.status, i.created_at, i.updated_at,
                 (m.first_name || ' ' || m.last_name) AS member_name,
                 m.company, m.intro_date
          FROM interviews i
          JOIN members m ON m.id = i.member_id
          WHERE i.status IN ('pending','scheduled','overdue')
            AND m.chapter_id = ANY(${ids})
          ORDER BY CASE WHEN i.status='overdue' THEN 0 ELSE 1 END,
                   i.scheduled_date ASC NULLS LAST
          LIMIT 10`
  } catch { /* non-fatal */ }

  // ── Recent interviews ────────────────────────────────────────────────────
  let recent: unknown[] = []
  try {
    recent = isAdmin
      ? await sql`
          SELECT i.id, i.member_id, i.type, i.completed_date, i.status,
                 i.created_at, i.updated_at,
                 (m.first_name || ' ' || m.last_name) AS member_name,
                 m.company
          FROM interviews i
          JOIN members m ON m.id = i.member_id
          WHERE i.status = 'completed'
          ORDER BY i.completed_date DESC NULLS LAST
          LIMIT 5`
      : ids.length === 0 ? []
      : await sql`
          SELECT i.id, i.member_id, i.type, i.completed_date, i.status,
                 i.created_at, i.updated_at,
                 (m.first_name || ' ' || m.last_name) AS member_name,
                 m.company
          FROM interviews i
          JOIN members m ON m.id = i.member_id
          WHERE i.status = 'completed'
            AND m.chapter_id = ANY(${ids})
          ORDER BY i.completed_date DESC NULLS LAST
          LIMIT 5`
  } catch { /* non-fatal */ }

  // ── Members by chapter × phase ───────────────────────────────────────────
  let byChapterPhase: unknown[] = []
  try {
    byChapterPhase = isAdmin
      ? await sql`
          SELECT c.name AS chapter_name,
                 CASE
                   WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - m.intro_date)) / 2592000 < 3  THEN 'Onboarding'
                   WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - m.intro_date)) / 2592000 < 6  THEN '3 mois'
                   WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - m.intro_date)) / 2592000 < 10 THEN '7 mois'
                   ELSE 'Renouvellement'
                 END AS phase,
                 COUNT(*)::int AS count
          FROM members m
          JOIN chapters c ON c.id = m.chapter_id
          WHERE m.status IN ('Actif','Renouvellement en cours','Postulation en cours')
          GROUP BY c.name, 2
          ORDER BY c.name`
      : ids.length === 0 ? []
      : await sql`
          SELECT c.name AS chapter_name,
                 CASE
                   WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - m.intro_date)) / 2592000 < 3  THEN 'Onboarding'
                   WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - m.intro_date)) / 2592000 < 6  THEN '3 mois'
                   WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - m.intro_date)) / 2592000 < 10 THEN '7 mois'
                   ELSE 'Renouvellement'
                 END AS phase,
                 COUNT(*)::int AS count
          FROM members m
          JOIN chapters c ON c.id = m.chapter_id
          WHERE m.status IN ('Actif','Renouvellement en cours','Postulation en cours')
            AND m.chapter_id = ANY(${ids})
          GROUP BY c.name, 2
          ORDER BY c.name`
  } catch { /* non-fatal */ }

  return NextResponse.json({
    stats: { totalMembers, pendingInterviews, completedThisMonth, overdueCount },
    upcoming,
    recent,
    byChapterPhase,
  })
}
