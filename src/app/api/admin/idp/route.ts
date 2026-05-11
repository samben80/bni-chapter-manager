import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession, forbidden, unauthorized } from '@/lib/auth'
import * as XLSX from 'xlsx'

// GET — list all IDP imports (distinct report dates)
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()
  if (session.role !== 'admin') return forbidden()

  const rows = await sql`
    SELECT report_date, COUNT(*)::int AS member_count
    FROM member_idp
    GROUP BY report_date
    ORDER BY report_date DESC
  `
  return NextResponse.json(rows)
}

// POST — import XLS file (admin only)
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()
  if (session.role !== 'admin') return forbidden()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const reportDateStr = formData.get('report_date') as string | null

  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  if (!reportDateStr) return NextResponse.json({ error: 'Date du rapport manquante' }, { status: 400 })

  const reportDate = new Date(reportDateStr)
  if (isNaN(reportDate.getTime())) {
    return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
  }

  // Parse the XLS/XLSX file with SheetJS
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: 0 })

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Fichier vide ou format non reconnu' }, { status: 400 })
  }

  // Verify required columns
  const first = rows[0]
  const required = ['Groupe', 'Prénom', 'Nom']
  for (const col of required) {
    if (!(col in first)) {
      return NextResponse.json(
        { error: `Colonne manquante : "${col}". Vérifiez le format du fichier.` },
        { status: 400 }
      )
    }
  }

  let imported = 0
  let notFound = 0
  const notFoundList: string[] = []

  for (const row of rows) {
    const firstName = String(row['Prénom'] ?? '').trim()
    const lastName  = String(row['Nom'] ?? '').trim()
    const groupe    = String(row['Groupe'] ?? '').trim()

    if (!firstName && !lastName) continue

    // Match member: try exact first+last, then swapped (file sometimes has Nom/Prénom inverted)
    // Also extract chapter name from "MC-01 CASA CONNECTIONS,MA" → normalize
    const chapterNamePart = groupe.replace(/^MC-\d+\s+/, '').replace(/,MA$/, '').trim()

    const [member] = await sql`
      SELECT m.id FROM members m
      LEFT JOIN chapters c ON c.id = m.chapter_id
      WHERE (
        (LOWER(m.first_name) = LOWER(${firstName}) AND LOWER(m.last_name) = LOWER(${lastName}))
        OR
        (LOWER(m.first_name) = LOWER(${lastName}) AND LOWER(m.last_name) = LOWER(${firstName}))
      )
      AND (
        ${chapterNamePart} = ''
        OR LOWER(c.name) ILIKE ${'%' + chapterNamePart.toLowerCase() + '%'}
        OR LOWER(${chapterNamePart}) ILIKE '%' || LOWER(c.name) || '%'
      )
      LIMIT 1
    ` as { id: number }[]

    if (!member) {
      notFound++
      if (notFoundList.length < 20) notFoundList.push(`${firstName} ${lastName} (${groupe})`)
      continue
    }

    const parse = (v: unknown) => {
      const n = parseFloat(String(v ?? 0).replace(',', '.'))
      return isNaN(n) ? 0 : n
    }

    await sql`
      INSERT INTO member_idp (
        member_id, report_date,
        presences, absences, retards, m_col, substituts,
        rdi, rde, rri, rre, invites, tet, mpb, ueg
      ) VALUES (
        ${member.id}, ${reportDateStr},
        ${parse(row['P'])}, ${parse(row['A'])}, ${parse(row['L'])},
        ${parse(row['M'])}, ${parse(row['S'])},
        ${parse(row['RDI'])}, ${parse(row['RDE'])}, ${parse(row['RRI'])}, ${parse(row['RRE'])},
        ${parse(row['Inv.'])}, ${parse(row['TêT'])}, ${parse(row['MPB'])}, ${parse(row['UEG'])}
      )
      ON CONFLICT (member_id, report_date)
      DO UPDATE SET
        presences  = EXCLUDED.presences,
        absences   = EXCLUDED.absences,
        retards    = EXCLUDED.retards,
        m_col      = EXCLUDED.m_col,
        substituts = EXCLUDED.substituts,
        rdi = EXCLUDED.rdi, rde = EXCLUDED.rde,
        rri = EXCLUDED.rri, rre = EXCLUDED.rre,
        invites    = EXCLUDED.invites,
        tet        = EXCLUDED.tet,
        mpb        = EXCLUDED.mpb,
        ueg        = EXCLUDED.ueg
    `
    imported++
  }

  return NextResponse.json({
    ok: true,
    imported,
    notFound,
    notFoundList,
    total: rows.length,
  })
}

// DELETE — remove all IDP data for a report date
export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return unauthorized()
  if (session.role !== 'admin') return forbidden()

  const { report_date } = await req.json()
  if (!report_date) return NextResponse.json({ error: 'report_date requis' }, { status: 400 })

  const result = await sql`
    DELETE FROM member_idp WHERE report_date = ${report_date}
    RETURNING id
  `
  return NextResponse.json({ deleted: result.length })
}
