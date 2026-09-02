import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import {
  generatePreboardingPdf,
  generate3MonthsPdf,
  generate7MonthsPdf,
  generate10MonthsPdf,
} from '@/lib/pdf-generator'

type IdpRow = {
  report_date: string
  presences: number; absences: number
  rdi: number; rde: number; rri: number; rre: number
  invites: number; tet: number; mpb: number
}

function computeIdpDefaults(rows: IdpRow[]): Record<string, unknown> {
  if (rows.length === 0) return {}
  const sum = (key: keyof IdpRow) =>
    rows.reduce((s, r) => s + Number(r[key]), 0)
  const totalP = sum('presences')
  const totalA = sum('absences')
  const sorted = [...rows].sort((a, b) => a.report_date.localeCompare(b.report_date))
  return {
    reco_given:             sum('rdi') + sum('rde'),
    reco_received:          sum('rri') + sum('rre'),
    reco_received_internal: sum('rri'),
    reco_received_external: sum('rre'),
    meetings_count:         totalP + totalA,
    absences_count:         totalA,
    attendance_rate:        totalP + totalA > 0
      ? Math.round(totalP / (totalP + totalA) * 1000) / 10
      : 0,
    visitors_invited:       sum('invites'),
    visitors:               sum('invites'),
    tat_done:               Math.round(sum('tet')),
    ca_given:               Math.round(sum('mpb')),
    period_from:            sorted[0].report_date,
    period_to:              sorted[sorted.length - 1].report_date,
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [interview] = await sql`
    SELECT i.*,
      m.first_name || ' ' || m.last_name AS full_name,
      m.id AS member_id_val,
      m.company, m.activity, m.intro_date,
      c.name AS chapter_name
    FROM interviews i
    JOIN members m ON m.id = i.member_id
    LEFT JOIN chapters c ON c.id = m.chapter_id
    WHERE i.id = ${id}
  ` as Record<string, unknown>[]

  if (!interview) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (interview.status !== 'completed') {
    return NextResponse.json({ error: 'L\'entretien doit être marqué comme réalisé avant de générer le PDF.' }, { status: 403 })
  }

  // Resolve ambassador: direct assignment on interview first, then member's assignment by role
  let ambassador = ''
  if (interview.ambassador_id) {
    const [amb] = await sql`
      SELECT first_name || ' ' || last_name AS name FROM ambassadors WHERE id = ${interview.ambassador_id as number}
    ` as { name: string }[]
    ambassador = amb?.name || ''
  }
  if (!ambassador) {
    const ambRole = (interview.type === 'preboarding' || interview.type === '3months')
      ? 'onboarding' : 'coach_business'
    const [amb] = await sql`
      SELECT a.first_name || ' ' || a.last_name AS name
      FROM ambassador_assignments aa
      JOIN ambassadors a ON a.id = aa.ambassador_id
      WHERE aa.member_id = ${interview.member_id as number}
        AND aa.role = ${ambRole}
      ORDER BY aa.start_date DESC
      LIMIT 1
    ` as { name: string }[]
    ambassador = amb?.name || ''
  }

  const member = {
    full_name:    interview.full_name    as string,
    company:      interview.company      as string,
    activity:     interview.activity     as string,
    intro_date:   interview.intro_date   as string,
    chapter_name: interview.chapter_name as string,
  }
  const interviewDate = (interview.completed_date as string)
    || (interview.scheduled_date as string)
    || new Date().toISOString().slice(0, 10)

  // Fetch IDP for the last 6 months and compute defaults
  const memberId = interview.member_id_val as string || interview.member_id as string
  const idpRows = await sql`
    SELECT report_date, presences, absences,
           rdi, rde, rri, rre, invites, tet, mpb
    FROM member_idp
    WHERE member_id = ${memberId}
      AND report_date >= CURRENT_DATE - INTERVAL '6 months'
    ORDER BY report_date ASC
  ` as IdpRow[]
  const idpDefaults = computeIdpDefaults(idpRows)

  // Merge: IDP defaults as base, saved form data takes precedence
  const savedFormData = interview.form_data ? JSON.parse(interview.form_data as string) : {}
  const formData      = { ...idpDefaults, ...savedFormData }

  // positive_points and concerns are stored in form_data by the forms
  const positivePoints = (formData.positive_points as string)
    || (interview.positive_points as string) || undefined
  const concerns       = (formData.concerns as string)
    || (interview.concerns       as string) || undefined

  let buffer: Buffer
  let filename: string

  switch (interview.type) {
    case 'preboarding':
      buffer = await generatePreboardingPdf(member, ambassador, interviewDate, formData)
      filename = `PreBoarding_${member.full_name.replace(/ /g, '_')}.pdf`
      break
    case '3months':
      buffer = await generate3MonthsPdf(member, ambassador, interviewDate, formData, positivePoints, concerns)
      filename = `Entretien_3Mois_${member.full_name.replace(/ /g, '_')}.pdf`
      break
    case '7months':
      buffer = await generate7MonthsPdf(member, ambassador, interviewDate, formData, positivePoints, concerns)
      filename = `RDV_7Mois_${member.full_name.replace(/ /g, '_')}.pdf`
      break
    case 'free':
      buffer = await generate7MonthsPdf(member, ambassador, interviewDate, formData, positivePoints, concerns)
      filename = `Entretien_Libre_${member.full_name.replace(/ /g, '_')}.pdf`
      break
    case '10months':
      buffer = await generate10MonthsPdf(member, ambassador, interviewDate, formData, positivePoints, concerns)
      filename = `RDV_Renouvellement_${member.full_name.replace(/ /g, '_')}.pdf`
      break
    default:
      return NextResponse.json({ error: 'Unknown interview type' }, { status: 400 })
  }

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
