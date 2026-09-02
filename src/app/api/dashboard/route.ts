import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized, resolveAmbassadorRole, ONBOARDING_INTERVIEW_TYPES } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()

  const isAdmin = session.role === 'admin'
  const ids: number[] = Array.isArray(session.chapterIds) ? session.chapterIds : []

  // Resolve interview type restriction for onboarding ambassadors
  const ambRole = await resolveAmbassadorRole(session)
  const isOnboarding = session.role === 'amb' && ambRole === 'onboarding'
  const typeFilter = isOnboarding
    ? sql`AND i.type = ANY(${[...ONBOARDING_INTERVIEW_TYPES]})`
    : sql``

  // ── Overdue update ──────────────────────────────────────────────────────
  try {
    await sql`
      UPDATE interviews SET status = 'overdue'
      WHERE status IN ('pending','scheduled')
        AND scheduled_date < CURRENT_DATE
        AND scheduled_date IS NOT NULL`
  } catch { /* non-fatal */ }

  // ── Auto-complete stale preboarding (> 3 mois sans réalisation) ──────────
  try {
    await sql`
      UPDATE interviews
      SET status = 'completed',
          completed_date = scheduled_date
      WHERE type = 'preboarding'
        AND status != 'completed'
        AND scheduled_date < CURRENT_DATE - INTERVAL '3 months'`
  } catch { /* non-fatal */ }

  // ── Backfill missing preboarding interviews ──────────────────────────────
  // - Intronisations >= 2026-04-01 : overdue si date passée, sinon scheduled
  // - Intronisations antérieures    : completed (déjà réalisé avant le suivi)
  try {
    await sql`
      INSERT INTO interviews (member_id, type, scheduled_date, status, completed_date)
      SELECT
        m.id, 'preboarding', m.intro_date::date,
        CASE
          WHEN m.intro_date::date < '2026-04-01'::date THEN 'completed'
          WHEN m.intro_date::date < CURRENT_DATE       THEN 'overdue'
          ELSE 'scheduled'
        END,
        CASE
          WHEN m.intro_date::date < '2026-04-01'::date THEN m.intro_date::date
          ELSE NULL
        END
      FROM members m
      WHERE m.intro_date IS NOT NULL
        AND m.status IN ('Actif','Renouvellement en cours','Postulation en cours')
        AND NOT EXISTS (
          SELECT 1 FROM interviews i
          WHERE i.member_id = m.id AND i.type = 'preboarding'
        )
      ON CONFLICT (member_id, type) DO NOTHING`
  } catch { /* non-fatal */ }

  // ── Preboarding visibility filters ──────────────────────────────────────
  // upcoming  : masquer preboarding en retard de > 3 mois
  // overdue   : afficher preboarding uniquement si retard entre 6 mois et 1 an
  const prebUpcomingExclude = sql`
    AND NOT (i.type = 'preboarding'
             AND i.scheduled_date < CURRENT_DATE - INTERVAL '3 months')`
  const prebOverdueInclude = sql`
    AND (i.type != 'preboarding' OR (
          i.scheduled_date <  CURRENT_DATE - INTERVAL '6 months'
      AND i.scheduled_date >= CURRENT_DATE - INTERVAL '1 year'))`

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
                  WHERE i.status = 'overdue'
                  ${prebOverdueInclude}
                  ${typeFilter}`
      : ids.length === 0 ? []
      : await sql`SELECT COUNT(*)::int AS c FROM interviews i
                  JOIN members m ON m.id = i.member_id
                  WHERE i.status = 'overdue'
                    AND m.chapter_id = ANY(${ids})
                  ${prebOverdueInclude}
                  ${typeFilter}`
    overdueCount = Number((r as { c: number }[])[0]?.c ?? 0)
  } catch { /* non-fatal */ }

  try {
    const r = isAdmin
      ? await sql`SELECT COUNT(*)::int AS c FROM interviews i
                  JOIN members m ON m.id = i.member_id
                  WHERE i.status IN ('pending','scheduled')
                  ${typeFilter}`
      : ids.length === 0 ? []
      : await sql`SELECT COUNT(*)::int AS c FROM interviews i
                  JOIN members m ON m.id = i.member_id
                  WHERE i.status IN ('pending','scheduled')
                    AND m.chapter_id = ANY(${ids})
                  ${typeFilter}`
    pendingInterviews = Number((r as { c: number }[])[0]?.c ?? 0)
  } catch { /* non-fatal */ }

  try {
    const r = isAdmin
      ? await sql`SELECT COUNT(*)::int AS c FROM interviews i
                  JOIN members m ON m.id = i.member_id
                  WHERE i.status = 'completed'
                    AND DATE_TRUNC('month', i.completed_date) = DATE_TRUNC('month', CURRENT_DATE)
                  ${typeFilter}`
      : ids.length === 0 ? []
      : await sql`SELECT COUNT(*)::int AS c FROM interviews i
                  JOIN members m ON m.id = i.member_id
                  WHERE i.status = 'completed'
                    AND DATE_TRUNC('month', i.completed_date) = DATE_TRUNC('month', CURRENT_DATE)
                    AND m.chapter_id = ANY(${ids})
                  ${typeFilter}`
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
          ${prebUpcomingExclude}
          ${typeFilter}
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
          ${prebUpcomingExclude}
          ${typeFilter}
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
          ${typeFilter}
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
          ${typeFilter}
          ORDER BY i.completed_date DESC NULLS LAST
          LIMIT 5`
  } catch { /* non-fatal */ }

  // Phase expression reusable: days since intro / 30.44
  // (CURRENT_DATE - date) returns integer days in PostgreSQL — no EXTRACT needed
  const phaseExpr = sql`
    CASE
      WHEN m.intro_date IS NULL                                  THEN 'Renouvellement'
      WHEN (CURRENT_DATE - m.intro_date::date) < 91             THEN 'Onboarding'
      WHEN (CURRENT_DATE - m.intro_date::date) < 183            THEN '3 mois'
      WHEN (CURRENT_DATE - m.intro_date::date) < 304            THEN '7 mois'
      ELSE 'Renouvellement'
    END
  `

  // ── Phase totals (for timeline) ──────────────────────────────────────────
  let phaseTotals: unknown[] = []
  try {
    phaseTotals = isAdmin
      ? await sql`
          SELECT ${phaseExpr} AS phase, COUNT(*)::int AS count
          FROM members m
          WHERE m.status IN ('Actif','Renouvellement en cours','Postulation en cours')
          GROUP BY 1`
      : ids.length === 0 ? []
      : await sql`
          SELECT ${phaseExpr} AS phase, COUNT(*)::int AS count
          FROM members m
          WHERE m.status IN ('Actif','Renouvellement en cours','Postulation en cours')
            AND m.chapter_id = ANY(${ids})
          GROUP BY 1`
  } catch { /* non-fatal */ }

  // ── Members by chapter × phase ───────────────────────────────────────────
  let byChapterPhase: unknown[] = []
  try {
    byChapterPhase = isAdmin
      ? await sql`
          SELECT c.name AS chapter_name,
                 ${phaseExpr} AS phase,
                 COUNT(*)::int AS count
          FROM members m
          JOIN chapters c ON c.id = m.chapter_id
          WHERE m.status IN ('Actif','Renouvellement en cours','Postulation en cours')
          GROUP BY c.name, 2
          ORDER BY c.name`
      : ids.length === 0 ? []
      : await sql`
          SELECT c.name AS chapter_name,
                 ${phaseExpr} AS phase,
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
    phaseTotals,
  })
}
