import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
  // Mark overdue first so counts are accurate
  const overdueRows = await sql`
    UPDATE interviews SET status = 'overdue'
    WHERE status IN ('pending', 'scheduled')
      AND scheduled_date < CURRENT_DATE
      AND scheduled_date IS NOT NULL
    RETURNING id
  `
  const overdueCount = overdueRows.length

  // Run all remaining queries in parallel
  const [
    [{ c: totalMembers }],
    [{ c: pendingInterviews }],
    [{ c: completedThisMonth }],
    upcoming,
    recent,
    byChapterPhase,
  ] = await Promise.all([
    sql`SELECT COUNT(*) AS c FROM members WHERE status = 'active'`,
    sql`SELECT COUNT(*) AS c FROM interviews WHERE status IN ('pending', 'overdue')`,
    sql`SELECT COUNT(*) AS c FROM interviews WHERE status = 'completed' AND TO_CHAR(completed_date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')`,
    sql`
      SELECT i.*,
        m.first_name || ' ' || m.last_name AS member_name,
        m.company, m.intro_date,
        a.first_name || ' ' || a.last_name AS ambassador_name
      FROM interviews i
      JOIN members m ON m.id = i.member_id
      LEFT JOIN ambassadors a ON a.id = i.ambassador_id
      WHERE i.status IN ('pending', 'scheduled', 'overdue')
        AND m.status = 'active'
      ORDER BY
        CASE i.status WHEN 'overdue' THEN 0 ELSE 1 END,
        CASE WHEN i.scheduled_date IS NULL THEN '9999-12-31'::date ELSE i.scheduled_date END ASC
      LIMIT 15
    `,
    sql`
      SELECT i.*,
        m.first_name || ' ' || m.last_name AS member_name,
        m.company,
        a.first_name || ' ' || a.last_name AS ambassador_name
      FROM interviews i
      JOIN members m ON m.id = i.member_id
      LEFT JOIN ambassadors a ON a.id = i.ambassador_id
      WHERE i.status = 'completed'
      ORDER BY i.completed_date DESC
      LIMIT 5
    `,
    sql`
      SELECT
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
      WHERE m.status = 'active'
      GROUP BY chapter_name, phase
      ORDER BY chapter_name, sort_key
    `,
  ])

  return NextResponse.json({
    stats: { totalMembers: Number(totalMembers), pendingInterviews: Number(pendingInterviews), completedThisMonth: Number(completedThisMonth), overdueCount },
    upcoming,
    recent,
    byChapterPhase,
  })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
