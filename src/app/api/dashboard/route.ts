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

  console.log('[dashboard] session ok, role:', session.role)

  let totalMembers = 0
  let overdueCount = 0

  try {
    const r = await sql.query(
      `SELECT COUNT(*) AS c FROM members WHERE status = ANY($1)`,
      [['Actif', 'Renouvellement en cours', 'Postulation en cours']]
    )
    totalMembers = Number((r as unknown as {c: string}[])[0]?.c ?? 0)
    console.log('[dashboard] totalMembers:', totalMembers)
  } catch (e) {
    console.error('[dashboard] members count error:', e)
  }

  try {
    await sql.query(
      `UPDATE interviews SET status = 'overdue' WHERE status = ANY($1) AND scheduled_date < CURRENT_DATE AND scheduled_date IS NOT NULL`,
      [['pending', 'scheduled']]
    )
  } catch (e) {
    console.error('[dashboard] overdue update error:', e)
  }

  try {
    const r = await sql.query(`SELECT COUNT(*) AS c FROM interviews WHERE status = 'overdue'`)
    overdueCount = Number((r as unknown as {c: string}[])[0]?.c ?? 0)
    console.log('[dashboard] overdueCount:', overdueCount)
  } catch (e) {
    console.error('[dashboard] overdue count error:', e)
  }

  return NextResponse.json({
    stats: {
      totalMembers,
      pendingInterviews: 0,
      completedThisMonth: 0,
      overdueCount,
    },
    upcoming: [],
    recent: [],
    byChapterPhase: [],
  })
}
