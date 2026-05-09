import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()

  // ── diagnostic: test DB connection first ──────────────────────────────────
  try {
    const ping = await sql`SELECT 1 AS ok`
    if (!ping) throw new Error('DB ping returned nothing')
  } catch (e) {
    return NextResponse.json({ error: 'DB_CONNECTION: ' + String(e) }, { status: 500 })
  }
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const isAdmin = session.role === 'admin'
    const cids: number[] = !isAdmin ? (session.chapterIds ?? []) : []

    // Mark overdue
    if (isAdmin) {
      await sql`
        UPDATE interviews SET status = 'overdue'
        WHERE status IN ('pending', 'scheduled')
          AND scheduled_date < CURRENT_DATE
          AND scheduled_date IS NOT NULL
      `
    } else if (cids.length > 0) {
      await sql`
        UPDATE interviews SET status = 'overdue'
        WHERE status IN ('pending', 'scheduled')
          AND scheduled_date < CURRENT_DATE
          AND scheduled_date IS NOT NULL
          AND member_id IN (SELECT id FROM members WHERE chapter_id = ANY(${cids}))
      `
    }

    if (!isAdmin && cids.length === 0) {
      // DC with no chapters assigned — return empty data
      return NextResponse.json({
        stats: { totalMembers: 0, pendingInterviews: 0, completedThisMonth: 0, overdueCount: 0 },
        upcoming: [],
        recent: [],
        byChapterPhase: [],
      })
    }

    // All queries using tagged templates only (no sql.query)
    const [
      totalMembersRows,
      pendingRows,
      completedRows,
      overdueRows,
      upcoming,
      recent,
      byChapterPhase,
    ] = await Promise.all([
      isAdmin
        ? sql`SELECT COUNT(*) AS c FROM members m WHERE m.status IN ('Actif', 'Renouvellement en cours', 'Postulation en cours')`
        : sql`SELECT COUNT(*) AS c FROM members m WHERE m.status IN ('Actif', 'Renouvellement en cours', 'Postulation en cours') AND m.chapter_id = ANY(${cids})`,

      isAdmin
        ? sql`SELECT COUNT(*) AS c FROM interviews i JOIN members m ON m.id = i.member_id WHERE i.status IN ('pending', 'overdue')`
        : sql`SELECT COUNT(*) AS c FROM interviews i JOIN members m ON m.id = i.member_id WHERE i.status IN ('pending', 'overdue') AND m.chapter_id = ANY(${cids})`,

      isAdmin
        ? sql`SELECT COUNT(*) AS c FROM interviews i JOIN members m ON m.id = i.member_id WHERE i.status = 'completed' AND TO_CHAR(i.completed_date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')`
        : sql`SELECT COUNT(*) AS c FROM interviews i JOIN members m ON m.id = i.member_id WHERE i.status = 'completed' AND TO_CHAR(i.completed_date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM') AND m.chapter_id = ANY(${cids})`,

      isAdmin
        ? sql`SELECT COUNT(*) AS c FROM interviews WHERE status = 'overdue'`
        : sql`SELECT COUNT(*) AS c FROM interviews i JOIN members m ON m.id = i.member_id WHERE i.status = 'overdue' AND m.chapter_id = ANY(${cids})`,

      isAdmin
        ? sql`SELECT i.*, m.first_name || ' ' || m.last_name AS member_name, m.company, m.intro_date, a.first_name || ' ' || a.last_name AS ambassador_name FROM interviews i JOIN members m ON m.id = i.member_id LEFT JOIN ambassadors a ON a.id = i.ambassador_id WHERE i.status IN ('pending', 'scheduled', 'overdue') AND m.status IN ('Actif', 'Renouvellement en cours', 'Postulation en cours') ORDER BY CASE i.status WHEN 'overdue' THEN 0 ELSE 1 END, CASE WHEN i.scheduled_date IS NULL THEN '9999-12-31'::date ELSE i.scheduled_date END ASC LIMIT 15`
        : sql`SELECT i.*, m.first_name || ' ' || m.last_name AS member_name, m.company, m.intro_date, a.first_name || ' ' || a.last_name AS ambassador_name FROM interviews i JOIN members m ON m.id = i.member_id LEFT JOIN ambassadors a ON a.id = i.ambassador_id WHERE i.status IN ('pending', 'scheduled', 'overdue') AND m.status IN ('Actif', 'Renouvellement en cours', 'Postulation en cours') AND m.chapter_id = ANY(${cids}) ORDER BY CASE i.status WHEN 'overdue' THEN 0 ELSE 1 END, CASE WHEN i.scheduled_date IS NULL THEN '9999-12-31'::date ELSE i.scheduled_date END ASC LIMIT 15`,

      isAdmin
        ? sql`SELECT i.*, m.first_name || ' ' || m.last_name AS member_name, m.company, a.first_name || ' ' || a.last_name AS ambassador_name FROM interviews i JOIN members m ON m.id = i.member_id LEFT JOIN ambassadors a ON a.id = i.ambassador_id WHERE i.status = 'completed' ORDER BY i.completed_date DESC LIMIT 5`
        : sql`SELECT i.*, m.first_name || ' ' || m.last_name AS member_name, m.company, a.first_name || ' ' || a.last_name AS ambassador_name FROM interviews i JOIN members m ON m.id = i.member_id LEFT JOIN ambassadors a ON a.id = i.ambassador_id WHERE i.status = 'completed' AND m.chapter_id = ANY(${cids}) ORDER BY i.completed_date DESC LIMIT 5`,

      isAdmin
        ? sql`SELECT COALESCE(c.name, 'Sans chapitre') AS chapter_name, CASE WHEN FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int < 3 THEN 'Onboarding' WHEN FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int < 7 THEN '3 mois' WHEN FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int < 10 THEN '7 mois' ELSE 'Renouvellement' END AS phase, COUNT(*) AS count FROM members m LEFT JOIN chapters c ON c.id = m.chapter_id WHERE m.status IN ('Actif', 'Renouvellement en cours', 'Postulation en cours') GROUP BY chapter_name, phase ORDER BY chapter_name, phase`
        : sql`SELECT COALESCE(c.name, 'Sans chapitre') AS chapter_name, CASE WHEN FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int < 3 THEN 'Onboarding' WHEN FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int < 7 THEN '3 mois' WHEN FLOOR((CURRENT_DATE - m.intro_date) / 30.44)::int < 10 THEN '7 mois' ELSE 'Renouvellement' END AS phase, COUNT(*) AS count FROM members m LEFT JOIN chapters c ON c.id = m.chapter_id WHERE m.status IN ('Actif', 'Renouvellement en cours', 'Postulation en cours') AND m.chapter_id = ANY(${cids}) GROUP BY chapter_name, phase ORDER BY chapter_name, phase`,
    ])

    return NextResponse.json({
      stats: {
        totalMembers: Number(totalMembersRows[0]?.c ?? 0),
        pendingInterviews: Number(pendingRows[0]?.c ?? 0),
        completedThisMonth: Number(completedRows[0]?.c ?? 0),
        overdueCount: Number(overdueRows[0]?.c ?? 0),
      },
      upcoming,
      recent,
      byChapterPhase,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[dashboard]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
