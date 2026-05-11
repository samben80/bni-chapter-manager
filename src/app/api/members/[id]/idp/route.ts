import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  if (!session) return unauthorized()
  const { id } = await params

  // Return IDP records for the last 6 months
  const rows = await sql`
    SELECT
      id, report_date,
      presences, absences, retards, m_col, substituts,
      rdi, rde, rri, rre, invites, tet, mpb, ueg
    FROM member_idp
    WHERE member_id = ${id}
      AND report_date >= CURRENT_DATE - INTERVAL '6 months'
    ORDER BY report_date ASC
  `
  return NextResponse.json(rows)
}
