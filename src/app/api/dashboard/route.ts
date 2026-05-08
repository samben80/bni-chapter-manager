import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()

  try {
  const isAdmin = session.role === 'admin'
  const cids = !isAdmin ? session.chapterIds : []

  // chapter filter fragment for queries that join members
  const chWhere = (alias = 'm') => !isAdmin && cids.length > 0
    ? `AND ${alias}.chapter_id = ANY($1::int[])`
    : (!isAdmin ? 'AND FALSE' : '')
  const params = !isAdmin && cids.length > 0 ? [cids] : []

  // Mark overdue first so counts are accurate
  const overdueRows = await (isAdmin
    ? sql`
        UPDATE interviews SET status = 'overdue'
        WHERE status IN ('pending', 'scheduled')
          AND scheduled_date < CURRENT_DATE
          AND scheduled_date IS NOT NULL
        RETURNING id
      `
    : cids.length > 0
      ? sql.query(
          `UPDATE interviews SET status = 'overdue'
           WHERE status IN ('pending', 'scheduled')
             AND scheduled_date < CURRENT_DATE
             AND scheduled_date IS NOT NULL
             AND member_id IN (SELECT id FROM members WHERE chapter_id = ANY($1))
           RETURNING id`,
          [cids]
        ).then(r => r.rows)
      : Promise.resolve([])
  )
  const overdueCount = Array.isArray(overdueRows) ? overdueRows.length : 0

  const [
    [{ c: totalMembers }],
    [{ c: pendingInterviews }],
    [{ c: completedThisMonth }],
    upcoming,
    recent,
    byChapterPhase,
  ] = await Promise.all([
    sql.query(
      `SELECT COUNT(*) AS c FROM members m
       WHERE m.status IN ('Actif', 'Renouvellement en cours', 'Postulation en cours')
       ${chWhere()}`,
      params
    ).then(r => r.rows),

    sql.query(
      `SELECT COUNT(*) AS c FROM interviews i
       JOIN members m ON m.id = i.member_id
       WHERE i.status IN ('pending', 'overdue')
       ${chWhere()}`,
      params
    ).then(r => r.rows),

    sql.query(
      `SELECT COUNT(*) AS c FROM interviews i
       JOIN members m ON m.id = i.member_id
       WHERE i.status = 'completed'
         AND TO_CHAR(i.completed_date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
       ${chWhere()}`,
      params
    ).then(r => r.rows),

    sql.query(
      `SELECT i.*,
         m.first_name || ' ' || m.last_name AS member_name,
         m.company, m.intro_date,
         a.first_name || ' ' || a.last_name AS ambassador_name
       FROM interviews i
       JOIN members m ON m.id = i.member_id
       LEFT JOIN ambassadors a ON a.id = i.ambassador_id
       WHERE i.status IN ('pending', 'scheduled', 'overdue')
         AND m.status IN ('Actif', 'Renouvellement en cours', 'Postulation en cours')
         ${chWhere()}
       ORDER BY
         CASE i.status WHEN 'overdue' THEN 0 ELSE 1 END,
         CASE WHEN i.scheduled_date IS NULL THEN '9999-12-31'::date ELSE i.scheduled_date END ASC
       LIMIT 15`,
      params
    ).then(r => r.rows),

    sql.query(
      `SELECT i.*,
         m.first_name || ' ' || m.last_name AS member_name,
         m.company,
         a.first_name || ' ' || a.last_name AS ambassador_name
       FROM interviews i
       JOIN members m ON m.id = i.member_id
       LEFT JOIN ambassadors a ON a.id = i.ambassador_id
       WHERE i.status = 'completed'
         ${chWhere()}
       ORDER BY i.completed_date DESC
       LIMIT 5`,
      params
    ).then(r => r.rows),

    sql.query(
      `SELECT
         COALESCE(c.name, 'Sans chapitre') AS chapter_name,
         CASE
           WHEN FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int < 3 THEN 'Onboarding'
           WHEN FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int < 7 THEN '3 mois'
           WHEN FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int < 10 THEN '7 mois'
           ELSE 'Renouvellement'
         END AS phase,
         COUNT(*) AS count,
         MIN(FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int) AS sort_key
       FROM members m
       LEFT JOIN chapters c ON c.id = m.chapter_id
       WHERE m.status IN ('Actif', 'Renouvellement en cours', 'Postulation en cours')
         ${chWhere()}
       GROUP BY chapter_name, phase
       ORDER BY chapter_name, sort_key`,
      params
    ).then(r => r.rows),
  ])

  return NextResponse.json({
    stats: {
      totalMembers: Number(totalMembers),
      pendingInterviews: Number(pendingInterviews),
      completedThisMonth: Number(completedThisMonth),
      overdueCount,
    },
    upcoming,
    recent,
    byChapterPhase,
  })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
